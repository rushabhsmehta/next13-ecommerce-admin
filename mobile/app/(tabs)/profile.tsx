import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { registerForPushNotifications } from "@/lib/notifications";

const ABOUT_ITEMS = [
  { icon: "globe", label: "Website", value: "aagamholidays.com" },
  { icon: "call", label: "Contact", value: "+91 97244 44701" },
  { icon: "mail", label: "Email", value: "info@aagamholidays.com" },
  { icon: "information-circle", label: "Version", value: "1.0.0" },
];

const SIGN_IN_BENEFITS = [
  { icon: "chatbubbles", text: "Live chat with your tour group" },
  { icon: "notifications", text: "Real-time trip updates & alerts" },
  { icon: "briefcase", text: "Easy booking management" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: logout,
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

  // ─── Unauthenticated: show a proper sign-in prompt ───────────────────────
  if (!isLoggedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Brand hero */}
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.signInHero}
        >
          <View style={styles.signInLogoWrap}>
            <Ionicons name="airplane" size={40} color="#fff" />
          </View>
          <Text style={styles.signInBrand}>AAGAM HOLIDAYS</Text>
          <Text style={styles.signInTitle}>Welcome Back</Text>
          <Text style={styles.signInSubtitle}>
            Sign in to access your trip chats and personalized travel experience
          </Text>
        </LinearGradient>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>What you get with an account</Text>
          {SIGN_IN_BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={b.icon as any} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Sign In as Associate */}
        <Pressable
          style={styles.signInButton}
          onPress={() => router.push("/auth/associate-login" as any)}
        >
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signInButtonGradient}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.signInButtonText}>Sign In</Text>
          </LinearGradient>
        </Pressable>

        {/* About section — visible even for guests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {ABOUT_ITEMS.map((item) => (
            <View key={item.label} style={styles.aboutRow}>
              <View style={styles.aboutIconWrap}>
                <Ionicons name={item.icon as any} size={14} color={Colors.primary} />
              </View>
              <Text style={styles.aboutLabel}>{item.label}</Text>
              <Text style={styles.aboutValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  // ─── Authenticated: full profile ─────────────────────────────────────────
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
        <Text style={styles.userName}>{user?.name || "Traveler"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
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
        {ABOUT_ITEMS.map((item) => (
          <View key={item.label} style={styles.aboutRow}>
            <View style={styles.aboutIconWrap}>
              <Ionicons name={item.icon as any} size={14} color={Colors.primary} />
            </View>
            <Text style={styles.aboutLabel}>{item.label}</Text>
            <Text style={styles.aboutValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Sign out */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out" size={18} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.xl },

  // ── Sign-in state ──
  signInHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  signInLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  signInBrand: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  signInTitle: {
    fontSize: FontSize.title,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  signInSubtitle: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.light,
  },
  benefitsTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  benefitText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "500",
    flex: 1,
  },
  signInButton: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  signInButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg + 2,
    borderRadius: BorderRadius.lg,
  },
  signInButtonText: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
  },

  // ── Authenticated state ──
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

  // ── Shared sections ──
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
