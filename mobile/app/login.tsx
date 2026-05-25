import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSignIn, useSignUp, useAuth, useSSO } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
import { setDevAuthBypassToken, getDevAuthBypassToken } from "@/lib/dev-auth-bypass";
import {
  APP_SCHEME,
  getPostLoginRoute,
  mobileAppVariantHeaders,
} from "@/lib/app-variant";

WebBrowser.maybeCompleteAuthSession();

type Step = "email" | "otp" | "profile";
type FlowType = "signIn" | "signUp";
type SocialStrategy = "oauth_google" | "oauth_apple";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { getToken } = useAuth();
  const { startSSOFlow } = useSSO();

  const [step, setStep] = useState<Step>("email");
  const [flowType, setFlowType] = useState<FlowType>("signIn");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Local-only: server MOBILE_DEV_AUTH_BYPASS_TOKEN, no Clerk session */
  const [devBypassTokenInput, setDevBypassTokenInput] = useState("");
  const [devBypassActive, setDevBypassActive] = useState(false);
  const [devProfileEmail, setDevProfileEmail] = useState("");
  const [showDevBypass, setShowDevBypass] = useState(false);

  const isReady = signInLoaded && signUpLoaded;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function completeAuthenticatedSession() {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...mobileAppVariantHeaders(),
      },
    });
    if (!res.ok) throw new Error("Could not verify your account.");

    const authStatus = await res.json();
    if (authStatus.travelUser) {
      router.replace(getPostLoginRoute() as never);
    } else {
      setStep("profile");
    }
  }

  async function handleSocialSignIn(strategy: SocialStrategy) {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: APP_SCHEME,
        path: "oauth-native-callback",
      });
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (!createdSessionId || !setActive) {
        setError("Sign-in was cancelled.");
        return;
      }

      await setActive({ session: createdSessionId });
      await completeAuthenticatedSession();
    } catch (err: unknown) {
      setError(extractClerkError(err) ?? "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevBypassContinue() {
    const trimmed = devBypassTokenInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await setDevAuthBypassToken(trimmed);
      const res = await fetch(`${API_BASE_URL}/api/mobile/auth-status`, {
        headers: {
          Authorization: `Bearer ${trimmed}`,
          ...mobileAppVariantHeaders(),
        },
      });
      if (!res.ok) {
        await setDevAuthBypassToken(null);
        setError("Invalid token or server rejected the request.");
        return;
      }
      const authStatus = await res.json();
      if (authStatus.travelUser) {
        setDevBypassActive(false);
        router.replace(getPostLoginRoute() as never);
      } else {
        setDevBypassActive(true);
        setStep("profile");
      }
    } catch {
      await setDevAuthBypassToken(null);
      setError("Could not reach the server. Check API URL and bypass env.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!isReady || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await signIn!.create({ strategy: "email_code", identifier: email.trim() });
      setFlowType("signIn");
      setStep("otp");
      startResendTimer();
    } catch {
      try {
        await signUp!.create({ emailAddress: email.trim() });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setFlowType("signUp");
        setStep("otp");
        startResendTimer();
      } catch (err: unknown) {
        setError(extractClerkError(err) ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (!isReady || code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      if (flowType === "signIn") {
        const result = await signIn!.attemptFirstFactor({ strategy: "email_code", code });
        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          await completeAuthenticatedSession();
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } else {
        const result = await signUp!.attemptEmailAddressVerification({ code });
        if (result.status === "complete") {
          await setSignUpActive!({ session: result.createdSessionId });
          setStep("profile");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      }
    } catch (err: unknown) {
      setError(extractClerkError(err) ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isReady || resendTimer > 0) return;
    setLoading(true);
    setError(null);
    try {
      if (flowType === "signIn") {
        await signIn!.create({ strategy: "email_code", identifier: email.trim() });
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      startResendTimer();
    } catch (err: unknown) {
      setError(extractClerkError(err) ?? "Failed to resend. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit() {
    if (!name.trim()) return;
    if (devBypassActive && !devProfileEmail.trim().includes("@")) {
      setError("Enter a valid email for dev profile setup.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = devBypassActive
        ? await getDevAuthBypassToken()
        : await getToken();
      if (!token) throw new Error("Not authenticated");
      const body: { name: string; phone?: string; email?: string } = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };
      if (devBypassActive) {
        body.email = devProfileEmail.trim();
      }
      const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...mobileAppVariantHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      setDevBypassActive(false);
      router.replace(getPostLoginRoute() as never);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
      setLoading(false);
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && step === "otp" && !loading) {
      handleOtpSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const stepIcons = { email: "mail-outline", otp: "key-outline", profile: "person-outline" } as const;
  const stepTitles = {
    email: "Welcome back",
    otp: "Check your email",
    profile: "Almost there",
  };
  const stepSubtitles = {
    email: "Sign in or create an account",
    otp: `We sent a code to ${email}`,
    profile: "Tell us your name to get started",
  };

  return (
    <KeyboardAvoidingView
      testID="login-screen"
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name={stepIcons[step]} size={26} color="#fff" />
        </View>
        <Text style={styles.title}>{stepTitles[step]}</Text>
        <Text style={styles.subtitle}>{stepSubtitles[step]}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Email */}
        {step === "email" && (
          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!loading}
              onSubmitEditing={handleEmailSubmit}
              returnKeyType="done"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryBtn, (!email.trim() || loading) && styles.btnDisabled]}
              onPress={handleEmailSubmit}
              disabled={!email.trim() || loading || !isReady}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              testID="login-google-btn"
              style={[styles.socialBtn, loading && styles.btnDisabled]}
              onPress={() => handleSocialSignIn("oauth_google")}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Ionicons name="logo-google" size={18} color={Colors.text} />
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </Pressable>

            <Pressable
              testID="login-apple-btn"
              style={[styles.socialBtn, loading && styles.btnDisabled]}
              onPress={() => handleSocialSignIn("oauth_apple")}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <Ionicons name="logo-apple" size={20} color={Colors.text} />
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </Pressable>

            {__DEV__ ? (
              <View style={styles.devSection}>
                <TouchableOpacity
                  testID="login-dev-bypass-toggle"
                  accessibilityRole="button"
                  accessibilityLabel="Show developer sign-in options"
                  onPress={() => setShowDevBypass((v) => !v)}
                >
                  <Text style={styles.devToggleText}>
                    {showDevBypass ? "Hide developer sign-in" : "Developer sign-in (bypass Clerk)"}
                  </Text>
                </TouchableOpacity>
                {showDevBypass ? (
                  <View style={styles.devForm}>
                    <Text style={styles.devHint}>
                      Set on the Next server: MOBILE_DEV_AUTH_BYPASS_ENABLED=1,
                      MOBILE_DEV_AUTH_BYPASS_TOKEN, MOBILE_DEV_AUTH_BYPASS_USER_ID (a real Clerk user id).
                    </Text>
                    <TextInput
                      testID="login-dev-bypass-token"
                      style={styles.input}
                      placeholder="Paste bypass token"
                      placeholderTextColor={Colors.textTertiary}
                      value={devBypassTokenInput}
                      onChangeText={setDevBypassTokenInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      accessibilityLabel="Dev auth bypass token"
                    />
                    <TouchableOpacity
                      testID="login-dev-bypass-continue"
                      style={[
                        styles.secondaryBtn,
                        (!devBypassTokenInput.trim() || loading) && styles.btnDisabled,
                      ]}
                      onPress={() => void handleDevBypassContinue()}
                      disabled={!devBypassTokenInput.trim() || loading}
                    >
                      <Text style={styles.secondaryBtnText}>Continue with bypass token</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <View style={styles.form}>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={Colors.textTertiary}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryBtn, (code.length < 6 || loading) && styles.btnDisabled]}
              onPress={handleOtpSubmit}
              disabled={code.length < 6 || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify</Text>
              )}
            </TouchableOpacity>
            <View style={styles.otpActions}>
              <TouchableOpacity onPress={() => { setStep("email"); setCode(""); setError(null); }}>
                <Text style={styles.linkText}>Change email</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendTimer > 0 || loading}
              >
                <Text style={[styles.linkText, styles.linkOrange, (resendTimer > 0 || loading) && styles.linkDisabled]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Profile */}
        {step === "profile" && (
          <View style={styles.form}>
            {devBypassActive ? (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  value={devProfileEmail}
                  onChangeText={setDevProfileEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
              </>
            ) : null}
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus={!devBypassActive}
              editable={!loading}
              returnKeyType="next"
            />
            <Text style={[styles.label, { marginTop: Spacing.md }]}>
              Phone number{" "}
              <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor={Colors.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!name.trim() || loading || (devBypassActive && !devProfileEmail.includes("@"))) &&
                  styles.btnDisabled,
              ]}
              onPress={handleProfileSubmit}
              disabled={
                !name.trim() || loading || (devBypassActive && !devProfileEmail.includes("@"))
              }
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Get started</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function extractClerkError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { errors?: Array<{ message?: string; longMessage?: string }> };
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    return e.errors[0].longMessage ?? e.errors[0].message ?? null;
  }
  if ("message" in e && typeof (e as { message?: string }).message === "string") {
    return (e as { message: string }).message;
  }
  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 6,
  },

  body: {
    padding: Spacing.lg,
  },
  form: {
    marginTop: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  optionalLabel: {
    fontWeight: "400",
    color: Colors.textTertiary,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 14,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: "#ef4444",
    marginBottom: Spacing.sm,
  },
  primaryBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginTop: Spacing.xs,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: FontSize.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.sm,
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: BorderRadius.lg,
    paddingVertical: 13,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  socialBtnText: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  linkOrange: {
    color: Colors.primary,
  },
  linkDisabled: {
    color: Colors.textTertiary,
  },
  devSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  devToggleText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: "600",
    textAlign: "center",
  },
  devForm: {
    marginTop: Spacing.md,
  },
  devHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  secondaryBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    marginTop: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
});
