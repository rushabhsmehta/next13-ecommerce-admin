import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/constants/api";

// Bump the channel id so Android will pick up the updated channel config.
const WA_CHANNEL_ID = "whatsapp-v2";

let configured = false;

export function configureWhatsAppNotificationChannel(): void {
  if (configured) return;
  configured = true;

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(WA_CHANNEL_ID, {
      name: "WhatsApp messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#25D366",
    }).catch(() => {});
  }
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

export async function registerAdminPushToken(
  getToken: () => Promise<string | null>,
  userName?: string,
): Promise<string | null> {
  try {
    configureWhatsAppNotificationChannel();
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) return null;

    const jwt = await getToken();
    if (!jwt) return null;

    const res = await fetch(
      `${API_BASE_URL}/api/mobile/push/register-admin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          expoPushToken,
          ...(userName ? { userName } : {}),
        }),
      },
    );
    if (!res.ok) return null;
    return expoPushToken;
  } catch (err) {
    console.warn("registerAdminPushToken failed", err);
    return null;
  }
}

export async function unregisterAdminPushToken(
  getToken: () => Promise<string | null>,
): Promise<void> {
  try {
    const jwt = await getToken();
    if (!jwt) return;
    await fetch(`${API_BASE_URL}/api/mobile/push/register-admin`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch {
    /* best effort */
  }
}
