import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

const commonScreenOptions = {
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
  contentStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
};

export function PublicStack() {
  return (
    <Stack screenOptions={commonScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="packages/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="packages/enquiry" options={{ headerTitle: "Enquire Now", headerBackTitle: "Package" }} />
      <Stack.Screen name="destinations/index" options={{ headerTitle: "Destinations", headerBackTitle: "Back" }} />
      <Stack.Screen name="destinations/[id]" options={{ headerTitle: "Destination" }} />
      <Stack.Screen name="chat/[groupId]" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="chat-settings/[groupId]" options={{ headerTitle: "Group settings", headerBackTitle: "Back" }} />
      <Stack.Screen name="profile/edit" options={{ headerTitle: "Edit Profile", headerBackTitle: "Profile" }} />
      <Stack.Screen name="profile/inquiries" options={{ headerTitle: "My Enquiries", headerBackTitle: "Profile" }} />
      <Stack.Screen name="profile/saved-packages" options={{ headerTitle: "Saved Packages", headerBackTitle: "Profile" }} />
    </Stack>
  );
}

export function StaffStack() {
  return (
    <Stack screenOptions={{ ...commonScreenOptions, headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

export function FinanceStack() {
  return (
    <Stack screenOptions={{ ...commonScreenOptions, headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="admin/finance/index" options={{ headerShown: false }} />
    </Stack>
  );
}
