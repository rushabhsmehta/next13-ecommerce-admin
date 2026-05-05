import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import * as SecureStore from "expo-secure-store";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { Colors } from "@/constants/theme";

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
          <ErrorBoundary>
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
              options={{ headerBackTitle: "Back" }}
            />
            <Stack.Screen
              name="whatsapp/[phone]"
              options={{ headerBackTitle: "Back" }}
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
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
