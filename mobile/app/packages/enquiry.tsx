import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const WHATSAPP_NUMBER = "919724444701";

export default function EnquiryScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { locationId, locationLabel, packageName } = useLocalSearchParams<{
    locationId: string;
    locationLabel: string;
    packageName: string;
  }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [numAdults, setNumAdults] = useState(2);
  const [remarks, setRemarks] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isSignedIn) { setLoadingProfile(false); return; }
    async function prefill() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setName(data.name ?? "");
          setPhone(data.phone ?? "");
        }
      } catch {}
      setLoadingProfile(false);
    }
    prefill();
  }, [isSignedIn, getToken]);

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert("Required", "Please enter your name."); return; }
    if (!phone.trim()) { Alert.alert("Required", "Please enter your phone number."); return; }
    if (!locationId) { Alert.alert("Error", "Destination information is missing."); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/enquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationId,
          name: name.trim(),
          phone: phone.trim(),
          journeyDate: journeyDate.trim() || undefined,
          numAdults,
          remarks: remarks.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        Alert.alert("Error", "Failed to submit enquiry. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          style={styles.successIconCircle}
        >
          <Ionicons name="checkmark" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.successTitle}>Enquiry Submitted!</Text>
        <Text style={styles.successSubtitle}>
          Our team will reach out to you at {phone} within 24 hours.
        </Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => router.push("/profile/inquiries")}
        >
          <Text style={styles.successButtonText}>Track My Enquiries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successSecondary} onPress={() => router.back()}>
          <Text style={styles.successSecondaryText}>Back to Package</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Package context banner */}
        <View style={styles.contextBanner}>
          <View style={styles.contextIconWrap}>
            <Ionicons name="airplane-outline" size={16} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            {packageName ? (
              <Text style={styles.contextPackage} numberOfLines={1}>{packageName}</Text>
            ) : null}
            <Text style={styles.contextDest}>{locationLabel ?? "Selected Destination"}</Text>
          </View>
        </View>

        <Text style={styles.formTitle}>Your Contact Details</Text>
        <Text style={styles.formSubtitle}>We'll use these to get in touch with your customised itinerary.</Text>

        <FieldLabel required>Full Name</FieldLabel>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <FieldLabel required>Phone Number</FieldLabel>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 9876543210"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <FieldLabel>Preferred Travel Date</FieldLabel>
        <TextInput
          style={styles.input}
          value={journeyDate}
          onChangeText={setJourneyDate}
          placeholder="e.g. 2026-06-15 (YYYY-MM-DD)"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="next"
        />

        <FieldLabel>Number of Adults</FieldLabel>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setNumAdults((n) => Math.max(1, n - 1))}
          >
            <Ionicons name="remove" size={18} color={numAdults > 1 ? Colors.primary : Colors.textTertiary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{numAdults}</Text>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setNumAdults((n) => Math.min(20, n + 1))}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FieldLabel>Special Requests</FieldLabel>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Any special requirements, budget, preferences…"
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Enquiry</Text>
            </>
          )}
        </TouchableOpacity>

        {/* WhatsApp fallback */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <TouchableOpacity
          style={styles.waButton}
          onPress={() =>
            Linking.openURL(
              `https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I'm interested in: ${packageName ?? locationLabel}`
            )
          }
        >
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={styles.waButtonText}>Chat on WhatsApp Instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required && <Text style={styles.labelRequired}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },

  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  contextIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  contextPackage: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  contextDest: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "500" },

  formTitle: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  formSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },

  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: 6,
  },
  labelRequired: { color: Colors.error },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: { height: 100, paddingTop: 12 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  stepperBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  stepperValue: {
    width: 56,
    textAlign: "center",
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    marginTop: Spacing.xxl,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "700" },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textTertiary },

  waButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "#25D366",
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
  },
  waButtonText: { color: "#25D366", fontSize: FontSize.md, fontWeight: "600" },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  successTitle: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.text },
  successSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  successButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  successButtonText: { color: "#fff", fontWeight: "700", fontSize: FontSize.md },
  successSecondary: { paddingVertical: Spacing.sm },
  successSecondaryText: { color: Colors.textTertiary, fontSize: FontSize.sm },
});
