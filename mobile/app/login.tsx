import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignIn, useSignUp, useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";

type Step = "email" | "otp" | "profile";
type FlowType = "signIn" | "signUp";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { getToken } = useAuth();

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
          // Check if TravelAppUser already exists
          const token = await getToken();
          const res = await fetch(`${API_BASE_URL}/api/travel-auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const travelUser = await res.json();
          if (travelUser) {
            router.replace("/(tabs)");
          } else {
            setStep("profile");
          }
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
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/travel-auth/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      router.replace("/(tabs)");
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
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
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
              style={[styles.primaryBtn, (!name.trim() || loading) && styles.btnDisabled]}
              onPress={handleProfileSubmit}
              disabled={!name.trim() || loading}
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
});
