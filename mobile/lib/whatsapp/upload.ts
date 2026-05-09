import { API_BASE_URL } from "@/constants/api";

export type WhatsAppUploadKind = "image" | "video" | "audio" | "document";

export interface WhatsAppUploadResult {
  url: string;
  publicId: string;
  type: WhatsAppUploadKind;
  mimeType: string;
  filename: string;
  size: number;
}

interface UploadOpts {
  uri: string;
  fileName?: string;
  contentType?: string;
  kind: WhatsAppUploadKind;
  getToken: () => Promise<string | null>;
}

function inferContentType(uri: string, kind: WhatsAppUploadKind): string {
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "3gp":
    case "3gpp":
      return "video/3gpp";
    case "pdf":
      return "application/pdf";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "aac":
      return "audio/aac";
    default:
      if (kind === "image") return "image/jpeg";
      if (kind === "video") return "video/mp4";
      if (kind === "audio") return "audio/mpeg";
      return "application/octet-stream";
  }
}

/**
 * Upload a local file to the mobile WhatsApp upload endpoint, which proxies
 * to R2. Returns a public URL ready to feed into /api/mobile/whatsapp/send.
 */
export async function uploadWhatsAppMedia(opts: UploadOpts): Promise<WhatsAppUploadResult> {
  const token = await opts.getToken();
  if (!token) throw new Error("Not signed in");

  const fileName = opts.fileName ?? opts.uri.split("/").pop() ?? "upload";
  const contentType = opts.contentType ?? inferContentType(opts.uri, opts.kind);

  const formData = new FormData();
  // React Native's FormData supports the { uri, name, type } shape.
  formData.append("file", {
    uri: opts.uri,
    name: fileName,
    type: contentType,
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }

  return (await res.json()) as WhatsAppUploadResult;
}
