import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSSO } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function AdminLoginScreen() {
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/auth/sso-callback"),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // AuthContext useEffect detects isSignedIn → calls /api/mobile/me → sets userType = "admin"
        router.replace("/(tabs)/whatsapp" as any);
      }
    } catch (err: any) {
      Alert.alert(
        "Sign In Failed",
        err.message ?? "Google sign-in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#075E54", "#128C7E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.logoWrap}>
          <Ionicons name="logo-whatsapp" size={36} color="#fff" />
        </View>
        <Text style={styles.brand}>AAGAM HOLIDAYS</Text>
        <Text style={styles.title}>Admin Sign In</Text>
        <Text style={styles.subtitle}>
          Sign in with your CRM Google account to access WhatsApp live chat
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#075E54" />
          </View>
          <Text style={styles.cardTitle}>CRM Google Account</Text>
          <Text style={styles.cardDesc}>
            Use the same Google account you use to log into the Aagam Holidays admin dashboard.
            Only ADMIN and OWNER accounts can access WhatsApp live chat.
          </Text>
        </View>

        <Pressable
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#075E54" />
          ) : (
            <>
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>
            Admin login gives you access to WhatsApp live chat with full messaging capabilities,
            including templates, media, and push notifications.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 56,
    left: Spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  brand: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },

  body: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },

  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  cardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xxl,
    ...Shadows.light,
  },
  googleBtnDisabled: { opacity: 0.7 },
  googleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleG: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  googleBtnText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },

  infoCard: {
    flexDirection: "row",
    gap: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight + "40",
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
