import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import {
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminWorkflowRail,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createAiWizardsClient,
  type AiBudgetCategory,
  type AiGroupType,
  type AiItineraryDraft,
  type AiLocationOption,
  type AiTargetType,
} from "@/lib/ai-wizards";

const GROUPS: { id: AiGroupType; label: string }[] = [
  { id: "family", label: "Family" },
  { id: "couple", label: "Couple" },
  { id: "friends", label: "Friends" },
  { id: "corporate", label: "Corporate" },
  { id: "seniors", label: "Seniors" },
  { id: "solo", label: "Solo" },
];

const BUDGETS: { id: AiBudgetCategory; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "mid-range", label: "Mid" },
  { id: "premium", label: "Premium" },
  { id: "luxury", label: "Luxury" },
];

export default function AiWizardsScreen() {
  return (
    <PermissionGate permission="aiWizards.write">
      <OfflineGate policy="online_only">
        <AiWizardsInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function AiWizardsInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createAiWizardsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [targetType, setTargetType] = useState<AiTargetType>("tourPackage");
  const [destination, setDestination] = useState("");
  const [nights, setNights] = useState("3");
  const [days, setDays] = useState("4");
  const [groupType, setGroupType] = useState<AiGroupType>("family");
  const [budgetCategory, setBudgetCategory] = useState<AiBudgetCategory>("mid-range");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numAdults, setNumAdults] = useState("2");
  const [numChildren, setNumChildren] = useState("0");
  const [locations, setLocations] = useState<AiLocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [draft, setDraft] = useState<AiItineraryDraft | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [busy, setBusy] = useState<"generate" | "refine" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    client
      .listLocations()
      .then((rows) => {
        if (!alive) return;
        setLocations(rows);
        if (!locationId && rows[0]) setLocationId(rows[0].id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [client, locationId]);

  const canGenerate = destination.trim().length > 0 && Number(days) >= 1 && Number(nights) >= 1;
  const dayPreview = draft?.itineraries ?? [];

  const generate = useCallback(async () => {
    if (!canGenerate) {
      Alert.alert("Add destination", "Enter destination and duration before generating.");
      return;
    }
    setBusy("generate");
    setError(null);
    try {
      const result = await client.generate({
        destination: destination.trim(),
        duration: {
          nights: Math.max(1, Number.parseInt(nights, 10) || 1),
          days: Math.max(1, Number.parseInt(days, 10) || 1),
        },
        groupType,
        budgetCategory,
        specialRequirements: specialRequirements.trim() || undefined,
        targetType,
        customerName: targetType === "tourPackageQuery" ? customerName.trim() || undefined : undefined,
        startDate: targetType === "tourPackageQuery" ? startDate.trim() || undefined : undefined,
        numAdults: targetType === "tourPackageQuery" ? Number.parseInt(numAdults, 10) || 2 : undefined,
        numChildren: targetType === "tourPackageQuery" ? Number.parseInt(numChildren, 10) || 0 : undefined,
      });
      setDraft(result.data);
      setRefinePrompt("");
      if (result.fidelityWarnings?.length) {
        Alert.alert("Review pasted content", result.fidelityWarnings.join("\n"));
      } else if (result.strictSource) {
        Alert.alert(
          "Structured from your paste",
          "Output follows pasted content only. Review each day before saving."
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate itinerary.");
    } finally {
      setBusy(null);
    }
  }, [
    budgetCategory,
    canGenerate,
    client,
    customerName,
    days,
    destination,
    groupType,
    nights,
    numAdults,
    numChildren,
    specialRequirements,
    startDate,
    targetType,
  ]);

  const refine = useCallback(async () => {
    if (!draft) return;
    if (!refinePrompt.trim()) {
      Alert.alert("Add instructions", "Tell Aagam AI what to change.");
      return;
    }
    setBusy("refine");
    setError(null);
    try {
      const result = await client.refine(draft, refinePrompt.trim());
      setDraft(result.data);
      setRefinePrompt("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refine itinerary.");
    } finally {
      setBusy(null);
    }
  }, [client, draft, refinePrompt]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    if (!locationId) {
      Alert.alert("Choose location", "Select the back-office location this draft belongs to.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const saved = await client.saveDraft({ targetType, locationId, draft });
      if (targetType === "tourPackageQuery") {
        router.replace(`/admin/tour-queries/${saved.id}/edit` as never);
      } else {
        Alert.alert("Package draft saved", "The package is saved as an unpublished website draft.");
        router.replace("/admin/website" as never);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this draft.");
    } finally {
      setBusy(null);
    }
  }, [client, draft, locationId, router, targetType]);

  async function shareDraft() {
    if (!draft) return;
    const lines = [
      draft.tourPackageName,
      draft.numDaysNight,
      draft.estimatedBudget && typeof draft.estimatedBudget === "object"
        ? `Budget: ${String((draft.estimatedBudget as any).perPerson ?? (draft.estimatedBudget as any).total ?? "")}`
        : "",
      "",
      ...(draft.itineraries ?? []).map(
        (day, index) => `Day ${day.dayNumber ?? index + 1}: ${day.itineraryTitle ?? ""}`
      ),
    ].filter(Boolean);
    await Share.share({ title: draft.tourPackageName, message: lines.join("\n") });
  }

  return (
    <AdminScreen
      testID="ai-wizards-screen"
      bottomInset={Spacing.xl}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: "AI Wizards", headerShown: false }} />
      <AdminTopBar
        title="AI Wizards"
        subtitle="Generate, refine, review, save"
        onBackPress={() => router.back()}
        testID="ai-wizards-header"
      />
      <AdminWorkflowRail
        testID="ai-step-rail"
        steps={[
          { id: "generate", label: "Generate", done: canGenerate, active: !draft },
          { id: "review", label: "Review", done: !!draft, active: !!draft },
          { id: "save", label: "Save", done: !!draft && !!locationId, active: !!draft },
        ]}
      />

      {error ? (
        <AdminErrorState message={error} testID="ai-wizards-error" />
      ) : null}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Output</Text>
          <View style={styles.twoCol}>
            <SegmentButton
              label="Package"
              selected={targetType === "tourPackage"}
              testID="ai-target-package"
              onPress={() => setTargetType("tourPackage")}
            />
            <SegmentButton
              label="Query"
              selected={targetType === "tourPackageQuery"}
              testID="ai-target-query"
              onPress={() => setTargetType("tourPackageQuery")}
            />
          </View>

          <Field
            testID="ai-destination"
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="Kerala, Bali, Kashmir..."
          />

          <View style={styles.twoCol}>
            <Field
              testID="ai-nights"
              label="Nights"
              value={nights}
              onChangeText={setNights}
              keyboardType="number-pad"
            />
            <Field
              testID="ai-days"
              label="Days"
              value={days}
              onChangeText={setDays}
              keyboardType="number-pad"
            />
          </View>

          <Text style={styles.fieldLabel}>Group</Text>
          <View style={styles.wrapRail}>
            {GROUPS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={groupType === option.id}
                testID={`ai-group-${option.id}`}
                onPress={() => setGroupType(option.id)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Budget</Text>
          <View style={styles.wrapRail}>
            {BUDGETS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={budgetCategory === option.id}
                testID={`ai-budget-${option.id}`}
                onPress={() => setBudgetCategory(option.id)}
              />
            ))}
          </View>

          {targetType === "tourPackageQuery" ? (
            <>
              <Field
                testID="ai-customer-name"
                label="Customer"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Customer name"
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Start date</Text>
                <DateField
                  testID="ai-start-date"
                  accessibilityLabel="Start date"
                  style={styles.input}
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Choose start date"
                />
              </View>
              <View style={styles.twoCol}>
                <Field
                  testID="ai-adults"
                  label="Adults"
                  value={numAdults}
                  onChangeText={setNumAdults}
                  keyboardType="number-pad"
                />
                <Field
                  testID="ai-children"
                  label="Children"
                  value={numChildren}
                  onChangeText={setNumChildren}
                  keyboardType="number-pad"
                />
              </View>
            </>
          ) : null}

          <Field
            testID="ai-special-requirements"
            label="Pasted itinerary"
            value={specialRequirements}
            onChangeText={setSpecialRequirements}
            placeholder="Paste full day-wise text. AI structures it exactly — no added or removed days."
            multiline
          />

          <Pressable
            testID="ai-generate"
            accessibilityRole="button"
            accessibilityLabel="Generate itinerary"
            accessibilityState={{ disabled: !canGenerate || busy !== null }}
            disabled={!canGenerate || busy !== null}
            style={[styles.primaryButton, !canGenerate || busy ? styles.disabled : null]}
            onPress={() => void generate()}
          >
            {busy === "generate" ? <ActivityIndicator color="#fff" /> : <Ionicons name="sparkles-outline" size={18} color="#fff" />}
            <Text style={styles.primaryButtonText}>Generate</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {draft ? (
          <View style={styles.panel} testID="ai-review-panel">
            <View style={styles.reviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>{draft.tourPackageName}</Text>
                <Text style={styles.reviewMeta}>
                  {draft.numDaysNight || `${nights} Nights / ${days} Days`} - {draft.tourPackageType || "AI Draft"}
                </Text>
              </View>
              <Pressable
                testID="ai-share-draft"
                accessibilityRole="button"
                accessibilityLabel="Share AI draft"
                style={styles.iconButton}
                onPress={() => void shareDraft()}
              >
                <Ionicons name="share-outline" size={18} color={Colors.text} />
              </Pressable>
            </View>

            {Array.isArray(draft.highlights) && draft.highlights.length ? (
              <View style={styles.highlightBox}>
                {draft.highlights.slice(0, 5).map((highlight, index) => (
                  <Text key={`${highlight}-${index}`} style={styles.highlightText}>
                    {highlight}
                  </Text>
                ))}
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Refine before saving (exact changes only)</Text>
            <TextInput
              testID="ai-refine-prompt"
              accessibilityLabel="Refinement instructions"
              style={[styles.input, styles.multilineInput]}
              value={refinePrompt}
              onChangeText={setRefinePrompt}
              placeholder="e.g. Day 2 only: change hotel to Taj Jai Mahal — other days stay unchanged"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
            <Pressable
              testID="ai-refine"
              accessibilityRole="button"
              accessibilityLabel="Refine itinerary"
              accessibilityState={{ disabled: busy !== null || !refinePrompt.trim() }}
              disabled={busy !== null || !refinePrompt.trim()}
              style={[styles.secondaryButton, busy || !refinePrompt.trim() ? styles.disabled : null]}
              onPress={() => void refine()}
            >
              {busy === "refine" ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="color-wand-outline" size={17} color={Colors.primary} />}
              <Text style={styles.secondaryButtonText}>Refine</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Save to location</Text>
            <View style={styles.wrapRail}>
              {locations.map((location) => (
                <Chip
                  key={location.id}
                  label={location.label}
                  selected={locationId === location.id}
                  testID={`ai-location-${location.id}`}
                  onPress={() => setLocationId(location.id)}
                />
              ))}
            </View>

            <View style={styles.dayList}>
              {dayPreview.map((day, index) => (
                <View key={`${day.dayNumber ?? index}-${day.itineraryTitle ?? ""}`} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>
                    Day {day.dayNumber ?? index + 1}: {day.itineraryTitle ?? "Untitled day"}
                  </Text>
                  <Text style={styles.dayDescription} numberOfLines={5}>
                    {day.itineraryDescription ?? "No description"}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              testID="ai-save-draft"
              accessibilityRole="button"
              accessibilityLabel="Save reviewed AI draft"
              accessibilityState={{ disabled: busy !== null || !locationId }}
              disabled={busy !== null || !locationId}
              style={[styles.primaryButton, busy || !locationId ? styles.disabled : null]}
              onPress={() => void saveDraft()}
            >
              {busy === "save" ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
              <Text style={styles.primaryButtonText}>Save reviewed draft</Text>
            </Pressable>
          </View>
        ) : null}
    </AdminScreen>
  );
}

function Field({
  label,
  testID,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  testID: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={[styles.input, multiline ? styles.multilineInput : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.segmentButton, selected ? styles.segmentButtonActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.segmentButtonText, selected ? styles.segmentButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.chipActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  panelTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  twoCol: { flexDirection: "row", gap: Spacing.sm },
  field: { gap: 6, flex: 1 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  input: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  multilineInput: { minHeight: 92, textAlignVertical: "top" },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  segmentButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  segmentButtonText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.textSecondary },
  segmentButtonTextActive: { color: Colors.textInverse },
  wrapRail: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  chipText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  primaryButton: {
    minHeight: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: { color: Colors.textInverse, fontSize: FontSize.sm, fontWeight: "900" },
  secondaryButton: {
    minHeight: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  errorCard: {
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  reviewMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  highlightBox: {
    gap: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
  },
  highlightText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "700", lineHeight: 19 },
  dayList: { gap: Spacing.sm },
  dayCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 6,
    backgroundColor: Colors.surfaceAlt,
  },
  dayTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  dayDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
