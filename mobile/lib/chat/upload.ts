import * as FileSystem from "expo-file-system";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export type UploadKind = "image" | "pdf" | "file";

export interface UploadResult {
  fileUrl: string;
  fileName: string | null;
  fileSize: number;
  contentType: string;
  key: string;
}

interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
  contentType: string;
  fileName: string | null;
  fileSize: number;
}

function inferContentTypeFromUri(uri: string, fallback: string): string {
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "heic": return "image/heic";
    case "pdf": return "application/pdf";
    default: return fallback;
  }
}

async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof (info as { size?: number }).size === "number") {
      return (info as { size: number }).size;
    }
  } catch {
    // fall through
  }
  return 0;
}

/**
 * Two-step chat upload:
 *   1) Ask the server for a presigned R2 PUT URL.
 *   2) PUT the file body directly to R2.
 *
 * Mobile fetches don't expose progress events natively, so we treat the upload
 * as opaque. Callers can show a spinner around this promise.
 */
export async function uploadChatAttachment(opts: {
  groupId: string;
  uri: string;
  kind: UploadKind;
  fileName?: string;
  contentType?: string;
  getToken: () => Promise<string | null>;
}): Promise<UploadResult> {
  const fallbackContentType =
    opts.kind === "image" ? "image/jpeg" :
    opts.kind === "pdf" ? "application/pdf" :
    "application/octet-stream";
  const contentType = opts.contentType ?? inferContentTypeFromUri(opts.uri, fallbackContentType);
  const fileName = opts.fileName ?? opts.uri.split("/").pop() ?? "upload";
  const size = await getFileSize(opts.uri);

  const jwt = await opts.getToken();
  if (!jwt) throw new Error("Not signed in");

  const presignRes = await fetch(`${API_BASE_URL}/api/chat/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      groupId: opts.groupId,
      kind: opts.kind,
      contentType,
      fileName,
      size: size > 0 ? size : 1,
    }),
  });
  if (!presignRes.ok) {
    const txt = await presignRes.text().catch(() => "");
    throw new Error(`Presign failed: HTTP ${presignRes.status} ${txt.slice(0, 200)}`);
  }
  const presigned = (await presignRes.json()) as PresignResponse;

  // Read the local file into a Blob (RN's fetch supports this) and PUT to R2.
  const fileResp = await fetch(opts.uri);
  const blob = await fileResp.blob();

  const putRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`Upload failed: HTTP ${putRes.status} ${txt.slice(0, 200)}`);
  }

  return {
    fileUrl: presigned.fileUrl,
    fileName: presigned.fileName ?? fileName,
    fileSize: size,
    contentType,
    key: presigned.key,
  };
}
