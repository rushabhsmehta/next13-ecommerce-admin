import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { associateApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AssociateLoginScreen() {
  const router = useRouter();
  const { loginAsAssociate } = useAuth();

  const [mobileNumber, setMobileNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleLogin = async () => {
    if (!mobileNumber.trim()) {
      Alert.alert("Required", "Please enter your registered mobile number.");
      return;
    }
    if (!accessToken.trim()) {
      Alert.alert("Required", "Please enter your access token.");
      return;
    }

    setLoading(true);
    try {
      const result = await associateApi.auth(mobileNumber.trim(), accessToken.trim());
      await loginAsAssociate(result.associate, result.accessToken);
      // Navigate back to tabs — Inquiries tab will now appear
      router.replace("/(tabs)/inquiries");
    } catch (err: any) {
      Alert.alert(
        "Login Failed",
        err.message?.includes("401") || err.message?.includes("Invalid")
          ? "Invalid mobile number or access token. Please check your credentials."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.logoWrap}>
            <Ionicons name="briefcase" size={36} color="#fff" />
          </View>
          <Text style={styles.brand}>AAGAM HOLIDAYS</Text>
          <Text style={styles.title}>Associate Sign In</Text>
          <Text style={styles.subtitle}>
            Enter your credentials provided by the Aagam team
          </Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          {/* Mobile Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Registered Mobile Number</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor={Colors.textTertiary}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
              />
            </View>
            <Text style={styles.hint}>The mobile number registered with Aagam Holidays</Text>
          </View>

          {/* Access Token */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Access Token</Text>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <Ionicons name="key-outline" size={18} color={Colors.primary} />
              </View>
              <TextInput
                style={[styles.input, styles.tokenInput]}
                placeholder="Paste your access token"
                placeholderTextColor={Colors.textTertiary}
                value={accessToken}
                onChangeText={setAccessToken}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowToken(!showToken)} style={styles.eyeBtn}>
                <Ionicons
                  name={showToken ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={Colors.textTertiary}
                />
              </Pressable>
            </View>
            <Text style={styles.hint}>Shared by your Aagam coordinator (looks like: a1b2c3d4-...)</Text>
          </View>

          {/* Sign In button */}
          <Pressable
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.gradient1, Colors.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInBtnGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              Contact your Aagam Holidays coordinator to get your mobile number registered and receive your access token.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingBottom: 40 },

  // Header
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

  // Form
  form: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.light,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  tokenInput: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: FontSize.sm,
  },
  eyeBtn: {
    padding: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },

  // Button
  signInBtn: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  signInBtnDisabled: { opacity: 0.7 },
  signInBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg + 2,
  },
  signInBtnText: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
  },

  // Info card
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
