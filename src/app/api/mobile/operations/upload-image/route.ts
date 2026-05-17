import { NextResponse } from "next/server";
import { uploadR2Object } from "@/lib/r2-client";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireOperationsWrite } from "@/app/api/mobile/lib/assert-operations-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Upload a location/destination hero image to R2. operations.write required. */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new NextResponse("No file provided", { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return new NextResponse("File too large (max 10 MB)", { status: 413 });
    }

    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPEG, PNG, WEBP, or GIF." },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadR2Object({
      buffer,
      fileName: file.name,
      contentType: mimeType,
      prefix: "mobile/operations",
      segments: ["images"],
      metadata: { source: "mobile-operations-upload", userId },
    });

    return NextResponse.json({
      url: result.url,
      imageUrl: result.url,
      key: result.key,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_UPLOAD_IMAGE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
