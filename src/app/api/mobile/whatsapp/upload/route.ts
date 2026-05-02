import { NextResponse } from "next/server";
import { uploadR2Object } from "@/lib/r2-client";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/3gpp": "video",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
};

export async function POST(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new NextResponse("No file provided", { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return new NextResponse("File too large (max 50 MB)", { status: 413 });
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaType = ALLOWED_TYPES[mimeType];
    if (!mediaType) {
      return new NextResponse("Unsupported file type", { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadR2Object({
      buffer,
      fileName: file.name,
      contentType: mimeType,
      prefix: "mobile/whatsapp",
      segments: [mediaType],
      metadata: { source: "mobile-admin-upload", adminId: admin.id },
    });

    return NextResponse.json({
      url: result.url,
      publicId: result.key,
      type: mediaType,
      mimeType,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.log("[MOBILE_WA_UPLOAD]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
