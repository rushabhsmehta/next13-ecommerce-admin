import { useEffect, useMemo, useRef, useState } from "react";
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
import { ApiError, withAuth } from "@/lib/api";
import {
  createAssociateInquiryClient,
  getLocationOptions,
  type AuthenticatedRequest,
  type LocationOption,
} from "@/lib/associate-inquiries";
import { fetchInquiryFormLookups, lookupLabel, type InquiryFormLookups } from "@/lib/inquiry-lookups";
import {
  RoomAllocationsEditor,
  type RoomAllocationDraftRow,
} from "@/app/associate/inquiries/components/RoomAllocationsEditor";
import {
  TransportDetailsEditor,
  type TransportDraftRow,
} from "@/app/associate/inquiries/components/TransportDetailsEditor";

const EMPTY_LOOKUPS: InquiryFormLookups = {
  roomTypes: [],
  occupancyTypes: [],
  mealPlans: [],
  vehicleTypes: [],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeYmd(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return t;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function flattenDetailsMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  const lines: string[] = [];
  if (Array.isArray(d.formErrors) && d.formErrors.length) lines.push(...d.formErrors);
  if (d.fieldErrors) {
    for (const [key, msgs] of Object.entries(d.fieldErrors)) {
      if (msgs?.length) lines.push(`${key}: ${msgs.join(", ")}`);
    }
  }
  return lines.length ? lines.join("\n") : null;
}

export default function CreateAssociateInquiryScreen() {
  const router = useRouter();
  const { getToken, isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authRequest: AuthenticatedRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );

  const client = useMemo(() => createAssociateInquiryClient(authRequest), [authRequest]);

  const [submitting, setSubmitting] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookups, setLookups] = useState<InquiryFormLookups>(EMPTY_LOOKUPS);
  const [roomRows, setRoomRows] = useState<RoomAllocationDraftRow[]>([]);
  const [transportRows, setTransportRows] = useState<TransportDraftRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobileNumber, setCustomerMobileNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [numAdults, setNumAdults] = useState("2");
  const [numChildrenAbove11, setNumChildrenAbove11] = useState("0");
  const [numChildren5to11, setNumChildren5to11] = useState("0");
  const [numChildrenBelow5, setNumChildrenBelow5] = useState("0");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => l.label.toLowerCase().includes(q));
  }, [locations, locationSearch]);

  useEffect(() => {
    if (!clerkLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      setLoadingLocations(true);
      setLookupsLoading(true);
      try {
        const [mapped, lu] = await Promise.all([
          getLocationOptions(authRequest),
          fetchInquiryFormLookups(authRequest),
        ]);
        if (!cancelled) {
          setLocations(mapped);
          setLookups(lu);
          if (mapped.length === 0) {
            Alert.alert(
              "No destinations loaded",
              "Signed in, but the locations list was empty. Check admin Locations data or try again."
            );
          }
          const lookupsMissing =
            lu.roomTypes.length === 0 ||
            lu.occupancyTypes.length === 0 ||
            lu.vehicleTypes.length === 0;
          if (lookupsMissing) {
            Alert.alert(
              "Room / transport lists incomplete",
              "Some dropdown lists are empty (room types, occupancy, meal plans, or vehicles). Check Settings in admin or try again."
            );
          }
        }
      } catch {
        if (!cancelled) {
          setLocations([]);
          setLookups(EMPTY_LOOKUPS);
          Alert.alert(
            "Could not load form data",
            "Ensure you are signed in and can reach the admin API (Wi‑Fi, firewall). On a physical phone use your PC LAN IP in app.json apiBaseUrlDev."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLocations(false);
          setLookupsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authRequest, clerkLoaded, isSignedIn]);

  async function onSubmit() {
    const journeyNormalized = normalizeYmd(journeyDate);
    const phone = customerMobileNumber.replace(/\s+/g, "").trim();

    if (!customerName.trim() || !phone || !journeyNormalized || !locationId) {
      Alert.alert("Required", "Please complete name, phone, location and journey date.");
      return;
    }
    if (!ISO_DATE.test(journeyNormalized)) {
      Alert.alert(
        "Journey date",
        "Use format YYYY-MM-DD (e.g. 2026-05-10). Single-digit months and days are OK."
      );
      return;
    }

    let nextFu = "";
    if (nextFollowUpDate.trim()) {
      nextFu = normalizeYmd(nextFollowUpDate.trim());
      if (!ISO_DATE.test(nextFu)) {
        Alert.alert("Follow-up date", "Use format YYYY-MM-DD or leave blank.");
        return;
      }
    }

    const nAdults = Math.max(0, parseInt(numAdults, 10) || 0);
    const nCh11 = Math.max(0, parseInt(numChildrenAbove11, 10) || 0);
    const nCh511 = Math.max(0, parseInt(numChildren5to11, 10) || 0);
    const nCh5 = Math.max(0, parseInt(numChildrenBelow5, 10) || 0);

    for (const t of transportRows) {
      if (!t.requirementDate.trim()) continue;
      const nd = normalizeYmd(t.requirementDate.trim());
      if (!ISO_DATE.test(nd)) {
        Alert.alert(
          "Transport requirement date",
          `Use YYYY-MM-DD for transport "${lookupLabel(lookups.vehicleTypes, t.vehicleTypeId)}" or clear the date.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const inquiry = await client.createInquiry({
        customerName: customerName.trim(),
        customerMobileNumber: phone,
        journeyDate: journeyNormalized,
        locationId,
        numAdults: nAdults,
        numChildrenAbove11: nCh11,
        numChildren5to11: nCh511,
        numChildrenBelow5: nCh5,
        nextFollowUpDate: nextFu || undefined,
        remarks: remarks.trim() || undefined,
        roomAllocations:
          roomRows.length > 0
            ? roomRows.map((r) => ({
                roomTypeId: r.roomTypeId,
                occupancyTypeId: r.occupancyTypeId,
                mealPlanId: r.mealPlanId,
                quantity: Math.max(1, r.quantity),
                guestNames: r.guestNames.trim() || null,
                notes: r.notes.trim() || null,
              }))
            : undefined,
        transportDetails:
          transportRows.length > 0
            ? transportRows.map((t) => {
                const reqRaw = t.requirementDate.trim();
                const req = reqRaw ? normalizeYmd(reqRaw) : null;
                return {
                  vehicleTypeId: t.vehicleTypeId,
                  quantity: Math.max(1, t.quantity),
                  isAirportPickupRequired: t.isAirportPickupRequired,
                  isAirportDropRequired: t.isAirportDropRequired,
                  pickupLocation: t.pickupLocation.trim() || null,
                  dropLocation: t.dropLocation.trim() || null,
                  requirementDate: req,
                  notes: t.notes.trim() || null,
                };
              })
            : undefined,
      });
      router.replace(`/associate/inquiries/${inquiry.id}`);
    } catch (error: unknown) {
      let message = "Please try again.";
      if (error instanceof ApiError) {
        message = error.message;
        const extra = flattenDetailsMessage(error.details);
        if (extra) message = `${message}\n\n${extra}`;
      } else if (error instanceof Error) message = error.message;
      Alert.alert("Create failed", message);
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
      <TextInput
        style={styles.input}
        value={journeyDate}
        onChangeText={setJourneyDate}
        placeholder="2026-05-10"
        placeholderTextColor={Colors.textTertiary}
      />

      <Text style={styles.label}>Next follow-up (optional)</Text>
      <TextInput
        style={styles.input}
        value={nextFollowUpDate}
        onChangeText={setNextFollowUpDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textTertiary}
      />

      <Text style={styles.sectionHeading}>Travellers</Text>
      <Text style={styles.hint}>Match the admin inquiry form (adults + children).</Text>
      <FormNumRow label="Adults" value={numAdults} onChangeText={setNumAdults} />
      <FormNumRow label="Children (12+)" value={numChildrenAbove11} onChangeText={setNumChildrenAbove11} />
      <FormNumRow label="Children (5–11)" value={numChildren5to11} onChangeText={setNumChildren5to11} />
      <FormNumRow label="Children (below 5)" value={numChildrenBelow5} onChangeText={setNumChildrenBelow5} />

      {lookupsLoading ? (
        <View style={styles.lookupsLoading}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.hint}>Loading room & transport options…</Text>
        </View>
      ) : (
        <>
          <RoomAllocationsEditor lookups={lookups} rows={roomRows} onChangeRows={setRoomRows} />
          <TransportDetailsEditor lookups={lookups} rows={transportRows} onChangeRows={setTransportRows} />
        </>
      )}

      <Text style={styles.label}>Destination</Text>
      <Text style={styles.hint}>
        {loadingLocations
          ? "Loading…"
          : `${locations.length} loaded — tap one chip below (${filteredLocations.length} shown)`}
      </Text>
      <TextInput
        style={styles.input}
        value={locationSearch}
        onChangeText={setLocationSearch}
        placeholder="Search destination"
        placeholderTextColor={Colors.textTertiary}
      />
      {loadingLocations ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <View style={styles.locationList}>
          {filteredLocations.map((item) => (
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

function FormNumRow({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={styles.numRow}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        style={styles.numInput}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 32 },
  sectionHeading: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 4 },
  lookupsLoading: {
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  numRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: 6,
  },
  numLabel: { flex: 1, color: Colors.textSecondary, fontWeight: "600", fontSize: FontSize.sm },
  numInput: {
    width: 72,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    color: Colors.text,
    textAlign: "center",
    backgroundColor: Colors.background,
  },
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
