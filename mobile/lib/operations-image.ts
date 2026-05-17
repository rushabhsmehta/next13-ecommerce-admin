import { API_BASE_URL } from "@/constants/api";
import { ApiError } from "@/lib/api";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

export interface OperationsImageUploadResult {
  url: string;
  imageUrl: string;
  key: string;
}

/**
 * Upload a hero image for locations/destinations via R2.
 * Uses multipart FormData (not JSON authRequest).
 */
export async function uploadOperationsImage(
  uri: string,
  getToken: () => Promise<string | null>,
  fileName?: string,
  mimeType?: string
): Promise<OperationsImageUploadResult> {
  const token = await resolveMobileAuthToken(getToken);
  if (!token) {
    throw new ApiError("Not authenticated", 401, false, "UNAUTHENTICATED");
  }

  const name = fileName ?? uri.split("/").pop() ?? "image.jpg";
  const type = mimeType ?? "image/jpeg";

  const form = new FormData();
  form.append("file", {
    uri,
    name,
    type,
  } as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/api/mobile/operations/upload-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `Upload failed with status ${res.status}`,
      res.status,
      res.status >= 500
    );
  }

  return res.json();
}
