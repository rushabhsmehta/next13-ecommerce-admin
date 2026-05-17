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
import { NetworkProvider } from "@/lib/network";
import { Colors } from "@/constants/theme";
import {
  configureChatNotifications,
  registerChatPushToken,
  unregisterChatPushToken,
} from "@/lib/chat/push";
import {
  configureWhatsAppNotificationChannel,
  registerAdminPushToken,
  unregisterAdminPushToken,
} from "@/lib/whatsapp/push";
import { UnreadProvider, useUnread } from "@/hooks/useUnread";
import { WhatsAppUnreadProvider, useWhatsAppUnread } from "@/hooks/useWhatsAppUnread";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

function PushController() {
  const { isSignedIn, getToken } = useAuth();
  const { isAdmin, travelUser } = useCurrentUser();
  const { increment } = useUnread();
  const { increment: incrementWhatsApp } = useWhatsAppUnread();
  const lastChatRegisteredFor = useRef<boolean | null>(null);
  const lastAdminRegisteredFor = useRef<boolean | null>(null);

  // Chat push: Clerk session or dev-bypass travel user (see resolveMobileAuthToken).
  const chatPushActive = !!(isSignedIn || travelUser?.id);
  useEffect(() => {
    if (lastChatRegisteredFor.current === chatPushActive) return;
    lastChatRegisteredFor.current = chatPushActive;

    if (chatPushActive) {
      void registerChatPushToken(() => getToken());
    } else {
      void unregisterChatPushToken(() => getToken());
    }
  }, [chatPushActive, getToken]);

  // WhatsApp admin push: only admins.
  useEffect(() => {
    const shouldRegister = !!(isSignedIn && isAdmin);
    if (lastAdminRegisteredFor.current === shouldRegister) return;
    lastAdminRegisteredFor.current = shouldRegister;

    if (shouldRegister) {
      void registerAdminPushToken(() => getToken());
    } else {
      void unregisterAdminPushToken(() => getToken());
    }
  }, [isSignedIn, isAdmin, getToken]);

  // Configure handlers, foreground receivers (bump unread badges), tap listeners (deep-link).
  useEffect(() => {
    configureChatNotifications();
    configureWhatsAppNotificationChannel();

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; groupId?: string; phone?: string }
        | undefined;
      if (data?.type === "chat_message" && data.groupId) {
        try {
          router.push(`/chat/${data.groupId}`);
        } catch {}
        return;
      }
      if (data?.type === "whatsapp_message" && data.phone) {
        try {
          router.push(`/whatsapp/${encodeURIComponent(data.phone)}`);
        } catch {}
      }
    });

    const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as
        | { type?: string; groupId?: string; phone?: string }
        | undefined;
      if (data?.type === "chat_message" && data.groupId) {
        increment(data.groupId, 1);
        return;
      }
      if (data?.type === "whatsapp_message") {
        incrementWhatsApp(1);
      }
    });

    return () => {
      tapSub.remove();
      receiveSub.remove();
    };
  }, [increment, incrementWhatsApp]);

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
          <NetworkProvider>
          <UnreadProvider>
            <WhatsAppUnreadProvider>
            <ErrorBoundary>
              <PushController />
              <OfflineBanner />
              <StatusBar style="dark" />
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
              name="destinations/index"
              options={{ headerTitle: "Destinations", headerBackTitle: "Back" }}
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
              name="whatsapp/templates/index"
              options={{ headerTitle: "Templates", headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="whatsapp/templates/[name]"
              options={{ headerTitle: "Compose template", headerBackTitle: "Templates" }}
            />
            <Stack.Screen
              name="whatsapp/customers/index"
              options={{ headerTitle: "Customers", headerBackTitle: "WhatsApp" }}
            />
            <Stack.Screen
              name="whatsapp/customers/[id]"
              options={{ headerTitle: "Customer", headerBackTitle: "Customers" }}
            />
            <Stack.Screen
              name="whatsapp/campaigns/index"
              options={{ headerTitle: "Campaigns", headerBackTitle: "WhatsApp" }}
            />
            <Stack.Screen
              name="whatsapp/campaigns/[id]"
              options={{ headerTitle: "Campaign", headerBackTitle: "Campaigns" }}
            />
            <Stack.Screen
              name="whatsapp/catalog/index"
              options={{ headerTitle: "Catalog", headerBackTitle: "WhatsApp" }}
            />
            <Stack.Screen
              name="whatsapp/flows/index"
              options={{ headerTitle: "Flows", headerBackTitle: "WhatsApp" }}
            />
            <Stack.Screen
              name="admin/crm/inquiries/new"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/crm/inquiries/[inquiryId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/crm/inquiries/index"
              options={{ headerTitle: "CRM Inquiries", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/customers/index"
              options={{ headerTitle: "Customers", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/customers/[id]"
              options={{ headerTitle: "Customer", headerBackTitle: "Customers" }}
            />
            <Stack.Screen
              name="admin/tour-queries/index"
              options={{ headerTitle: "Tour Queries", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/tour-queries/[id]"
              options={{ headerTitle: "Tour Query", headerBackTitle: "Queries" }}
            />
            <Stack.Screen
              name="admin/operations/index"
              options={{ headerTitle: "Operations", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/flight-tickets/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/flight-tickets/new"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/flight-tickets/[pnr]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/ops-portal/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/ops-portal/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/website/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/ai-wizards/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/travel-app/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/settings/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/finance/index"
              options={{ headerTitle: "Finance", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/reports/index"
              options={{ headerTitle: "Reports", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/reports/[kind]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/coming-soon"
              options={{ headerTitle: "Coming soon", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="admin/todos/index"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/todos/new"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/todos/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="admin/exports/index"
              options={{ headerTitle: "Exports", headerBackTitle: "Admin" }}
            />
            <Stack.Screen
              name="profile/inquiries"
              options={{ headerTitle: "My Enquiries", headerBackTitle: "Profile" }}
            />
            <Stack.Screen
              name="profile/saved-packages"
              options={{ headerTitle: "Saved Packages", headerBackTitle: "Profile" }}
            />
            <Stack.Screen
              name="associate/inquiries/index"
              options={{ headerTitle: "Associate Inquiries", headerBackTitle: "Profile" }}
            />
            <Stack.Screen
              name="associate/inquiries/new"
              options={{ headerTitle: "Create Inquiry", headerBackTitle: "Inquiries" }}
            />
            <Stack.Screen
              name="associate/inquiries/[inquiryId]"
              options={{ headerTitle: "Inquiry Detail", headerBackTitle: "Inquiries" }}
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
          </NetworkProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
