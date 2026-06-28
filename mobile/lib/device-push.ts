import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/constants/api";
import { APP_VARIANT, isPublicApp, mobileAppVariantHeaders } from "@/lib/app-variant";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

const MARKETING_CHANNEL_ID = "marketing";

let marketingChannelConfigured = false;

export function configureMarketingNotifications(): void {
  if (marketingChannelConfigured || !isPublicApp()) return;
  marketingChannelConfigured = true;

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(MARKETING_CHANNEL_ID, {
      name: "Offers & updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#e8612d",
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
    (Constants as { easConfig?: { projectId?: string } })?.easConfig?.projectId ??
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

/**
 * Register install-level token for marketing broadcasts (no sign-in required).
 * Public app only. Re-links to travel user when a session is available.
 */
export async function registerDevicePushToken(
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  if (!isPublicApp()) return null;

  try {
    configureMarketingNotifications();
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) {
      console.warn("registerDevicePushToken: no Expo push token (permission or FCM)");
      return null;
    }

    const jwt = await resolveMobileAuthToken(getToken);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...mobileAppVariantHeaders(),
    };
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    await fetch(`${API_BASE_URL}/api/mobile/push/register-device`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        expoPushToken,
        platform: Platform.OS,
        appVariant: APP_VARIANT,
      }),
    });

    return expoPushToken;
  } catch (err) {
    console.warn("registerDevicePushToken failed", err);
    return null;
  }
}

export async function unregisterDevicePushToken(
  expoPushToken?: string,
): Promise<void> {
  if (!isPublicApp()) return;
  try {
    await fetch(`${API_BASE_URL}/api/mobile/push/register-device`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...mobileAppVariantHeaders() },
      body: JSON.stringify(expoPushToken ? { expoPushToken } : {}),
    });
  } catch {
    // best effort
  }
}
