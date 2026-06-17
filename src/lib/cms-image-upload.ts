export const CMS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const CMS_IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type CmsImageUploadResult = {
  url: string;
  key: string;
};

/** Upload a dashboard/CMS image to R2 via the server API. */
export async function uploadCmsImage(file: File): Promise<CmsImageUploadResult> {
  if (file.size > CMS_IMAGE_MAX_BYTES) {
    throw new Error("File too large (max 10 MB)");
  }

  const mimeType = file.type || "image/jpeg";
  if (!CMS_IMAGE_ALLOWED_TYPES.has(mimeType)) {
    throw new Error("Unsupported file type. Use JPEG, PNG, WEBP, or GIF.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/uploads/cms-images", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again and retry.");
  }

  if (response.status === 403) {
    throw new Error("You do not have permission to upload images.");
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Upload failed");
  }

  if (!payload?.url) {
    throw new Error("Upload succeeded but no URL was returned.");
  }

  return { url: payload.url, key: payload.key };
}

/** Whether next/image should skip optimization for this URL. */
export function shouldUseUnoptimizedImage(url: string): boolean {
  return !url.includes("cloudinary.com");
}
