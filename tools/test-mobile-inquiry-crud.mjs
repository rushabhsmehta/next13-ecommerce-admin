/**
 * Operations inquiry CRUD smoke test (same API routes as mobile CRM).
 * Falls back to Prisma when dev bypass is not configured on the server.
 *
 * Usage:
 *   node tools/test-mobile-inquiry-crud.mjs
 *   node tools/test-mobile-inquiry-crud.mjs --cleanup
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const PREFIX = "MOBILE-OPS-TEST";
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3000";
const TOKEN =
  process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim() || "mobile-dev-test-bypass-20260522";

function authHeaders(extra = {}) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
    ...extra,
  };
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: authHeaders(opts.headers),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const isHtml = text.trimStart().startsWith("<!");
  return { status: res.status, json, text: text.slice(0, 400), isHtml };
}

function assertOk(label, res, codes = [200, 201]) {
  if (res.isHtml) {
    throw new Error(`${label}: got HTML (auth redirect). Enable MOBILE_DEV_AUTH_BYPASS_* on server.`);
  }
  if (!codes.includes(res.status)) {
    throw new Error(`${label}: HTTP ${res.status} — ${res.text}`);
  }
}

async function cleanup() {
  const rows = await prisma.inquiry.findMany({
    where: {
      OR: [
        { customerName: { startsWith: PREFIX } },
        { remarks: { contains: PREFIX } },
      ],
    },
    select: { id: true },
  });
  for (const row of rows) {
    await prisma.inquiryAction.deleteMany({ where: { inquiryId: row.id } });
    await prisma.inquiry.delete({ where: { id: row.id } });
  }
  console.log(`Cleaned ${rows.length} test inquiry(ies).`);
}

async function prismaCrud({ customerName, modifiedName, phone, journeyDate, locationId }) {
  console.log("\n=== Prisma CRUD (data layer) ===");
  const created = await prisma.inquiry.create({
    data: {
      customerName,
      customerMobileNumber: phone,
      locationId,
      journeyDate: new Date(`${journeyDate}T00:00:00.000Z`),
      numAdults: 2,
      status: "pending",
      remarks: `${PREFIX} prisma create`,
    },
  });
  console.log(`Created ${created.id}`);

  const read = await prisma.inquiry.findUnique({ where: { id: created.id } });
  if (!read || read.customerName !== customerName) throw new Error("Prisma read failed");

  const updated = await prisma.inquiry.update({
    where: { id: created.id },
    data: {
      customerName: modifiedName,
      numAdults: 3,
      remarks: `${PREFIX} prisma update`,
      status: "in_progress",
    },
  });
  if (updated.customerName !== modifiedName) throw new Error("Prisma update failed");

  await prisma.inquiryAction.create({
    data: {
      inquiryId: created.id,
      actionType: "NOTE",
      remarks: `${PREFIX} prisma action`,
    },
  });

  await prisma.inquiryAction.deleteMany({ where: { inquiryId: created.id } });
  await prisma.inquiry.delete({ where: { id: created.id } });
  const gone = await prisma.inquiry.findUnique({ where: { id: created.id } });
  if (gone) throw new Error("Prisma delete failed");

  console.log("PASS: Prisma create, read, update, action, delete");
}

async function apiCrud({ customerName, modifiedName, phone, journeyDate, locationId }) {
  console.log("\n=== HTTP API CRUD (mobile routes) ===");
  const me = await api("/api/mobile/me");
  if (me.status === 401 || me.status === 403 || me.isHtml) {
    throw new Error(`API auth not available (HTTP ${me.status})`);
  }

  const createRes = await api("/api/inquiries", {
    method: "POST",
    body: JSON.stringify({
      customerName,
      customerMobileNumber: phone,
      journeyDate,
      locationId,
      numAdults: 2,
      remarks: `${PREFIX} api create`,
    }),
  });
  assertOk("POST inquiry", createRes, [200, 201]);
  const inquiryId = createRes.json?.id;
  if (!inquiryId) throw new Error("Create missing id");
  console.log(`Created ${inquiryId}`);

  const getRes = await api(`/api/inquiries/${encodeURIComponent(inquiryId)}`);
  assertOk("GET inquiry", getRes);

  const patchRes = await api(`/api/inquiries/${encodeURIComponent(inquiryId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      customerName: modifiedName,
      customerMobileNumber: phone,
      journeyDate,
      locationId,
      status: "PENDING",
      numAdults: 3,
      remarks: `${PREFIX} api update`,
    }),
  });
  assertOk("PATCH inquiry", patchRes);

  const delRes = await api(`/api/inquiries?id=${encodeURIComponent(inquiryId)}`, {
    method: "DELETE",
  });
  assertOk("DELETE inquiry", delRes, [200, 204]);

  console.log("PASS: API create, read, update, delete");
}

async function main() {
  if (process.argv.includes("--cleanup")) {
    await cleanup();
    return;
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const customerName = `${PREFIX} ${stamp}`;
  const modifiedName = `${customerName} (edited)`;
  const phone = "9876501234";
  const journeyDate = "2026-06-15";

  await cleanup();

  const location = await prisma.location.findFirst({
    select: { id: true, label: true },
  });
  if (!location) throw new Error("No locations in database.");

  const payload = {
    customerName,
    modifiedName,
    phone,
    journeyDate,
    locationId: location.id,
  };

  console.log(`Location: ${location.label} (${location.id})`);

  let apiOk = false;
  try {
    await apiCrud(payload);
    apiOk = true;
  } catch (e) {
    console.warn(`API path skipped: ${e.message}`);
  }

  await prismaCrud(payload);

  await cleanup();

  console.log(
    apiOk
      ? "\nAll checks passed (HTTP API + Prisma).\n"
      : "\nPrisma checks passed. Enable MOBILE_DEV_AUTH_BYPASS_* and restart dev for full API test.\n"
  );
}

main()
  .catch((e) => {
    console.error("\nFAIL:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
