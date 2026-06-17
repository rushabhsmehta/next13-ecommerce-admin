/**
 * Migrate Cloudinary image URLs to Cloudflare R2.
 *
 * Scans MySQL (and optional WhatsApp Postgres) for res.cloudinary.com URLs,
 * downloads each unique asset, uploads to R2, and rewrites DB references.
 *
 * Usage:
 *   node tools/migrate-cloudinary-to-r2.mjs              # dry run (report only)
 *   node tools/migrate-cloudinary-to-r2.mjs --apply      # download, upload, update DB
 *   node tools/migrate-cloudinary-to-r2.mjs --apply --limit=50   # batch 50 URLs per run
 *   node tools/migrate-cloudinary-to-r2.mjs --apply --whatsapp  # include WhatsApp DB
 *   node tools/migrate-cloudinary-to-r2.mjs --apply-map-only    # rewrite DB from tools/.cloudinary-r2-map.json only
 *
 * If Cloudinary returns HTTP 401, restore/reactivate the account (or add manual
 * entries to tools/.cloudinary-r2-map.json) before running --apply.
 *
 * Requires R2 env vars (same as r2-client.ts) and DATABASE_URL.
 * Progress map: tools/.cloudinary-r2-map.json (resumable).
 * Failures: tools/cloudinary-migration-failures.json
 */
import { createHash, randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

dotenv.config({ path: join(ROOT, ".env") });
dotenv.config({ path: join(ROOT, ".env.local"), override: true });

const APPLY = process.argv.includes("--apply");
const APPLY_MAP_ONLY = process.argv.includes("--apply-map-only");
const INCLUDE_WHATSAPP = process.argv.includes("--whatsapp");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : null;
const MAP_PATH = join(__dirname, ".cloudinary-r2-map.json");
const FAILURES_PATH = join(__dirname, "cloudinary-migration-failures.json");

const CLOUDINARY_URL_RE = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>\\)]+/gi;
const MIGRATION_PREFIX = process.env.CLOUDFLARE_R2_MIGRATION_PREFIX || "migrated/cloudinary";

const prisma = new PrismaClient();

const JSON_FIELD_CONFIG = [
  {
    model: "location",
    fields: [
      "airlineCancellationPolicy",
      "cancellationPolicy",
      "exclusions",
      "importantNotes",
      "inclusions",
      "kitchenGroupPolicy",
      "paymentPolicy",
      "termsconditions",
      "usefulTip",
    ],
  },
  {
    model: "tourPackage",
    fields: [
      "pricingSection",
      "airlineCancellationPolicy",
      "cancellationPolicy",
      "exclusions",
      "importantNotes",
      "inclusions",
      "kitchenGroupPolicy",
      "paymentPolicy",
      "termsconditions",
      "usefulTip",
      "offerTerms",
    ],
  },
  {
    model: "tourPackageQuery",
    fields: [
      "pricingSection",
      "airlineCancellationPolicy",
      "cancellationPolicy",
      "exclusions",
      "importantNotes",
      "inclusions",
      "kitchenGroupPolicy",
      "paymentPolicy",
      "termsconditions",
      "usefulTip",
      "occupancySelections",
      "selectedVariantIds",
      "variantHotelOverrides",
      "variantRoomAllocations",
      "variantTransportDetails",
      "variantPricingData",
      "customQueryVariants",
    ],
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function loadR2Client() {
  const endpoint = requireEnv("CLOUDFLARE_R2_S3_ENDPOINT").replace(/\/?$/, "");
  const publicBaseUrl = requireEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL").replace(/\/?$/, "");
  const bucket = requireEnv("CLOUDFLARE_R2_BUCKET");
  const region = (process.env.CLOUDFLARE_R2_REGION || "auto").trim();

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });

  return { client, bucket, publicBaseUrl };
}

function loadUrlMap() {
  if (!existsSync(MAP_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(MAP_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveUrlMap(map) {
  writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
}

function saveFailures(failures) {
  writeFileSync(FAILURES_PATH, JSON.stringify(failures, null, 2));
}

function isCloudinaryUrl(value) {
  return typeof value === "string" && value.includes("res.cloudinary.com");
}

function extractCloudinaryUrls(value) {
  if (value == null) return [];
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const matches = text.match(CLOUDINARY_URL_RE) || [];
  return [...new Set(matches.map((url) => url.replace(/[),.;]+$/, "")))];
}

function replaceInString(text, urlMap) {
  if (typeof text !== "string" || !text.includes("cloudinary.com")) {
    return text;
  }
  let next = text;
  for (const [from, to] of Object.entries(urlMap)) {
    next = next.split(from).join(to);
  }
  return next;
}

function replaceInValue(value, urlMap) {
  if (value == null) return value;
  if (typeof value === "string") {
    return replaceInString(value, urlMap);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceInValue(item, urlMap));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = replaceInValue(nested, urlMap);
    }
    return out;
  }
  return value;
}

function parseCloudinaryCredentials() {
  const raw = process.env.CLOUDINARY_URL?.trim();
  if (!raw) return null;
  const match = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return {
    apiKey: match[1],
    apiSecret: match[2],
    cloudName: match[3],
  };
}

function extractCloudinaryPublicId(url) {
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return null;

  const segments = url
    .slice(uploadIdx + "/upload/".length)
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  const remaining = [];
  for (const segment of segments) {
    if (/^v\d+$/.test(segment)) {
      continue;
    }
    const looksLikeTransform =
      segment.includes(",") ||
      /^[a-z]{1,3}_[\w,.-]+$/i.test(segment) ||
      /^[a-z]{1,3}:[\w,.-]+$/i.test(segment);
    if (looksLikeTransform && remaining.length === 0) {
      continue;
    }
    remaining.push(segment);
  }

  if (!remaining.length) return null;
  return remaining.join("/").replace(/\.[^/.]+$/, "");
}

function detectCloudinaryResourceType(url) {
  const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\//i);
  return match?.[1]?.toLowerCase() || "image";
}

async function downloadViaCloudinaryAdmin(oldUrl, credentials) {
  const publicId = extractCloudinaryPublicId(oldUrl);
  if (!publicId) {
    throw new Error("Could not parse Cloudinary public_id");
  }

  const resourceType = detectCloudinaryResourceType(oldUrl);
  const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
  const endpoint = `https://api.cloudinary.com/v1_1/${credentials.cloudName}/${resourceType}/download`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({ public_id: publicId }),
  });

  if (!response.ok) {
    throw new Error(`Admin API HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error("Admin API returned empty body");
  }

  return { buffer, contentType, via: "cloudinary-admin" };
}

function extensionFromUrl(url, contentType) {
  const pathMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (pathMatch) {
    const ext = pathMatch[1].toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "pdf"].includes(ext)) {
      return ext === "jpeg" ? "jpg" : ext;
    }
  }
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("pdf")) return "pdf";
  return "jpg";
}

function buildObjectKey(oldUrl, extension) {
  const hash = createHash("sha256").update(oldUrl).digest("hex").slice(0, 16);
  const stamp = Date.now();
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  return `${MIGRATION_PREFIX}/${hash}/asset-${stamp}-${suffix}.${extension}`;
}

async function downloadAsset(oldUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const credentials = parseCloudinaryCredentials();

  try {
    try {
      const response = await fetch(oldUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "AagamHolidays-CloudinaryMigration/1.0",
          Accept: "image/*,application/pdf,*/*",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) {
        throw new Error("Empty response body");
      }

      return { buffer, contentType, via: "public-url" };
    } catch (publicError) {
      if (!credentials) {
        throw publicError;
      }
      return downloadViaCloudinaryAdmin(oldUrl, credentials);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadToR2(r2, oldUrl, buffer, contentType) {
  const extension = extensionFromUrl(oldUrl, contentType);
  const key = buildObjectKey(oldUrl, extension);

  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: {
        source: "cloudinary-migration",
        "original-url": oldUrl.slice(0, 1024),
      },
    })
  );

  return `${r2.publicBaseUrl}/${key}`;
}

async function migrateUrl(oldUrl, urlMap, r2, failures) {
  if (urlMap[oldUrl]) {
    return urlMap[oldUrl];
  }

  if (!APPLY) {
    return null;
  }

  try {
    const { buffer, contentType, via } = await downloadAsset(oldUrl);
    const newUrl = await uploadToR2(r2, oldUrl, buffer, contentType);
    urlMap[oldUrl] = newUrl;
    saveUrlMap(urlMap);
    console.log(`  ✓ [${via}] ${oldUrl.slice(0, 64)}... -> ${newUrl}`);
    return newUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ url: oldUrl, error: message, at: new Date().toISOString() });
    console.error(`  ✗ ${oldUrl.slice(0, 72)}... (${message})`);
    return null;
  }
}

async function collectDirectStringRefs() {
  const refs = [];

  const images = await prisma.images.findMany({
    where: { url: { contains: "cloudinary.com" } },
    select: { id: true, url: true },
  });
  for (const row of images) {
    refs.push({ model: "images", id: row.id, field: "url", value: row.url });
  }

  const locations = await prisma.location.findMany({
    where: { imageUrl: { contains: "cloudinary.com" } },
    select: { id: true, imageUrl: true },
  });
  for (const row of locations) {
    refs.push({ model: "location", id: row.id, field: "imageUrl", value: row.imageUrl });
  }

  const destinations = await prisma.tourDestination.findMany({
    where: { imageUrl: { contains: "cloudinary.com" } },
    select: { id: true, imageUrl: true },
  });
  for (const row of destinations) {
    if (row.imageUrl) {
      refs.push({ model: "tourDestination", id: row.id, field: "imageUrl", value: row.imageUrl });
    }
  }

  const organizations = await prisma.organization.findMany({
    where: { logoUrl: { contains: "cloudinary.com" } },
    select: { id: true, logoUrl: true },
  });
  for (const row of organizations) {
    if (row.logoUrl) {
      refs.push({ model: "organization", id: row.id, field: "logoUrl", value: row.logoUrl });
    }
  }

  const snapshots = await prisma.queryVariantHotelSnapshot.findMany({
    where: { imageUrl: { contains: "cloudinary.com" } },
    select: { id: true, imageUrl: true },
  });
  for (const row of snapshots) {
    if (row.imageUrl) {
      refs.push({
        model: "queryVariantHotelSnapshot",
        id: row.id,
        field: "imageUrl",
        value: row.imageUrl,
      });
    }
  }

  const chatGroups = await prisma.chatGroup.findMany({
    where: { imageUrl: { contains: "cloudinary.com" } },
    select: { id: true, imageUrl: true },
  });
  for (const row of chatGroups) {
    if (row.imageUrl) {
      refs.push({ model: "chatGroup", id: row.id, field: "imageUrl", value: row.imageUrl });
    }
  }

  const travelUsers = await prisma.travelAppUser.findMany({
    where: { avatarUrl: { contains: "cloudinary.com" } },
    select: { id: true, avatarUrl: true },
  });
  for (const row of travelUsers) {
    if (row.avatarUrl) {
      refs.push({ model: "travelAppUser", id: row.id, field: "avatarUrl", value: row.avatarUrl });
    }
  }

  const chatMessages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { fileUrl: { contains: "cloudinary.com" } },
        { content: { contains: "cloudinary.com" } },
      ],
    },
    select: { id: true, fileUrl: true, content: true },
  });
  for (const row of chatMessages) {
    if (row.fileUrl && isCloudinaryUrl(row.fileUrl)) {
      refs.push({ model: "chatMessage", id: row.id, field: "fileUrl", value: row.fileUrl });
    }
    if (row.content && row.content.includes("cloudinary.com")) {
      refs.push({ model: "chatMessage", id: row.id, field: "content", value: row.content, isRich: true });
    }
  }

  const offerPackages = await prisma.tourPackage.findMany({
    where: { offerSubtitle: { contains: "cloudinary.com" } },
    select: { id: true, offerSubtitle: true },
  });
  for (const row of offerPackages) {
    if (row.offerSubtitle) {
      refs.push({
        model: "tourPackage",
        id: row.id,
        field: "offerSubtitle",
        value: row.offerSubtitle,
        isRich: true,
      });
    }
  }

  return refs;
}

async function collectJsonRefs() {
  const refs = [];

  for (const config of JSON_FIELD_CONFIG) {
    const delegate = prisma[config.model];
    const rows = await delegate.findMany({
      select: { id: true, ...Object.fromEntries(config.fields.map((f) => [f, true])) },
    });

    for (const row of rows) {
      for (const field of config.fields) {
        const value = row[field];
        if (value == null) continue;
        const urls = extractCloudinaryUrls(value);
        if (urls.length) {
          refs.push({
            model: config.model,
            id: row.id,
            field,
            value,
            isJson: true,
          });
        }
      }
    }
  }

  return refs;
}

async function collectWhatsappRefs() {
  if (!INCLUDE_WHATSAPP) {
    return [];
  }

  if (!process.env.WHATSAPP_DATABASE_URL) {
    console.warn("WHATSAPP_DATABASE_URL not set; skipping WhatsApp DB.");
    return [];
  }

  const { PrismaClient: WhatsAppPrisma } = await import("@prisma/whatsapp-client");
  const whatsappPrisma = new WhatsAppPrisma();

  try {
    const assets = await whatsappPrisma.whatsAppMediaAsset.findMany({
      where: { secureUrl: { contains: "cloudinary.com" } },
      select: { id: true, secureUrl: true },
    });

    return assets.map((row) => ({
      model: "whatsAppMediaAsset",
      id: row.id,
      field: "secureUrl",
      value: row.secureUrl,
      whatsapp: true,
    }));
  } finally {
    await whatsappPrisma.$disconnect();
  }
}

async function applyDirectUpdate(ref, urlMap) {
  const nextValue = ref.isRich
    ? replaceInString(ref.value, urlMap)
    : urlMap[ref.value] || replaceInString(ref.value, urlMap);

  if (nextValue === ref.value) {
    return false;
  }

  if (ref.whatsapp) {
    const { PrismaClient: WhatsAppPrisma } = await import("@prisma/whatsapp-client");
    const whatsappPrisma = new WhatsAppPrisma();
    try {
      await whatsappPrisma.whatsAppMediaAsset.update({
        where: { id: ref.id },
        data: { secureUrl: nextValue },
      });
    } finally {
      await whatsappPrisma.$disconnect();
    }
    return true;
  }

  if (ref.isJson) {
    const nextJson = replaceInValue(ref.value, urlMap);
    await prisma[ref.model].update({
      where: { id: ref.id },
      data: { [ref.field]: nextJson },
    });
    return true;
  }

  await prisma[ref.model].update({
    where: { id: ref.id },
    data: { [ref.field]: nextValue },
  });
  return true;
}

async function main() {
  const effectiveApply = APPLY || APPLY_MAP_ONLY;
  console.log(`Mode: ${APPLY_MAP_ONLY ? "APPLY MAP ONLY" : APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`WhatsApp DB: ${INCLUDE_WHATSAPP ? "yes" : "no"}`);

  const r2 = APPLY && !APPLY_MAP_ONLY ? loadR2Client() : null;
  const urlMap = loadUrlMap();
  const failures = [];

  const directRefs = await collectDirectStringRefs();
  const jsonRefs = await collectJsonRefs();
  const whatsappRefs = await collectWhatsappRefs();
  const allRefs = [...directRefs, ...jsonRefs, ...whatsappRefs];

  const uniqueUrls = new Set();
  for (const ref of allRefs) {
    if (ref.isJson || ref.isRich) {
      for (const url of extractCloudinaryUrls(ref.value)) {
        uniqueUrls.add(url);
      }
    } else if (isCloudinaryUrl(ref.value)) {
      uniqueUrls.add(ref.value);
    }
  }

  console.log(`\nRecords with Cloudinary references: ${allRefs.length}`);
  console.log(`Unique Cloudinary URLs: ${uniqueUrls.size}`);
  console.log(`Already mapped in ${MAP_PATH}: ${Object.keys(urlMap).length}`);
  if (LIMIT && Number.isFinite(LIMIT) && LIMIT > 0) {
    console.log(`Limit: processing up to ${LIMIT} unmapped URLs this run`);
  }

  if (!uniqueUrls.size) {
    console.log("\nNothing to migrate.");
    return;
  }

  if (!APPLY_MAP_ONLY) {
    console.log("\nMigrating assets...");
    let attempted = 0;
    for (const oldUrl of uniqueUrls) {
      if (urlMap[oldUrl]) {
        continue;
      }
      if (LIMIT && Number.isFinite(LIMIT) && attempted >= LIMIT) {
        console.log(`\nReached --limit=${LIMIT}; re-run to continue.`);
        break;
      }
      await migrateUrl(oldUrl, urlMap, r2, failures);
      attempted += 1;
    }

    const migratedCount = Object.keys(urlMap).length;
    const failedCount = failures.length;
    console.log(`\nMapped URLs: ${migratedCount}, failures this run: ${failedCount}`);

    if (failures.length) {
      saveFailures(failures);
      console.log(`Failures written to ${FAILURES_PATH}`);
    }
  } else {
    console.log(`\nSkipping downloads; using ${Object.keys(urlMap).length} entries from map file.`);
  }

  if (!effectiveApply) {
    console.log("\nRe-run with --apply to download, upload to R2, and update the database.");
    return;
  }

  const pendingRefs = allRefs.filter((ref) => {
    const urls = ref.isJson || ref.isRich
      ? extractCloudinaryUrls(ref.value)
      : [ref.value];
    return urls.some((url) => !urlMap[url]);
  });

  if (pendingRefs.length) {
    console.warn(
      `\n${pendingRefs.length} records still reference Cloudinary URLs that could not be migrated.`
    );
    console.warn("Fix or re-upload those assets manually, then re-run the script.");
  }

  console.log("\nUpdating database references...");
  let updated = 0;
  for (const ref of allRefs) {
    const urls = ref.isJson || ref.isRich
      ? extractCloudinaryUrls(ref.value)
      : isCloudinaryUrl(ref.value) ? [ref.value] : [];

    if (!urls.length) continue;
    if (urls.some((url) => !urlMap[url])) continue;

    const changed = await applyDirectUpdate(ref, urlMap);
    if (changed) updated += 1;
  }

  console.log(`\nUpdated ${updated} records.`);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
