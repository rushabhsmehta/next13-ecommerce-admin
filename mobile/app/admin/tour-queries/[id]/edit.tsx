import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  createTourQueryEditClient,
  type TourQueryEditInput,
} from "@/lib/tour-query-edit";

interface ItineraryRow {
  id: string;
  dayNumber: number | null;
  itineraryTitle: string | null;
  itineraryDescription: string | null;
  mealsIncluded: string | null;
}

interface DetailResponse {
  id: string;
  tourPackageQueryName: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numAdults: string | null;
  numChild5to12: string | null;
  numChild0to5: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  remarks: string | null;
  inclusionsList: string[];
  exclusionsList: string[];
  importantNotesList: string[];
  paymentPolicyList: string[];
  usefulTipList: string[];
  cancellationPolicyList: string[];
  airlineCancellationPolicyList: string[];
  termsconditionsList: string[];
  kitchenGroupPolicyList: string[];
  itineraries: ItineraryRow[];
}

const POLICY_FIELDS: {
  key: keyof TourQueryEditInput;
  listKey: keyof DetailResponse;
  label: string;
}[] = [
  { key: "inclusions", listKey: "inclusionsList", label: "Inclusions" },
  { key: "exclusions", listKey: "exclusionsList", label: "Exclusions" },
  { key: "importantNotes", listKey: "importantNotesList", label: "Important notes" },
  { key: "paymentPolicy", listKey: "paymentPolicyList", label: "Payment policy" },
  { key: "usefulTip", listKey: "usefulTipList", label: "Useful tips" },
  { key: "cancellationPolicy", listKey: "cancellationPolicyList", label: "Cancellation policy" },
  {
    key: "airlineCancellationPolicy",
    listKey: "airlineCancellationPolicyList",
    label: "Airline cancellation policy",
  },
  { key: "termsconditions", listKey: "termsconditionsList", label: "Terms & conditions" },
  { key: "kitchenGroupPolicy", listKey: "kitchenGroupPolicyList", label: "Kitchen / group policy" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

type BaselinePayload = {
  tourPackageQueryName: string;
  customerName: string;
  customerNumber: string;
  numAdults: string;
  numChild512: string;
  numChild05: string;
  tourStartsFrom: string;
  tourEndsOn: string;
  remarks: string;
  policies: Record<string, string>;
  itineraries: ItineraryRow[];
};

function serializeBaseline(p: BaselinePayload): string {
  return JSON.stringify(p);
}

export default function EditTourQueryScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <EditTourQueryScreenInner />
    </PermissionGate>
  );
}

function EditTourQueryScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const editClient = useMemo(
    () => createTourQueryEditClient(authRequest),
    [authRequest]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [numAdults, setNumAdults] = useState("");
  const [numChild512, setNumChild512] = useState("");
  const [numChild05, setNumChild05] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [remarks, setRemarks] = useState("");
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [itineraries, setItineraries] = useState<ItineraryRow[]>([]);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [expandedPolicyKey, setExpandedPolicyKey] = useState<string | null>(null);
  const baselineSerialized = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        const d = await authRequest<DetailResponse>(
          `/api/mobile/tour-queries/${encodeURIComponent(id)}`
        );
        if (cancelled) return;
        setName(d.tourPackageQueryName ?? "");
        setCustomerName(d.customerName ?? "");
        setCustomerNumber(d.customerNumber ?? "");
        setNumAdults(d.numAdults ?? "");
        setNumChild512(d.numChild5to12 ?? "");
        setNumChild05(d.numChild0to5 ?? "");
        setStartsFrom(d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "");
        setEndsOn(d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "");
        setRemarks(d.remarks ?? "");
        const pol: Record<string, string> = {};
        for (const f of POLICY_FIELDS) {
          pol[f.key as string] = ((d[f.listKey] as string[]) ?? []).join("\n");
        }
        const itinerariesInit = (d.itineraries ?? []).map((it) => ({
          id: it.id,
          dayNumber: it.dayNumber,
          itineraryTitle: it.itineraryTitle ?? "",
          itineraryDescription: it.itineraryDescription ?? "",
          mealsIncluded: it.mealsIncluded ?? "",
        }));
        baselineSerialized.current = serializeBaseline({
          tourPackageQueryName: d.tourPackageQueryName ?? "",
          customerName: d.customerName ?? "",
          customerNumber: d.customerNumber ?? "",
          numAdults: d.numAdults ?? "",
          numChild512: d.numChild5to12 ?? "",
          numChild05: d.numChild0to5 ?? "",
          tourStartsFrom: d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "",
          tourEndsOn: d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "",
          remarks: d.remarks ?? "",
          policies: pol,
          itineraries: itinerariesInit,
        });
        setPolicies(pol);
        setItineraries(itinerariesInit);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Could not load query."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, authRequest]);

  const datesOk =
    (!startsFrom || ISO.test(startsFrom)) && (!endsOn || ISO.test(endsOn));

  const datesOrderWarning =
    !!(
      startsFrom &&
      endsOn &&
      ISO.test(startsFrom) &&
      ISO.test(endsOn) &&
      startsFrom > endsOn
    );

  const liveSerialized = useMemo(
    () =>
      serializeBaseline({
        tourPackageQueryName: name,
        customerName,
        customerNumber,
        numAdults,
        numChild512,
        numChild05,
        tourStartsFrom: startsFrom,
        tourEndsOn: endsOn,
        remarks,
        policies,
        itineraries,
      }),
    [
      name,
      customerName,
      customerNumber,
      numAdults,
      numChild512,
      numChild05,
      startsFrom,
      endsOn,
      remarks,
      policies,
      itineraries,
    ]
  );

  const dirty =
    !!baselineSerialized.current && liveSerialized !== baselineSerialized.current;

  const saveBlocked = saving || !datesOk || datesOrderWarning || !dirty;

  const save = useCallback(async () => {
    if (!id || saveBlocked) return;
    setSaving(true);
    try {
      const payload: TourQueryEditInput = {
        tourPackageQueryName: name.trim(),
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        numAdults: numAdults.trim(),
        numChild5to12: numChild512.trim(),
        numChild0to5: numChild05.trim(),
        tourStartsFrom: startsFrom ? startsFrom : null,
        tourEndsOn: endsOn ? endsOn : null,
        remarks: remarks.trim() || null,
        itineraries: itineraries.map((it) => ({
          id: it.id,
          itineraryTitle: it.itineraryTitle ?? "",
          itineraryDescription: it.itineraryDescription ?? "",
          mealsIncluded: it.mealsIncluded ?? "",
        })),
      };
      for (const f of POLICY_FIELDS) {
        payload[f.key] = (policies[f.key as string] ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean) as never;
      }
      await editClient.update(id, payload);
      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save changes."
      );
    } finally {
      setSaving(false);
    }
  }, [
    id,
    saving,
    saveBlocked,
    name,
    customerName,
    customerNumber,
    numAdults,
    numChild512,
    numChild05,
    startsFrom,
    endsOn,
    remarks,
    policies,
    itineraries,
    editClient,
    router,
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Edit trip", headerShown: false }} />
      <AdminHeader
        title="Edit trip"
        subtitle={dirty ? "Unsaved changes" : "All changes saved"}
        onBackPress={() => router.back()}
        testID="tq-edit-header"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionHeading}>Basics</Text>
        <View testID="trip-edit-section-basics">
          <Field label="Trip name" value={name} onChange={setName} />
        </View>

        <Text style={styles.sectionHeading}>Guests and dates</Text>
        <View testID="trip-edit-section-guests">
          <Field
            label="Customer name"
            value={customerName}
            onChange={setCustomerName}
          />
          <Field
            label="Customer number"
            value={customerNumber}
            onChange={setCustomerNumber}
            keyboardType="phone-pad"
          />
          <View style={styles.row3}>
            <Field
              label="Adults"
              value={numAdults}
              onChange={setNumAdults}
              keyboardType="number-pad"
              flex
            />
            <Field
              label="Child 5-12"
              value={numChild512}
              onChange={setNumChild512}
              keyboardType="number-pad"
              flex
            />
            <Field
              label="Child 0-5"
              value={numChild05}
              onChange={setNumChild05}
              keyboardType="number-pad"
              flex
            />
          </View>
          <View style={styles.row2}>
            <Field
              label="Start date"
              value={startsFrom}
              onChange={setStartsFrom}
              flex
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="End date"
              value={endsOn}
              onChange={setEndsOn}
              flex
              placeholder="YYYY-MM-DD"
            />
          </View>
          {!datesOk ? (
            <Text style={styles.helpErr}>Use YYYY-MM-DD for dates.</Text>
          ) : null}
          {datesOrderWarning ?
            (
              <Text style={styles.helpErr}>End date cannot be before start date.</Text>
            )
            : null}
        </View>

        <Text style={styles.sectionHeading}>Remarks</Text>
        <View testID="trip-edit-section-remarks">
          <Field
            label="Trip remarks"
            value={remarks}
            onChange={setRemarks}
            multiline
          />
        </View>

        <Pressable
          testID="trip-edit-section-policies-toggle"
          accessibilityRole="button"
          accessibilityLabel={policiesOpen ? "Hide policies section" : "Show policies section"}
          style={styles.collapsibleHeading}
          onPress={() => setPoliciesOpen((o) => !o)}
        >
          <Text style={[styles.sectionHeading, { flex: 1, marginTop: 0, marginBottom: 0 }]}>
            Policies · one item per line
          </Text>
          <Ionicons
            name={policiesOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textTertiary}
          />
        </Pressable>
        {policiesOpen ? (
          <View testID="trip-edit-section-policies" style={styles.policyWrap}>
            {POLICY_FIELDS.map((f) => {
              const val = policies[f.key as string] ?? "";
              const lines = val.split(/\r?\n/).filter((ln) => ln.trim()).length || 0;
              const expanded = expandedPolicyKey === `pol-${String(f.key)}`;
              return (
                <View key={f.key as string} style={styles.policyCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${expanded ? "Hide" : "Show"} editor for ${f.label}`}
                    style={styles.policyTap}
                    onPress={() =>
                      setExpandedPolicyKey((prev) =>
                        prev === `pol-${String(f.key)}` ? null : `pol-${String(f.key)}`
                      )
                    }
                  >
                    <Text style={styles.policyTapTitle}>{f.label}</Text>
                    <Text style={styles.policyTapHint}>{lines} lines</Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.textTertiary}
                    />
                  </Pressable>
                  {expanded ?
                    (
                      <TextInput
                        style={[styles.input, styles.policyTextarea]}
                        value={val}
                        onChangeText={(t) =>
                          setPolicies((p) => ({ ...p, [f.key as string]: t }))
                        }
                        multiline
                        placeholderTextColor={Colors.textTertiary}
                      />
                    )
                    : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View testID="trip-edit-section-itinerary">
        {itineraries.length === 0 ? (
          <Text style={styles.help}>
            This trip has no itinerary yet. Use the web hotel editor to add stays and transport.
          </Text>
        ) : (
          itineraries.map((it, idx) => (
            <ItineraryDayCard
              key={it.id}
              it={it}
              idx={idx}
              onChange={(next) =>
                setItineraries((arr) =>
                  arr.map((x) => (x.id === next.id ? next : x))
                )
              }
            />
          ))
        )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="tq-edit-save"
          accessibilityRole="button"
          accessibilityLabel="Save trip changes"
          accessibilityHint={
            datesOrderWarning
              ? "Fix date order before saving."
              : !dirty
                ? "Enable after you change a field."
                : "Writes updates to this trip."
          }
          disabled={saveBlocked}
          style={[styles.submit, saveBlocked ? styles.submitDisabled : null]}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>Save changes</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function ItineraryDayCard({
  it,
  idx,
  onChange,
}: {
  it: ItineraryRow;
  idx: number;
  onChange: (next: ItineraryRow) => void;
}) {
  const [descOpen, setDescOpen] = useState(false);
  const plainDesc = String(it.itineraryDescription ?? "").replace(/<[^>]+>/g, "");

  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayLabel}>Day {it.dayNumber ?? idx + 1}</Text>
      <Field
        label="Day title"
        value={it.itineraryTitle ?? ""}
        onChange={(t) => onChange({ ...it, itineraryTitle: t })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={descOpen ? "Hide description editor" : "Show description editor"}
        accessibilityHint="Shows or hides the multiline day description editor."
        style={styles.inlineToggle}
        onPress={() => setDescOpen((o) => !o)}
      >
        <Text style={styles.inlineToggleText}>
          Description {descOpen ? "· hide" : "· expand"}
        </Text>
        <Ionicons
          name={descOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.textTertiary}
        />
      </Pressable>
      {descOpen ?
        (
          <TextInput
            style={[styles.input, styles.textarea]}
            value={plainDesc}
            onChangeText={(t) => onChange({ ...it, itineraryDescription: t })}
            multiline
            placeholder="Plain text..."
            placeholderTextColor={Colors.textTertiary}
          />
        )
        : null}
      <Field
        label="Meals included"
        value={it.mealsIncluded ?? ""}
        onChange={(t) => onChange({ ...it, mealsIncluded: t })}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
  flex,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  flex?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textarea : null]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  errText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  sectionHeading: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  collapsibleHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingRight: 4,
  },
  policyWrap: { gap: Spacing.sm, marginBottom: Spacing.sm },
  policyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  policyTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  policyTapTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  policyTapHint: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textTertiary },
  policyTextarea: { minHeight: 120, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  inlineToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inlineToggleText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: 4 },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  row2: { flexDirection: "row", gap: Spacing.md },
  row3: { flexDirection: "row", gap: Spacing.sm },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginTop: Spacing.xl,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  dayLabel: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
});
