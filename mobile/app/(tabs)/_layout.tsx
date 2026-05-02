import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { whatsappApi } from "@/lib/whatsapp-api";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, userType, token } = useAuth();
  const isAssociate = userType === "associate";
  const isAdmin = userType === "admin";
  const isTourist = isLoggedIn && !isAssociate && !isAdmin;

  const [waUnread, setWaUnread] = useState(0);

  // Poll total unread WhatsApp count every 30s for admin badge
  useEffect(() => {
    if (!isAdmin || !token) return;

    const fetchUnread = async () => {
      try {
        const conversations = await whatsappApi.getConversations();
        const total = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
        setWaUnread(total);
      } catch {
        // silent
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, token]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 8,
          elevation: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: Colors.background,
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: Colors.text,
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen name="explore" options={{ href: null }} />

      <Tabs.Screen name="destinations" options={{ href: null }} />

      <Tabs.Screen
        name="chat"
        options={{
          href: isTourist ? undefined : null,
          title: "Chat",
          headerTitle: "Trip Chat",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="whatsapp"
        options={{
          href: isAdmin ? undefined : null,
          title: "WhatsApp",
          headerTitle: "WhatsApp",
          tabBarBadge: waUnread > 0 ? waUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: "#25D366", color: "#fff" },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "logo-whatsapp" : "logo-whatsapp"}
                size={22}
                color={focused ? "#25D366" : color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="inquiries"
        options={{
          href: isAssociate ? undefined : null,
          title: "Inquiries",
          headerTitle: "My Inquiries",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: isLoggedIn ? "Profile" : "Account",
          headerTitle: isLoggedIn ? "My Profile" : "Account",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={color}
              />
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
});
