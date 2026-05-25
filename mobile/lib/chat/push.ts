import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { API_BASE_URL } from "@/constants/api";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";
import { mobileAppVariantHeaders } from "@/lib/app-variant";
const CHAT_CHANNEL_ID = "chat-messages";

let configuredHandler = false;

export function configureChatNotifications(): void {
  if (configuredHandler) return;
  configuredHandler = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Older fields kept for backwards compatibility with SDKs <= 52
      shouldShowAlert: true,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
      name: "Chat messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
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
      projectId ? { projectId } : undefined
    );
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

export async function registerChatPushToken(getToken: () => Promise<string | null>): Promise<string | null> {
  try {
    configureChatNotifications();
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) return null;

    const jwt = await resolveMobileAuthToken(getToken);
    if (!jwt) return null;

    await fetch(`${API_BASE_URL}/api/mobile/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...mobileAppVariantHeaders(),
      },
      body: JSON.stringify({
        expoPushToken,
        platform: Platform.OS,
      }),
    });
    return expoPushToken;
  } catch (err) {
    console.warn("registerChatPushToken failed", err);
    return null;
  }
}

export async function unregisterChatPushToken(
  getToken: () => Promise<string | null>,
  expoPushToken?: string
): Promise<void> {
  try {
    const jwt = await resolveMobileAuthToken(getToken);
    if (!jwt) return;
    await fetch(`${API_BASE_URL}/api/mobile/push/register`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...mobileAppVariantHeaders(),
      },
      body: JSON.stringify(expoPushToken ? { expoPushToken } : {}),
    });
  } catch {
    // best effort
  }
}
