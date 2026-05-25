// We use the legacy FileSystem API (downloadAsync, cacheDirectory) to match
// the rest of the codebase (share-brochure-pdf.ts, chat/upload.ts). The new
// v2 API in expo-file-system root does not expose cacheDirectory.
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL } from "@/constants/api";
import { ApiError } from "@/lib/api";
import { refreshNetworkSnapshot } from "@/lib/network";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";
import { mobileAppVariantHeaders } from "@/lib/app-variant";

export type ExportKind = "inquiries-contacts" | "queries-contacts";

const KIND_TO_PATH: Record<ExportKind, string> = {
  "inquiries-contacts": "/api/export/inquiries-contacts",
  "queries-contacts": "/api/export/queries-contacts",
};

const KIND_TO_FILENAME_PREFIX: Record<ExportKind, string> = {
  "inquiries-contacts": "inquiries-contacts",
  "queries-contacts": "tour-queries-contacts",
};

/**
 * Download a CRM CSV export from the admin API and surface the system share
 * sheet so the user can save / send the file from their device.
 *
 * Why not use the shared api.ts client? The export endpoints respond with raw
 * CSV (`text/csv`), not JSON, so we go direct with `fetch` and stream to a
 * file via expo-file-system. We still honor Phase F online-only enforcement
 * by checking the shared network snapshot first.
 */
export async function downloadAndShareExport(
  kind: ExportKind,
  getToken: () => Promise<string | null>
): Promise<{ fileUri: string; bytes: number }> {
  // Phase F: online_only modules hard-block when offline.
  const net = await refreshNetworkSnapshot();
  if (!net.isOnline) {
    throw new ApiError(
      "You appear to be offline. Reconnect to continue.",
      null,
      false,
      "OFFLINE"
    );
  }

  const token = await resolveMobileAuthToken(getToken);
  if (!token) {
    throw new ApiError("Not authenticated", 401, false, "UNAUTHENTICATED");
  }

  const path = KIND_TO_PATH[kind];
  const url = `${API_BASE_URL}${path}`;

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `${KIND_TO_FILENAME_PREFIX[kind]}-${stamp}.csv`;
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new ApiError(
      "Filesystem unavailable on this device.",
      null,
      false,
      "NO_FILESYSTEM"
    );
  }
  const fileUri = `${cacheDir}${fileName}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...mobileAppVariantHeaders(),
    },
  });

  if (result.status >= 400) {
    // expo-file-system has already written the response body to disk even on
    // 4xx/5xx; remove it so we don't surface a corrupt file via share.
    try {
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    } catch {}
    throw new ApiError(
      `Export failed (HTTP ${result.status}).`,
      result.status,
      result.status >= 500,
      result.status === 403 ? "FORBIDDEN" : "EXPORT_FAILED"
    );
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  const bytes = (info.exists && "size" in info ? (info as { size: number }).size : 0) ?? 0;

  await maybeOpenShareSheet(result.uri);

  return { fileUri: result.uri, bytes };
}

/**
 * Open the system share sheet for a freshly downloaded CSV.
 * Native expo-sharing module may be missing in test environments or in
 * Expo Go builds, so we fail silently and let the caller still complete.
 *
 * Extracted from `downloadAndShareExport` to make it testable independently
 * (jest's babel transform changes how `await import(...)` behaves vs require).
 */
export async function maybeOpenShareSheet(fileUri: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: any = require("expo-sharing");
    const Sharing =
      mod && typeof mod.isAvailableAsync === "function" ? mod : mod?.default;
    if (!Sharing || typeof Sharing.isAvailableAsync !== "function") return false;
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: "Save or share export",
      UTI: "public.comma-separated-values-text",
    });
    return true;
  } catch {
    return false;
  }
}
