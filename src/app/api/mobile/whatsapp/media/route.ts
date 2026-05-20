import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { uploadR2Object } from "@/lib/r2-client";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MEDIA_LIBRARY_PREFIX =
  process.env.CLOUDFLARE_R2_MEDIA_LIBRARY_PREFIX || "whatsapp/media-library";
const MEDIA_LIBRARY_LIMIT = Number(process.env.MEDIA_LIBRARY_MAX_RESULTS || 48);
const MAX_UPLOAD_SIZE_MB = Number(
  process.env.MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    100
);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};
const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

function inferResourceType(mime: string): "image" | "document" | "binary" {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "document";
  return "binary";
}

function mapRow(row: any) {
  return {
    id: row.id,
    publicId: row.publicId,
    filename: row.filename,
    secureUrl: row.secureUrl,
    size: row.size,
    contentType: row.contentType,
    format: row.format ?? undefined,
    resourceType: row.resourceType,
    folder: row.folder ?? undefined,
    uploadedAt: row.uploadedAt.toISOString(),
    uploadedBy: row.uploadedBy,
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.read");
    if (!guard.ok) return guard.response;

    const assets = await whatsappPrisma.whatsAppMediaAsset.findMany({
      orderBy: { uploadedAt: "desc" },
      take: MEDIA_LIBRARY_LIMIT,
    });
    return NextResponse.json({ files: assets.map(mapRow) });
  } catch (error: any) {
    console.log("[MOBILE_WA_MEDIA_LIST]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load the media library" },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "communications.write");
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum is ${MAX_UPLOAD_SIZE_MB}MB.` },
        { status: 413 }
      );
    }

    const name = (file.name || "").toLowerCase();
    const dot = name.lastIndexOf(".");
    const extension = dot >= 0 ? name.slice(dot) : "";
    const mimeFromExt = MIME_BY_EXTENSION[extension];
    const mimeType =
      (file.type && ALLOWED_MIME_TYPES.has(file.type) ? file.type : null) ||
      mimeFromExt ||
      "";
    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PNG, JPEG, WEBP, GIF, AVIF, or PDF." },
        { status: 415 }
      );
    }

    const resourceType = inferResourceType(mimeType);
    const segment =
      resourceType === "image" ? "images" : resourceType === "document" ? "documents" : "files";
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadR2Object({
      buffer,
      fileName: file.name || `media-${Date.now()}`,
      contentType: mimeType,
      prefix: MEDIA_LIBRARY_PREFIX,
      segments: [segment],
      metadata: {
        source: "mobile-whatsapp-media-library",
        "resource-type": resourceType,
        ...(extension ? { extension: extension.replace(".", "") } : {}),
      },
    });

    const folder =
      uploadResult.key.lastIndexOf("/") > 0
        ? uploadResult.key.slice(0, uploadResult.key.lastIndexOf("/"))
        : null;

    const asset = await whatsappPrisma.whatsAppMediaAsset.upsert({
      where: { publicId: uploadResult.key },
      create: {
        publicId: uploadResult.key,
        filename: file.name || "media",
        secureUrl: uploadResult.url,
        size: file.size,
        contentType: mimeType,
        format: extension ? extension.replace(".", "") : null,
        width: null,
        height: null,
        resourceType,
        folder,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
      update: {
        filename: file.name || "media",
        secureUrl: uploadResult.url,
        size: file.size,
        contentType: mimeType,
        format: extension ? extension.replace(".", "") : null,
        resourceType,
        folder,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "WhatsAppMediaAsset",
      entityId: asset.id,
      action: "CREATE",
      metadata: { bytes: asset.size, contentType: asset.contentType },
    });

    return NextResponse.json({ file: mapRow(asset) }, { status: 201 });
  } catch (error: any) {
    console.log("[MOBILE_WA_MEDIA_UPLOAD]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload media" },
      { status: 500 }
    );
  }
}
