import { Tabs } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useUnread } from "@/hooks/useUnread";

function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { total } = useUnread();
  return (
    <View style={styles.iconContainer}>
      <View testID="tab-trips-icon" style={focused ? styles.activeIconWrap : undefined}>
        <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
      </View>
      {total > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{total > 99 ? "99+" : total}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PublicTabLayout() {
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAuth();
  if (!isLoaded) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
          height: 58 + Math.max(insets.bottom, 10),
          elevation: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        headerStyle: { backgroundColor: Colors.background, shadowColor: "transparent", elevation: 0 },
        headerTitleStyle: { fontWeight: "700", color: Colors.text, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarAccessibilityLabel: "tab-home",
          tabBarIcon: ({ color, focused }) => (
            <View testID="tab-home-icon" style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Trips",
          tabBarAccessibilityLabel: "tab-trips",
          tabBarIcon: ({ color, focused }) => <ChatTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarAccessibilityLabel: "tab-profile",
          tabBarIcon: ({ color, focused }) => (
            <View testID="tab-profile-icon" style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 6,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
});
