import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { Colors } from "@/constants/theme";
import {
  configureChatNotifications,
  registerChatPushToken,
  unregisterChatPushToken,
} from "@/lib/chat/push";
import { UnreadProvider, useUnread } from "@/hooks/useUnread";
import { WhatsAppUnreadProvider } from "@/hooks/useWhatsAppUnread";

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

async function checkForOTAUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        "Update Available",
        "A new version of the app is available. Update now for the latest features and fixes.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Update Now",
            onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
          },
        ]
      );
    }
  } catch {
    // Silently ignore — happens in dev mode or if no network
  }
}

function ChatPushController() {
  const { isSignedIn, getToken } = useAuth();
  const { increment } = useUnread();
  const lastRegisteredFor = useRef<boolean | null>(null);

  // Register / unregister whenever sign-in state flips.
  useEffect(() => {
    if (lastRegisteredFor.current === isSignedIn) return;
    lastRegisteredFor.current = isSignedIn ?? false;

    if (isSignedIn) {
      void registerChatPushToken(() => getToken());
    } else {
      void unregisterChatPushToken(() => getToken());
    }
  }, [isSignedIn, getToken]);

  // Configure handler, foreground receiver (bump unread badge), and tap listener (deep-link).
  useEffect(() => {
    configureChatNotifications();

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; groupId?: string }
        | undefined;
      if (data?.type === "chat_message" && data.groupId) {
        try {
          router.push(`/chat/${data.groupId}`);
        } catch {
          // ignore — router may not be ready in edge cases
        }
      }
    });

    const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { type?: string; groupId?: string }
        | undefined;
      if (data?.type === "chat_message" && data.groupId) {
        increment(data.groupId, 1);
      }
    });

    return () => {
      tapSub.remove();
      receiveSub.remove();
    };
  }, [increment]);

  return null;
}

export default function RootLayout() {
  const checked = useRef(false);

  useEffect(() => {
    if (!checked.current && !__DEV__) {
      checked.current = true;
      checkForOTAUpdate();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ClerkLoaded>
          <UnreadProvider>
            <WhatsAppUnreadProvider>
            <ErrorBoundary>
              <ChatPushController />
              <OfflineBanner />
              <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.background },
              headerTintColor: Colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: Colors.background },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen
              name="packages/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="destinations/[id]"
              options={{ headerTitle: "Destination" }}
            />
            <Stack.Screen
              name="chat/[groupId]"
              options={{ headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="chat-settings/[groupId]"
              options={{ headerTitle: "Group settings", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="whatsapp/[phone]"
              options={{ headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="whatsapp/contact/[phone]"
              options={{ headerTitle: "Contact info", headerBackTitle: "Chat" }}
            />
            <Stack.Screen
              name="profile/inquiries"
              options={{ headerTitle: "My Enquiries", headerBackTitle: "Profile" }}
            />
            <Stack.Screen
              name="profile/edit"
              options={{ headerTitle: "Edit Profile", headerBackTitle: "Profile" }}
            />
            <Stack.Screen
              name="packages/enquiry"
              options={{ headerTitle: "Enquire Now", headerBackTitle: "Package" }}
            />
          </Stack>
            </ErrorBoundary>
            </WhatsAppUnreadProvider>
          </UnreadProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
