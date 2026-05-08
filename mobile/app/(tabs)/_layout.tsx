import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UnreadCounts {
  [groupId: string]: number;
}

interface UnreadContextValue {
  counts: UnreadCounts;
  total: number;
  increment: (groupId: string, delta?: number) => void;
  clear: (groupId: string) => void;
  set: (groupId: string, count: number) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<UnreadCounts>({});

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const increment = useCallback((groupId: string, delta = 1) => {
    setCounts((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? 0) + delta,
    }));
  }, []);

  const clear = useCallback((groupId: string) => {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  const set = useCallback((groupId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [groupId]: count }));
  }, []);

  return (
    <UnreadContext.Provider value={{ counts, total, increment, clear, set }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used within UnreadProvider");
  return ctx;
}

function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { total } = useUnread();
  return (
    <View style={styles.iconContainer}>
      {focused ? (
        <View style={styles.activeIconWrap}>
          <Ionicons name="chatbubbles" size={22} color={color} />
        </View>
      ) : (
        <Ionicons name="chatbubbles-outline" size={22} color={color} />
      )}
      {total > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{total > 99 ? "99+" : total}</Text>
        </View>
      )}
    </View>
  );
}

function TabLayoutInner() {
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAuth();
  const { isAdmin } = useCurrentUser();

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
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.1,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarIconStyle: {
          marginBottom: 0,
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
          tabBarAccessibilityLabel: "tab-home",
          tabBarIcon: ({ color, focused }) => (
            <View testID="tab-home-icon" style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
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
        name="whatsapp"
        options={{
          title: "WhatsApp",
          href: isAdmin ? undefined : null,
          tabBarAccessibilityLabel: "tab-whatsapp",
          tabBarIcon: ({ color, focused }) => (
            <View testID="tab-whatsapp-icon" style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name="logo-whatsapp"
                size={22}
                color={focused ? "#25D366" : color}
              />
            </View>
          ),
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

export default function TabLayout() {
  return (
    <UnreadProvider>
      <TabLayoutInner />
    </UnreadProvider>
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