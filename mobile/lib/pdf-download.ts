/**
 * Cross-cutting authenticated PDF download + share helper.
 *
 * Used by Sales & Trips (and later Finance / Flight Tickets / Reports) to
 * fetch a server-rendered PDF from a mobile-bearer endpoint, write it to the
 * device cache, and open the system share sheet. Mirrors the offline + native-
 * module fallbacks in share-brochure-pdf.ts but adds Bearer auth (tour-query
 * PDFs are not public).
 */
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL } from "@/constants/api";
import { ApiError } from "@/lib/api";
import { refreshNetworkSnapshot } from "@/lib/network";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

export interface DownloadPdfParams {
  /** Endpoint path relative to API_BASE_URL, e.g. /api/mobile/tour-queries/x/pdf */
  endpoint: string;
  /** File name (without extension) to save as. */
  fileName: string;
  getToken: () => Promise<string | null>;
  /** Optional dialog title for the OS share sheet. */
  dialogTitle?: string;
}

export interface DownloadPdfResult {
  fileUri: string;
  bytes: number;
  shared: boolean;
}

export async function downloadAndSharePdf(
  params: DownloadPdfParams
): Promise<DownloadPdfResult> {
  const { endpoint, fileName, getToken, dialogTitle } = params;

  // PDF endpoints are server-rendered and online-only by nature.
  const net = await refreshNetworkSnapshot();
  if (!net.isOnline) {
    throw new ApiError(
      "You appear to be offline. Reconnect to download the PDF.",
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
    fileName.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "document";
  const fileUri = `${cacheDir}${safeName}.pdf`;
  const url = `${API_BASE_URL}${endpoint}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status >= 400) {
    try {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch {}
    throw new ApiError(
      `PDF download failed (HTTP ${result.status}).`,
      result.status,
      result.status >= 500,
      result.status === 403 ? "FORBIDDEN" : "PDF_FAILED"
    );
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  const bytes =
    (info.exists && "size" in info ? (info as { size: number }).size : 0) ?? 0;

  const shared = await maybeShare(result.uri, dialogTitle ?? "Share PDF");
  return { fileUri: result.uri, bytes, shared };
}

/**
 * Open the system share sheet for a downloaded PDF. expo-sharing may be
 * absent in Expo Go / test environments, so we fail soft and let the caller
 * still report success of the download itself.
 */
export async function maybeShare(
  fileUri: string,
  dialogTitle: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: any = require("expo-sharing");
    const Sharing =
      mod && typeof mod.isAvailableAsync === "function" ? mod : mod?.default;
    if (!Sharing || typeof Sharing.isAvailableAsync !== "function") return false;
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
    return true;
  } catch {
    return false;
  }
}
