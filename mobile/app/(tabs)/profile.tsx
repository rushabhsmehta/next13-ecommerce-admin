import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import { buildTelUrl, buildWaMeUrl } from "@/constants/whatsapp";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { API_BASE_URL } from "@/constants/api";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";
import { setDevAuthBypassToken } from "@/lib/dev-auth-bypass";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isApproved: boolean;
}

export default function ProfileTab() {
  const router = useRouter();
  const { isSignedIn, getToken, isLoaded: clerkLoaded } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const { signOut } = useClerk();
  const insets = useSafeAreaInsets();
  const {
    isAdmin,
    canUseAdmin,
    isAssociate,
    travelUser: authTravelUser,
    isLoading: userAuthLoading,
  } = useCurrentUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  /** Avoid refetch spam when auth-status polling sets isLoading true/false without identity change. */
  const lastProfileFetchAuthKeyRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const token = await resolveMobileAuthToken(() => getTokenRef.current());
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!clerkLoaded || userAuthLoading) return;
    const authKey = `${Boolean(isSignedIn)}:${authTravelUser?.id ?? ""}`;
    if (lastProfileFetchAuthKeyRef.current === authKey) return;
    lastProfileFetchAuthKeyRef.current = authKey;
    void fetchProfile();
  }, [clerkLoaded, userAuthLoading, isSignedIn, authTravelUser?.id, fetchProfile]);

  function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            void setDevAuthBypassToken(null);
            signOut();
          },
        },
      ]
    );
  }

  if (!userAuthLoading && !isSignedIn && !authTravelUser) {
    return (
      <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-outline" size={40} color={Colors.textTertiary} />
        </View>
        <Text style={styles.guestTitle}>You're not signed in</Text>
        <Text style={styles.guestSubtitle}>Sign in to manage your profile and track your enquiries.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/login")}>
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (userAuthLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = (profile?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text style={styles.headerName}>{profile?.name ?? ""}</Text>
        <Text style={styles.headerEmail}>{profile?.email ?? ""}</Text>
        {profile?.phone && (
          <View style={styles.headerPhoneRow}>
            <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerPhone}>{profile.phone}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Menu items */}
      <View style={styles.section}>
        <MenuItem
          icon="create-outline"
          label="Edit Profile"
          onPress={() => router.push("/profile/edit")}
        />
        <MenuItem
          icon="document-text-outline"
          label="My Enquiries"
          badge="Track your tour requests"
          onPress={() => router.push("/profile/inquiries")}
        />
        <MenuItem
          icon="heart-outline"
          label="Saved Packages"
          badge="Compare shortlisted tours"
          onPress={() => router.push("/profile/saved-packages")}
        />
        {isAssociate ? (
          <MenuItem
            icon="briefcase-outline"
            label="Associate Inquiries"
            badge="Create and manage associate leads"
            onPress={() => router.push("/associate/inquiries")}
          />
        ) : null}
      </View>

      {canUseAdmin ? (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Admin Shortcuts</Text>
          </View>
          <View style={styles.section}>
            <MenuItem
              icon="grid-outline"
              label="Admin Workspace"
              badge="CRM, finance, reports, settings"
              onPress={() => router.push("/admin" as never)}
            />
            {isAdmin ? (
              <>
            <MenuItem
              icon="logo-whatsapp"
              label="WhatsApp Inbox"
              badge="Unread replies and customers"
              iconColor="#25D366"
              onPress={() => router.push("/whatsapp")}
            />
            <MenuItem
              icon="megaphone-outline"
              label="Campaigns"
              badge="Review and launch broadcasts"
              onPress={() => router.push("/whatsapp/campaigns")}
            />
            <MenuItem
              icon="albums-outline"
              label="Templates"
              badge="Reusable WhatsApp messages"
              onPress={() => router.push("/whatsapp/templates")}
            />
              </>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Preferences</Text>
      </View>
      <View style={styles.section}>
        <MenuItem
          icon="notifications-outline"
          label="Notification Preferences"
          badge="Trip chat, enquiry updates, offers"
          onPress={() =>
            Alert.alert(
              "Notification Preferences",
              "Granular push controls are coming soon. For now, you can manage app notifications from device settings."
            )
          }
        />
      </View>

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Support</Text>
      </View>
      <View style={styles.section}>
        <MenuItem
          icon="logo-whatsapp"
          label="Chat with Us on WhatsApp"
          iconColor="#25D366"
          onPress={() => {
            Linking.openURL(buildWaMeUrl("Hi, I need help with my booking."));
          }}
        />
        <MenuItem
          icon="call-outline"
          label="Call Us"
          onPress={() => {
            Linking.openURL(buildTelUrl());
          }}
        />
      </View>

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Account</Text>
      </View>
      <View style={styles.section}>
        <TouchableOpacity style={[styles.menuItem, styles.signOutItem]} onPress={handleSignOut}>
          <View style={[styles.menuIcon, { backgroundColor: "#fff1f2" }]}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          </View>
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Aagam Holidays · v1.0</Text>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  badge,
  onPress,
  iconColor,
}: {
  icon: any;
  label: string;
  badge?: string;
  onPress: () => void;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={iconColor ?? Colors.primary} />
      </View>
      <View style={styles.menuLabelWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        {badge && <Text style={styles.menuBadge}>{badge}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: Colors.background,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  guestSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  loginButtonText: { color: "#fff", fontWeight: "700", fontSize: FontSize.lg },

  // Header
  headerCard: {
    alignItems: "center",
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitials: { fontSize: FontSize.xxl, fontWeight: "800", color: "#fff" },
  headerName: { fontSize: FontSize.xl, fontWeight: "700", color: "#fff" },
  headerEmail: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.8)" },
  headerPhoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  headerPhone: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.8)" },

  // Menu
  section: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  sectionTitleText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  signOutItem: { borderBottomWidth: 0 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabelWrap: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  menuBadge: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  signOutLabel: { flex: 1, fontSize: FontSize.md, fontWeight: "600", color: Colors.error },

  versionText: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xxl,
  },
});
