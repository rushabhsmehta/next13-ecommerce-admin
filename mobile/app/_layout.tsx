import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="packages/[id]"
          options={{
            headerTitle: "Package Details",
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
