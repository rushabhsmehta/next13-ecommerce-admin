import { Tabs } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnread } from "@/hooks/useUnread";
import { useWhatsAppUnread } from "@/hooks/useWhatsAppUnread";

function BadgeIcon({
  color,
  focused,
  kind,
}: {
  color: string;
  focused: boolean;
  kind: "chat" | "whatsapp";
}) {
  const chat = useUnread();
  const whatsApp = useWhatsAppUnread();
  const total = kind === "chat" ? chat.total : whatsApp.total;
  const icon =
    kind === "whatsapp"
      ? "logo-whatsapp"
      : focused
        ? "chatbubbles"
        : "chatbubbles-outline";
  return (
    <View style={[styles.iconContainer, focused ? styles.activeIconWrap : undefined]}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={kind === "whatsapp" && focused ? "#25D366" : color} />
      {total > 0 ? (
        <View style={[styles.badge, kind === "whatsapp" ? styles.whatsappBadge : null]}>
          <Text style={styles.badgeText}>{total > 99 ? "99+" : total}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function StaffTabLayout() {
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAuth();
  const { canUseAdmin, isAdmin } = useCurrentUser();
  if (!isLoaded) return null;

  return (
    <Tabs
      initialRouteName="admin"
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
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Menu",
          href: canUseAdmin ? undefined : null,
          tabBarAccessibilityLabel: "tab-admin",
          tabBarIcon: ({ color, focused }) => (
            <View testID="tab-admin-icon" style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Trips",
          tabBarAccessibilityLabel: "tab-trips",
          tabBarIcon: ({ color, focused }) => <BadgeIcon color={color} focused={focused} kind="chat" />,
        }}
      />
      <Tabs.Screen
        name="whatsapp"
        options={{
          title: "WhatsApp",
          href: isAdmin ? undefined : null,
          tabBarAccessibilityLabel: "tab-whatsapp",
          tabBarIcon: ({ color, focused }) => <BadgeIcon color={color} focused={focused} kind="whatsapp" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
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
  whatsappBadge: {
    backgroundColor: "#25D366",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
});
