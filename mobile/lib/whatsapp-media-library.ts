import { API_BASE_URL } from "@/constants/api";
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface WhatsAppMediaAsset {
  id: string;
  publicId: string;
  filename: string;
  secureUrl: string;
  size: number;
  contentType: string;
  format?: string;
  resourceType: string;
  folder?: string;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface WhatsAppMediaLibraryResponse {
  files: WhatsAppMediaAsset[];
}

interface UploadInput {
  fileUri: string;
  fileName: string;
  mimeType: string;
  getToken: () => Promise<string | null>;
}

export function createWhatsAppMediaLibraryClient(authRequest: AuthenticatedRequest) {
  return {
    list(): Promise<WhatsAppMediaLibraryResponse> {
      return authRequest<WhatsAppMediaLibraryResponse>(
        "/api/mobile/whatsapp/media",
        { retries: 1 }
      );
    },

    /**
     * Uploads a local file as multipart/form-data via the bearer token. The
     * mobile authRequest helper doesn't natively support multipart, so we use
     * fetch directly here mirroring lib/whatsapp/upload.ts.
     */
    async upload(input: UploadInput): Promise<{ file: WhatsAppMediaAsset }> {
      const token = await input.getToken();
      if (!token) throw new Error("Not signed in");

      const form = new FormData();
      form.append("file", {
        uri: input.fileUri,
        name: input.fileName,
        type: input.mimeType,
      } as unknown as Blob);

      const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (HTTP ${res.status}): ${txt.slice(0, 200)}`);
      }
      return (await res.json()) as { file: WhatsAppMediaAsset };
    },

    delete(id: string) {
      return authRequest<{ success: boolean }>(
        `/api/mobile/whatsapp/media/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };
}

export type WhatsAppMediaLibraryClient = ReturnType<
  typeof createWhatsAppMediaLibraryClient
>;
