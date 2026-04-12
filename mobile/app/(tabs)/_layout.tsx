import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Shadows } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, userType } = useAuth();
  const isAssociate = userType === "associate";
  // Tourists: explicitly set as tourist, or logged in without a type (legacy tourist token)
  const isTourist = isLoggedIn && !isAssociate;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 8) + 4,
          left: 16,
          right: 16,
          backgroundColor: "rgba(255,255,255,0.97)",
          borderTopWidth: 0,
          borderRadius: 24,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          ...Shadows.heavy,
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
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          headerTitle: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "compass" : "compass-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Always hidden — destinations merged into Explore */}
      <Tabs.Screen
        name="destinations"
        options={{ href: null }}
      />
      {/* Trip Chat — tourists only */}
      <Tabs.Screen
        name="chat"
        options={{
          href: isTourist ? undefined : null,
          title: "Chat",
          headerTitle: "Trip Chat",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Inquiries — associates only */}
      <Tabs.Screen
        name="inquiries"
        options={{
          href: isAssociate ? undefined : null,
          title: "Inquiries",
          headerTitle: "My Inquiries",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons name={focused ? "document-text" : "document-text-outline"} size={22} color={color} />
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
});
