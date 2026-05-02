import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { pushApi, adminApi } from "./api";
import { getToken } from "./auth";

// Skip push notification setup in Expo Go (unsupported since SDK 53)
const isExpoGo = Constants.appOwnership === "expo";

// Configure notification handling
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null; // Web push handled by service worker
  }

  // Push notifications are not supported in Expo Go (SDK 53+)
  if (isExpoGo) {
    console.log("Push notifications are not supported in Expo Go. Use a development build.");
    return null;
  }

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const pushToken = tokenData.data;

  // Register with our backend
  const authToken = await getToken();
  if (authToken) {
    try {
      await pushApi.subscribe(
        {
          endpoint: pushToken,
          keys: { p256dh: pushToken, auth: "expo" },
        },
        authToken
      );
    } catch (error) {
      console.error("Failed to register push token:", error);
    }
  }

  // Android notification channels
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#059669",
    });

    await Notifications.setNotificationChannelAsync("chat", {
      name: "Trip Chat",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#059669",
    });

    await Notifications.setNotificationChannelAsync("whatsapp", {
      name: "WhatsApp Messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#25D366",
      sound: "default",
    });
  }

  return pushToken;
}

export async function registerAdminPushToken(adminAuthToken: string): Promise<void> {
  if (Platform.OS === "web" || isExpoGo || !Device.isDevice) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenData.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("whatsapp", {
        name: "WhatsApp Messages",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#25D366",
        sound: "default",
      });
    }

    await adminApi.registerPushToken(expoPushToken, adminAuthToken);
  } catch (error) {
    console.error("[Admin Push] Failed to register push token:", error);
  }
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
