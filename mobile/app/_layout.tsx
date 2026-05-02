import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import * as Notifications from "expo-notifications";
import { ClerkProvider } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { tokenCache } from "@/lib/clerk-token-cache";
import { registerAdminPushToken, addNotificationResponseListener } from "@/lib/notifications";

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

function AppWithAuth() {
  const router = useRouter();
  const { userType } = useAuth();
  const checked = useRef(false);

  useEffect(() => {
    if (!checked.current && !__DEV__) {
      checked.current = true;
      checkForOTAUpdate();
    }
  }, []);

  // Register admin push token when admin logs in (no arg — fetches JWT internally)
  useEffect(() => {
    if (userType === "admin") {
      registerAdminPushToken();
    }
  }, [userType]);

  // Handle notification taps — navigate to WhatsApp chat if applicable
  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      if (data?.screen === "whatsapp" && data?.phone) {
        router.push(`/whatsapp/${encodeURIComponent(data.phone)}` as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
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
      <Stack.Screen
        name="packages/[id]"
        options={{
          headerTitle: "",
          headerTransparent: true,
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="destinations/[id]"
        options={{ headerTitle: "Destination" }}
      />
      <Stack.Screen
        name="chat/[groupId]"
        options={{ headerTitle: "Chat" }}
      />
      <Stack.Screen
        name="whatsapp/[phone]"
        options={{ headerTitle: "WhatsApp Chat", headerShown: false }}
      />
      <Stack.Screen
        name="auth/associate-login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="auth/admin-login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="auth/sso-callback"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="inquiries/new"
        options={{ headerTitle: "New Inquiry", headerShown: true }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <AuthProvider>
        <StatusBar style="light" />
        <AppWithAuth />
      </AuthProvider>
    </ClerkProvider>
  );
}
