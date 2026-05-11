/**
 * Brochure PDF download + share. Loads expo-sharing lazily so the app still runs
 * when the native module is missing (rebuild: npx expo run:android / run:ios).
 */

import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Linking } from "react-native";

function pdfFallbackAlert(pdfUrl: string, nativeMissing: boolean) {
  Alert.alert(
    nativeMissing ? "PDF sharing needs a native rebuild" : "Could not share PDF",
    nativeMissing
      ? "This build does not include expo-sharing yet. Open the PDF in your browser, copy the link, or rebuild the app (npx expo run:android / run:ios)."
      : "Check your connection and try again, or open the PDF in your browser.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open in browser",
        onPress: () => void Linking.openURL(pdfUrl),
      },
      {
        text: "Copy PDF link",
        onPress: () => void Clipboard.setStringAsync(pdfUrl),
      },
    ]
  );
}

function isNativeSharingMissingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("ExpoSharing") ||
    msg.includes("Cannot find native module") ||
    msg.includes("TurboModuleRegistry")
  );
}

/** @returns true if the system share sheet was shown for the downloaded file */
export async function downloadAndShareBrochurePdf(params: {
  pdfUrl: string;
  cacheFileUri: string;
  dialogTitle: string;
}): Promise<boolean> {
  const { pdfUrl, cacheFileUri, dialogTitle } = params;

  let Sharing: typeof import("expo-sharing");
  try {
    Sharing = await import("expo-sharing");
  } catch {
    pdfFallbackAlert(pdfUrl, true);
    return false;
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      pdfFallbackAlert(pdfUrl, false);
      return false;
    }
    const result = await FileSystem.downloadAsync(pdfUrl, cacheFileUri);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`HTTP ${result.status}`);
    }
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
    return true;
  } catch (e) {
    if (isNativeSharingMissingError(e)) {
      pdfFallbackAlert(pdfUrl, true);
      return false;
    }
    pdfFallbackAlert(pdfUrl, false);
    return false;
  }
}
