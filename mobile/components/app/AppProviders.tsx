import { type ReactNode, useEffect, useRef } from "react";
import { Alert, InteractionManager } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { NetworkProvider } from "@/lib/network";
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
import { CurrentUserProvider, useCurrentUser } from "@/hooks/useCurrentUser";
import { APP_VARIANT, type MobileAppVariant } from "@/lib/app-variant";
import { getVariantDevMismatch } from "@/lib/variant-dev";
import { VariantDevMismatchScreen } from "@/components/app/VariantDevMismatchScreen";

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
    // Dev builds and offline launches can fail this check.
  }
}

function PushController({ variant }: { variant: MobileAppVariant }) {
  const { isSignedIn, getToken } = useAuth();
  const { isAdmin, travelUser } = useCurrentUser();
  const { increment } = useUnread();
  const { increment: incrementWhatsApp } = useWhatsAppUnread();
  const lastChatRegisteredFor = useRef<boolean | null>(null);
  const lastAdminRegisteredFor = useRef<boolean | null>(null);

  const chatPushActive = variant !== "finance" && !!(isSignedIn || travelUser?.id);
  const adminPushActive = variant === "staff" && !!(isSignedIn && isAdmin);

  useEffect(() => {
    if (lastChatRegisteredFor.current === chatPushActive) return;
    lastChatRegisteredFor.current = chatPushActive;

    const task = InteractionManager.runAfterInteractions(() => {
      if (chatPushActive) {
        void registerChatPushToken(() => getToken());
      } else {
        void unregisterChatPushToken(() => getToken());
      }
    });

    return () => task.cancel();
  }, [chatPushActive, getToken]);

  useEffect(() => {
    if (lastAdminRegisteredFor.current === adminPushActive) return;
    lastAdminRegisteredFor.current = adminPushActive;

    const task = InteractionManager.runAfterInteractions(() => {
      if (adminPushActive) {
        void registerAdminPushToken(() => getToken());
      } else {
        void unregisterAdminPushToken(() => getToken());
      }
    });

    return () => task.cancel();
  }, [adminPushActive, getToken]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      if (variant !== "finance") configureChatNotifications();
      if (variant === "staff") configureWhatsAppNotificationChannel();

      const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | { type?: string; groupId?: string; phone?: string }
          | undefined;
        if (variant !== "finance" && data?.type === "chat_message" && data.groupId) {
          try {
            router.push(`/chat/${data.groupId}`);
          } catch {}
          return;
        }
        if (variant === "staff" && data?.type === "whatsapp_message" && data.phone) {
          try {
            router.push(`/whatsapp/${encodeURIComponent(data.phone)}`);
          } catch {}
        }
      });

      const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as
          | { type?: string; groupId?: string; phone?: string }
          | undefined;
        if (variant !== "finance" && data?.type === "chat_message" && data.groupId) {
          increment(data.groupId, 1);
          return;
        }
        if (variant === "staff" && data?.type === "whatsapp_message") {
          incrementWhatsApp(1);
        }
      });

      cleanup = () => {
        tapSub.remove();
        receiveSub.remove();
      };
    });

    return () => {
      task.cancel();
      cleanup?.();
    };
  }, [increment, incrementWhatsApp, variant]);

  return null;
}

export function AppProviders({
  children,
  variant = APP_VARIANT,
}: {
  children: ReactNode;
  variant?: MobileAppVariant;
}) {
  const checked = useRef(false);
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const devMismatch = getVariantDevMismatch();

  useEffect(() => {
    if (!checked.current && !__DEV__) {
      checked.current = true;
      const timeout = setTimeout(checkForOTAUpdate, 3500);
      return () => clearTimeout(timeout);
    }
  }, []);

  if (devMismatch) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <VariantDevMismatchScreen mismatch={devMismatch} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ClerkLoaded>
          <NetworkProvider>
            <CurrentUserProvider>
              <UnreadProvider>
                <WhatsAppUnreadProvider>
                  <ErrorBoundary>
                    <PushController variant={variant} />
                    <OfflineBanner />
                    <StatusBar style="dark" />
                    {children}
                  </ErrorBoundary>
                </WhatsAppUnreadProvider>
              </UnreadProvider>
            </CurrentUserProvider>
          </NetworkProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
