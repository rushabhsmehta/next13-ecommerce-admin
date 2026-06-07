import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@clerk/expo";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import { WHATSAPP_BUSINESS_NUMBER } from "@/constants/whatsapp";
import { API_BASE_URL } from "@/constants/api";
import { trackEvent } from "@/lib/analytics";
import { mobileAppVariantHeaders } from "@/lib/app-variant";
import { validateMobileCoupon } from "@/lib/coupons";

const WHATSAPP_NUMBER = WHATSAPP_BUSINESS_NUMBER;
const PHONE_RE = /^[6-9]\d{9}$/;
const HOTEL_CATEGORIES = ["Budget", "3 Star", "4 Star", "5 Star", "Luxury"];

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EnquiryScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { locationId, locationLabel, packageName, couponCode: couponCodeParam, packageId, source } = useLocalSearchParams<{
    locationId: string;
    locationLabel: string;
    packageName: string;
    couponCode?: string;
    packageId?: string;
    source?: string;
  }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [journeyDate, setJourneyDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [numInfants, setNumInfants] = useState(0);
  const [budget, setBudget] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [hotelCategory, setHotelCategory] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const journeyDateLabel = useMemo(
    () => (journeyDate ? formatYmd(journeyDate) : "Choose preferred date"),
    [journeyDate]
  );

  useEffect(() => {
    const value = Array.isArray(couponCodeParam) ? couponCodeParam[0] : couponCodeParam;
    if (value?.trim()) setCouponCode(value.trim().toUpperCase());
  }, [couponCodeParam]);

  useEffect(() => {
    if (!isSignedIn) { setLoadingProfile(false); return; }
    async function prefill() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/mobile/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...mobileAppVariantHeaders(),
          },
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

  async function handleValidateCoupon() {
    const code = couponCode.trim();
    if (!code) {
      Alert.alert("Coupon", "Enter a coupon code first.");
      return;
    }
    setValidatingCoupon(true);
    try {
      const result = await validateMobileCoupon({
        couponCode: code,
        bookingAmount: Number(budget.replace(/[^0-9.]/g, "")) || undefined,
        locationId: locationId || undefined,
        customerMobile: phone.replace(/\D/g, "") || undefined,
        travelDate: journeyDate ? formatYmd(journeyDate) : undefined,
        numAdults,
      });
      setCouponValid(result.valid);
      setCouponMessage(result.message);
    } catch {
      setCouponValid(false);
      setCouponMessage("Could not validate coupon right now.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert("Required", "Please enter your name."); return; }
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone) { Alert.alert("Required", "Please enter your phone number."); return; }
    if (!PHONE_RE.test(normalizedPhone)) {
      Alert.alert("Phone number", "Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!locationId) { Alert.alert("Error", "Destination information is missing."); return; }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...mobileAppVariantHeaders(),
      };
      const token = isSignedIn ? await getToken() : null;
      if (token) headers.Authorization = `Bearer ${token}`;

      const preferenceLines = [
        remarks.trim(),
        budget.trim() ? `Budget: ${budget.trim()}` : "",
        pickupCity.trim() ? `Pickup city: ${pickupCity.trim()}` : "",
        hotelCategory ? `Preferred hotel: ${hotelCategory}` : "",
        packageName ? `Package: ${packageName}` : "",
      ].filter(Boolean);
      const res = await fetch(`${API_BASE_URL}/api/travel/enquiry`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId,
          name: name.trim(),
          phone: normalizedPhone,
          journeyDate: journeyDate ? formatYmd(journeyDate) : undefined,
          numAdults,
          numChildren5to11: numChildren,
          numChildrenBelow5: numInfants,
          remarks: preferenceLines.join("\n") || undefined,
          couponCode: couponCode.trim() || undefined,
          packageId: packageId || undefined,
          source: source || undefined,
        }),
      });
      if (res.ok) {
        trackEvent("enquiry_submit", {
          locationId,
          adults: numAdults,
          children: numChildren,
          infants: numInfants,
          hasBudget: Boolean(budget.trim()),
          hasCoupon: Boolean(couponCode.trim()),
        });
        setSubmitted(true);
      } else {
        Alert.alert("Error", "Failed to submit enquiry. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setSubmitting(false);
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selected) setJourneyDate(selected);
  }

  if (submitted) {
    return (
      <View style={styles.successContainer} testID="enquiry-success-screen">
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
          testID="enquiry-track-button"
          style={styles.successButton}
          onPress={() =>
            isSignedIn ? router.push("/profile/inquiries") : router.push("/login")
          }
        >
          <Text style={styles.successButtonText}>
            {isSignedIn ? "Track My Enquiries" : "Sign in to track enquiries"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="enquiry-back-to-package"
          style={styles.successSecondary}
          onPress={() => router.back()}
        >
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
      testID="enquiry-screen"
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
          testID="enquiry-name-input"
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
          testID="enquiry-phone-input"
          style={styles.input}
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, "").slice(0, 10))}
          placeholder="e.g. 9876543210"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="phone-pad"
          returnKeyType="next"
          maxLength={10}
        />

        <FieldLabel>Preferred Travel Date</FieldLabel>
        <TouchableOpacity
          testID="enquiry-date-button"
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Choose preferred travel date"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={journeyDate ? Colors.primary : Colors.textTertiary}
          />
          <Text style={[styles.dateButtonText, !journeyDate && styles.datePlaceholder]}>
            {journeyDateLabel}
          </Text>
          {journeyDate ? (
            <TouchableOpacity
              testID="enquiry-date-clear"
              hitSlop={8}
              onPress={() => setJourneyDate(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear travel date"
            >
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {showDatePicker ? (
          <DateTimePicker
            testID="enquiry-date-picker"
            value={journeyDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        ) : null}

        <FieldLabel>Number of Adults</FieldLabel>
        <View style={styles.stepper}>
          <TouchableOpacity
            testID="enquiry-adults-decrease"
            style={styles.stepperBtn}
            onPress={() => setNumAdults((n) => Math.max(1, n - 1))}
          >
            <Ionicons name="remove" size={18} color={numAdults > 1 ? Colors.primary : Colors.textTertiary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{numAdults}</Text>
          <TouchableOpacity
            testID="enquiry-adults-increase"
            style={styles.stepperBtn}
            onPress={() => setNumAdults((n) => Math.min(20, n + 1))}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FieldLabel>Children (5-11)</FieldLabel>
        <View style={styles.stepper}>
          <TouchableOpacity
            testID="enquiry-children-decrease"
            style={styles.stepperBtn}
            onPress={() => setNumChildren((n) => Math.max(0, n - 1))}
            accessibilityRole="button"
            accessibilityLabel="Decrease children count"
          >
            <Ionicons name="remove" size={18} color={numChildren > 0 ? Colors.primary : Colors.textTertiary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{numChildren}</Text>
          <TouchableOpacity
            testID="enquiry-children-increase"
            style={styles.stepperBtn}
            onPress={() => setNumChildren((n) => Math.min(10, n + 1))}
            accessibilityRole="button"
            accessibilityLabel="Increase children count"
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FieldLabel>Infants / Children Below 5</FieldLabel>
        <View style={styles.stepper}>
          <TouchableOpacity
            testID="enquiry-infants-decrease"
            style={styles.stepperBtn}
            onPress={() => setNumInfants((n) => Math.max(0, n - 1))}
            accessibilityRole="button"
            accessibilityLabel="Decrease infants count"
          >
            <Ionicons name="remove" size={18} color={numInfants > 0 ? Colors.primary : Colors.textTertiary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{numInfants}</Text>
          <TouchableOpacity
            testID="enquiry-infants-increase"
            style={styles.stepperBtn}
            onPress={() => setNumInfants((n) => Math.min(10, n + 1))}
            accessibilityRole="button"
            accessibilityLabel="Increase infants count"
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <FieldLabel>Approx Budget</FieldLabel>
        <TextInput
          testID="enquiry-budget-input"
          style={styles.input}
          value={budget}
          onChangeText={setBudget}
          placeholder="e.g. ₹60,000 total or ₹25,000/person"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="next"
        />

        <View style={styles.couponHeaderRow}>
          <FieldLabel>Coupon Code</FieldLabel>
          <TouchableOpacity
            testID="enquiry-offers-link"
            onPress={() => router.push("/offers" as never)}
            accessibilityRole="button"
            accessibilityLabel="View available offers"
          >
            <Text style={styles.offersLink}>View offers</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.couponRow}>
          <TextInput
            testID="enquiry-coupon-input"
            style={[styles.input, styles.couponInput]}
            value={couponCode}
            onChangeText={(value) => {
              setCouponCode(value.toUpperCase());
              setCouponMessage(null);
              setCouponValid(null);
            }}
            placeholder="e.g. GOA10"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
            returnKeyType="done"
          />
          <TouchableOpacity
            testID="enquiry-coupon-validate"
            style={[styles.couponButton, validatingCoupon && styles.submitButtonDisabled]}
            onPress={handleValidateCoupon}
            disabled={validatingCoupon}
            accessibilityRole="button"
            accessibilityLabel="Validate coupon"
          >
            {validatingCoupon ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        {couponMessage ? (
          <Text
            style={[
              styles.couponMessage,
              couponValid ? styles.couponMessageOk : styles.couponMessageError,
            ]}
          >
            {couponMessage}
          </Text>
        ) : null}

        <FieldLabel>Pickup City</FieldLabel>
        <TextInput
          testID="enquiry-pickup-city-input"
          style={styles.input}
          value={pickupCity}
          onChangeText={setPickupCity}
          placeholder="e.g. Ahmedabad, Surat, Mumbai"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <FieldLabel>Preferred Hotel Category</FieldLabel>
        <View style={styles.hotelChipRow}>
          {HOTEL_CATEGORIES.map((category) => {
            const active = hotelCategory === category;
            return (
              <TouchableOpacity
                key={category}
                testID={`enquiry-hotel-category-${category.replace(/\s+/g, "-").toLowerCase()}`}
                style={[styles.hotelChip, active && styles.hotelChipActive]}
                onPress={() => setHotelCategory(active ? "" : category)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Preferred hotel category ${category}`}
              >
                <Text style={[styles.hotelChipText, active && styles.hotelChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FieldLabel>Special Requests</FieldLabel>
        <TextInput
          testID="enquiry-remarks-input"
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
          testID="enquiry-submit-button"
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit enquiry"
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
          testID="enquiry-whatsapp-button"
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
  dateButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  dateButtonText: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  datePlaceholder: { color: Colors.textTertiary },
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
  hotelChipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  hotelChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  hotelChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  hotelChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  hotelChipTextActive: { color: Colors.primary },
  couponHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  offersLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "700",
    paddingBottom: 6,
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  couponInput: { flex: 1 },
  couponButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryBg,
  },
  couponMessage: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    marginTop: 6,
  },
  couponMessageOk: { color: Colors.success ?? "#15803d" },
  couponMessageError: { color: Colors.error },

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
