import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

/**
 * Nested navigator for every /admin/* route.
 *
 * Admin screens render their own AdminTopBar, so the native stack header is
 * hidden by default here. This replaces ~25 hand-registered <Stack.Screen>
 * entries in the root layout and removes the double-header risk that came
 * from per-screen headerShown toggling.
 */
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
