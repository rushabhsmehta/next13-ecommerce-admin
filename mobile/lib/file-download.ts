/**
 * Authenticated file download helper for arbitrary mime types (CSV, JSON, etc).
 *
 * Mirrors pdf-download.ts but is generic — caller supplies the file extension
 * and mime type. Used by WhatsApp customer export (CSV) and any future text-
 * artifact downloads from mobile.
 */
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL } from "@/constants/api";
import { ApiError } from "@/lib/api";
import { refreshNetworkSnapshot } from "@/lib/network";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

export interface DownloadFileParams {
  endpoint: string;
  fileName: string;
  extension: string;
  mimeType: string;
  getToken: () => Promise<string | null>;
  dialogTitle?: string;
}

export interface DownloadFileResult {
  fileUri: string;
  bytes: number;
  shared: boolean;
}

export async function downloadAndShareFile(
  params: DownloadFileParams
): Promise<DownloadFileResult> {
  const { endpoint, fileName, extension, mimeType, getToken, dialogTitle } = params;

  const net = await refreshNetworkSnapshot();
  if (!net.isOnline) {
    throw new ApiError(
      "You appear to be offline. Reconnect to download.",
      null,
      false,
      "OFFLINE"
    );
  }

  const token = await resolveMobileAuthToken(getToken);
  if (!token) {
    throw new ApiError("Not authenticated", 401, false, "UNAUTHENTICATED");
  }

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new ApiError(
      "Filesystem unavailable on this device.",
      null,
      false,
      "NO_FILESYSTEM"
    );
  }

  const safeName =
    fileName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "download";
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const fileUri = `${cacheDir}${safeName}${ext}`;
  const url = `${API_BASE_URL}${endpoint}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status >= 400) {
    try {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch {}
    throw new ApiError(
      `Download failed (HTTP ${result.status}).`,
      result.status,
      result.status >= 500,
      result.status === 403 ? "FORBIDDEN" : "DOWNLOAD_FAILED"
    );
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  const bytes =
    (info.exists && "size" in info ? (info as { size: number }).size : 0) ?? 0;

  let shared = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: any = require("expo-sharing");
    const Sharing =
      mod && typeof mod.isAvailableAsync === "function" ? mod : mod?.default;
    if (Sharing && typeof Sharing.isAvailableAsync === "function") {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType,
          dialogTitle: dialogTitle ?? "Share file",
        });
        shared = true;
      }
    }
  } catch {
    /* sharing optional */
  }

  return { fileUri: result.uri, bytes, shared };
}
