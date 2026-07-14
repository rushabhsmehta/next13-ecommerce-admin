import { NextResponse } from "next/server";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";
import { uploadTemplateMediaAsset, type TemplateMediaKind } from "@/lib/r2-client";
import { uploadWhatsAppTemplateMediaBuffer } from "@/lib/whatsapp-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const configuredMaxMediaMb = Number(
  process.env.WHATSAPP_TEMPLATE_MEDIA_MAX_FILE_SIZE_MB ||
    process.env.MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    25,
);
const MAX_MEDIA_SIZE_MB =
  Number.isFinite(configuredMaxMediaMb) && configuredMaxMediaMb > 0 ? configuredMaxMediaMb : 25;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

function resolveTemplateMediaType(file: File): { mediaType: TemplateMediaKind; contentType: string } | null {
  const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
  const name = typeof file.name === "string" ? file.name.toLowerCase() : "";

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return { mediaType: "document", contentType: "application/pdf" };
  }

  if (
    type === "image/jpeg" ||
    type === "image/png" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  ) {
    return {
      mediaType: "image",
      contentType: type === "image/png" || name.endsWith(".png") ? "image/png" : "image/jpeg",
    };
  }

  if (type === "video/mp4" || name.endsWith(".mp4")) {
    return { mediaType: "video", contentType: "video/mp4" };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return new NextResponse("No template media file received", { status: 400 });
    }

    if (fileEntry.size === 0) {
      return new NextResponse("Empty file uploads are not allowed", { status: 400 });
    }

    if (fileEntry.size > MAX_MEDIA_SIZE_BYTES) {
      return new NextResponse(`File is too large. Maximum size is ${MAX_MEDIA_SIZE_MB} MB.`, {
        status: 413,
      });
    }

    const resolvedMedia = resolveTemplateMediaType(fileEntry);
    if (!resolvedMedia) {
      return new NextResponse("Only JPG, PNG, MP4, and PDF files are supported for template headers.", {
        status: 415,
      });
    }

    const templateNameRaw = formData.get("templateName");
    const templateName = typeof templateNameRaw === "string" ? templateNameRaw.trim() : null;
    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    const upload = await uploadTemplateMediaAsset({
      buffer,
      fileName: fileEntry.name,
      templateName,
      contentType: resolvedMedia.contentType,
      mediaType: resolvedMedia.mediaType,
      uploadedBy: admin.userId,
      prefix: "mobile/whatsapp/templates",
    });

    const metaUpload = await uploadWhatsAppTemplateMediaBuffer({
      buffer,
      fileName: fileEntry.name,
      mimeType: resolvedMedia.contentType,
      mediaType: resolvedMedia.mediaType,
    });

    if (!metaUpload.mediaId) {
      return new NextResponse("WhatsApp did not return a media handle for the uploaded file", {
        status: 502,
      });
    }

    return NextResponse.json({
      success: true,
      media: {
        url: upload.url,
        key: upload.key,
        bucket: upload.bucket,
        size: fileEntry.size,
        fileName: fileEntry.name,
        contentType: resolvedMedia.contentType,
        mediaType: resolvedMedia.mediaType,
        uploadedAt: new Date().toISOString(),
        metaHandle: metaUpload.mediaId,
      },
    });
  } catch (error: any) {
    console.log("[MOBILE_WA_TEMPLATE_UPLOAD]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to upload template media",
      },
      { status: 502 },
    );
  }
}
