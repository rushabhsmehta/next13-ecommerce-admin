import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleApi, jsonError } from "@/lib/api-response";
import { isCurrentUserAssociate } from "@/lib/associate-utils";
import { uploadR2Object } from "@/lib/r2-client";
import { CMS_IMAGE_ALLOWED_TYPES, CMS_IMAGE_MAX_BYTES } from "@/lib/cms-image-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CMS_IMAGE_PREFIX = process.env.CLOUDFLARE_R2_CMS_PREFIX || "cms/images";

/** Upload a dashboard/CMS image to Cloudflare R2. */
export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (await isCurrentUserAssociate()) {
      return jsonError("Associates cannot upload media", 403, "FORBIDDEN");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file provided", 400, "VALIDATION");
    }

    if (file.size > CMS_IMAGE_MAX_BYTES) {
      return jsonError("File too large (max 10 MB)", 413, "FILE_TOO_LARGE");
    }

    const mimeType = file.type || "image/jpeg";
    if (!CMS_IMAGE_ALLOWED_TYPES.has(mimeType)) {
      return jsonError(
        "Unsupported file type. Use JPEG, PNG, WEBP, or GIF.",
        415,
        "UNSUPPORTED_TYPE"
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const result = await uploadR2Object({
        buffer,
        fileName: file.name,
        contentType: mimeType,
        prefix: CMS_IMAGE_PREFIX,
        segments: ["images"],
        metadata: {
          source: "dashboard-cms-upload",
          "uploaded-by": userId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          url: result.url,
          key: result.key,
        },
        { status: 201 }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "R2 upload failed";
      console.error("[CMS_IMAGE_UPLOAD] Cloudflare R2 upload failed", error, {
        file: file.name,
      });
      return jsonError(message, 502, "R2_UPLOAD");
    }
  });
}
