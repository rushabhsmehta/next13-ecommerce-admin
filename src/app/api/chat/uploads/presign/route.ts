import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { createR2PresignedPutUrl } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

const ALLOWED_PDF_TYPES = new Set(["application/pdf"]);

const ALLOWED_FILE_TYPES = new Set<string>([
  ...Array.from(ALLOWED_IMAGE_TYPES),
  ...Array.from(ALLOWED_PDF_TYPES),
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

type Kind = "image" | "pdf" | "file";

function isAllowedContentType(kind: Kind, contentType: string): boolean {
  switch (kind) {
    case "image": return ALLOWED_IMAGE_TYPES.has(contentType);
    case "pdf": return ALLOWED_PDF_TYPES.has(contentType);
    case "file": return ALLOWED_FILE_TYPES.has(contentType);
  }
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });
    if (!travelUser) return jsonError("User not found", 404);
    if (!travelUser.isApproved) {
      return jsonError("Your account is pending approval", 403);
    }

    const body = await req.json().catch(() => ({}));
    const groupId = typeof body.groupId === "string" ? body.groupId : null;
    const kind = body.kind as Kind | undefined;
    const contentType = typeof body.contentType === "string" ? body.contentType : null;
    const fileName = typeof body.fileName === "string" ? body.fileName : undefined;
    const size = typeof body.size === "number" ? body.size : null;

    if (!groupId) return jsonError("groupId is required", 400);
    if (!kind || !["image", "pdf", "file"].includes(kind)) {
      return jsonError("kind must be image, pdf, or file", 400);
    }
    if (!contentType) return jsonError("contentType is required", 400);
    if (!isAllowedContentType(kind, contentType)) {
      return jsonError(`contentType "${contentType}" is not allowed for kind "${kind}"`, 400);
    }
    if (size == null || size <= 0) return jsonError("size is required", 400);
    if (size > MAX_BYTES) {
      return jsonError(
        `File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
        413
      );
    }

    // Verify membership
    const membership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });
    if (!membership || !membership.isActive) {
      return jsonError("Not a member of this group", 403);
    }

    const presigned = await createR2PresignedPutUrl({
      contentType,
      fileName,
      prefix: "chat",
      segments: [groupId, kind],
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        "chat-group-id": groupId,
        "uploader-user-id": travelUser.id,
        kind,
      },
    });

    return NextResponse.json({
      uploadUrl: presigned.uploadUrl,
      fileUrl: presigned.publicUrl,
      key: presigned.key,
      expiresIn: presigned.expiresIn,
      contentType,
      fileName: fileName ?? null,
      fileSize: size,
    });
  });
}
