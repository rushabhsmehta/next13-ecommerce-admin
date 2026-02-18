import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { getUser, clearAuth } from "@/lib/auth";
import {
  registerForPushNotifications,
} from "@/lib/notifications";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await getUser();
    setUser(userData);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearAuth();
          setUser(null);
        },
      },
    ]);
  };

  const togglePushNotifications = async (value: boolean) => {
    if (value) {
      const token = await registerForPushNotifications();
      if (token) {
        setPushEnabled(true);
      }
    } else {
      setPushEnabled(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          style={styles.avatar}
        >
          <Ionicons name="person" size={36} color="#fff" />
        </LinearGradient>
        {user ? (
          <>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </>
        ) : (
          <>
            <Text style={styles.userName}>Welcome, Traveler!</Text>
            <Text style={styles.userEmail}>Sign in to access all features</Text>
          </>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="notifications" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={togglePushNotifications}
            trackColor={{
              false: Colors.border,
              true: Colors.primaryLight,
            }}
            thumbColor={pushEnabled ? Colors.primary : Colors.textTertiary}
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        {[
          { icon: "globe", label: "Website", value: "aagamholidays.com" },
          { icon: "call", label: "Contact", value: "+91 98765 43210" },
          { icon: "mail", label: "Email", value: "info@aagamholidays.com" },
          { icon: "information-circle", label: "Version", value: "1.0.0" },
        ].map((item) => (
          <View key={item.label} style={styles.aboutRow}>
            <View style={styles.aboutIconWrap}>
              <Ionicons name={item.icon as any} size={14} color={Colors.primary} />
            </View>
            <Text style={styles.aboutLabel}>{item.label}</Text>
            <Text style={styles.aboutValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      {user && (
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={18} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.xl },

  // Profile header
  profileHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.light,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
  },

  // Settings
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: "500" },

  // About
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  aboutIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutLabel: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  aboutValue: { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Sign out
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  signOutText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.error },
});
