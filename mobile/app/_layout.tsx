import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { Colors } from "@/constants/theme";

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
    <>
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
      </Stack>
    </>
  );
}
