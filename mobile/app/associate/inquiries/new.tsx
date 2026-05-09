import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { withAuth } from "@/lib/api";
import { createAssociateInquiryClient, getLocationOptions, type LocationOption } from "@/lib/associate-inquiries";

export default function CreateAssociateInquiryScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const client = useMemo(() => createAssociateInquiryClient(withAuth(() => getToken())), [getToken]);

  const [submitting, setSubmitting] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobileNumber, setCustomerMobileNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getLocationOptions();
        setLocations(data);
      } finally {
        setLoadingLocations(false);
      }
    })();
  }, []);

  async function onSubmit() {
    if (!customerName.trim() || !customerMobileNumber.trim() || !journeyDate.trim() || !locationId) {
      Alert.alert("Required", "Please complete name, phone, location and journey date.");
      return;
    }
    setSubmitting(true);
    try {
      const inquiry = await client.createInquiry({
        customerName: customerName.trim(),
        customerMobileNumber: customerMobileNumber.trim(),
        journeyDate: journeyDate.trim(),
        locationId,
        remarks: remarks.trim() || undefined,
      });
      router.replace(`/associate/inquiries/${inquiry.id}`);
    } catch (error: any) {
      Alert.alert("Create failed", error?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Customer name</Text>
      <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} />

      <Text style={styles.label}>Mobile number</Text>
      <TextInput
        style={styles.input}
        value={customerMobileNumber}
        onChangeText={setCustomerMobileNumber}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Journey date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={journeyDate} onChangeText={setJourneyDate} />

      <Text style={styles.label}>Location</Text>
      {loadingLocations ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <View style={styles.locationList}>
          {locations.slice(0, 25).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.locationPill, locationId === item.id ? styles.locationPillActive : null]}
              onPress={() => setLocationId(item.id)}
            >
              <Text style={locationId === item.id ? styles.locationPillTextActive : styles.locationPillText}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Remarks</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={remarks}
        onChangeText={setRemarks}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={[styles.button, submitting ? styles.disabled : null]} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Creating..." : "Create inquiry"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 32 },
  label: { color: Colors.textSecondary, fontWeight: "600", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  locationList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  locationPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  locationPillText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  locationPillTextActive: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: "700" },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    paddingVertical: 13,
  },
  disabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: FontSize.md },
});
