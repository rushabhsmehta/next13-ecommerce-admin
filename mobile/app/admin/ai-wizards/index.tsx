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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import {
  AdminErrorState,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
  AdminWorkflowRail,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { AI_DRAFT_KEYS, storeAiDraft } from "@/lib/ai-wizard-drafts";
import {
  createAiWizardsClient,
  type AiBudgetCategory,
  type AiEntitySummary,
  type AiGroupType,
  type AiItineraryDraft,
  type AiLocationOption,
  type AiTargetType,
} from "@/lib/ai-wizards";

type WizardStep = 1 | 2 | 3;

const GROUPS: { id: AiGroupType; label: string }[] = [
  { id: "family", label: "Family" },
  { id: "couple", label: "Couple" },
  { id: "friends", label: "Friends" },
  { id: "corporate", label: "Corporate" },
  { id: "seniors", label: "Seniors" },
  { id: "solo", label: "Solo" },
];

const BUDGETS: { id: AiBudgetCategory; label: string; hint: string }[] = [
  { id: "budget", label: "Budget", hint: "3-star, shared transfers" },
  { id: "mid-range", label: "Mid", hint: "4-star, private transfers" },
  { id: "premium", label: "Premium", hint: "4–5 star, premium services" },
  { id: "luxury", label: "Luxury", hint: "5-star, exclusive experiences" },
];

const GENERATION_MESSAGES = [
  "Analyzing destination…",
  "Planning activities…",
  "Crafting descriptions…",
  "Finalizing itinerary…",
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

function parseTargetParam(value: string | string[] | undefined): AiTargetType | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "tourPackage" || raw === "tourPackageQuery") return raw;
  return null;
}

function parseApplyToId(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

function AiWizardsInner() {
  const router = useRouter();
  const {
    target: targetParam,
    applyToId: applyToIdParam,
  } = useLocalSearchParams<{ target?: string; applyToId?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createAiWizardsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const initialTarget = parseTargetParam(targetParam);
  const [targetType, setTargetType] = useState<AiTargetType>(
    initialTarget ?? "tourPackage"
  );
  const [step, setStep] = useState<WizardStep>(1);
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
  const [entities, setEntities] = useState<AiEntitySummary[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(parseApplyToId(applyToIdParam));
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [draft, setDraft] = useState<AiItineraryDraft | null>(null);
  const [tokenUsage, setTokenUsage] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [busy, setBusy] = useState<"generate" | "refine" | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const parsed = parseTargetParam(targetParam);
    if (parsed) setTargetType(parsed);
  }, [targetParam]);

  useEffect(() => {
    const id = parseApplyToId(applyToIdParam);
    if (id) setSelectedEntityId(id);
  }, [applyToIdParam]);

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

  useEffect(() => {
    if (!locationId) {
      setEntities([]);
      return;
    }
    let alive = true;
    setEntitiesLoading(true);
    client
      .listEntitiesForLocation(targetType, locationId)
      .then((rows) => {
        if (!alive) return;
        setEntities(rows);
        if (selectedEntityId && !rows.some((r) => r.id === selectedEntityId)) {
          setSelectedEntityId("");
        }
      })
      .catch(() => {
        if (alive) setEntities([]);
      })
      .finally(() => {
        if (alive) setEntitiesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [client, locationId, targetType, selectedEntityId]);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const destinationLabel = selectedLocation?.label ?? "";
  const selectedEntity = entities.find((e) => e.id === selectedEntityId);
  const entityLabel = targetType === "tourPackageQuery" ? "query" : "package";
  const canGenerate = !!locationId && Number(days) >= 1 && Number(nights) >= 1;

  const generate = useCallback(async () => {
    if (!canGenerate) {
      Alert.alert("Choose destination", "Select a location and duration before generating.");
      return;
    }
    setBusy("generate");
    setError(null);
    setGenerationError(null);
    setStep(2);
    setProgress(0);
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 500);
    try {
      const result = await client.generate({
        destination: destinationLabel,
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
      clearInterval(tick);
      setProgress(100);
      setDraft(result.data);
      setRefinePrompt("");
      setTokenUsage(() => {
        const total =
          (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0);
        return total > 0 ? total : null;
      });
      setTimeout(() => setStep(3), 400);
      if (result.fidelityWarnings?.length) {
        Alert.alert("Review pasted content", result.fidelityWarnings.join("\n"));
      } else if (result.strictSource) {
        Alert.alert(
          "Structured from your paste",
          "Output follows pasted content only. Review each day before saving."
        );
      }
    } catch (err) {
      clearInterval(tick);
      setProgress(0);
      const message =
        err instanceof ApiError && err.status === 429
          ? "AI generation limit reached. Please wait a minute and try again."
          : err instanceof ApiError
            ? err.message
            : "Could not generate itinerary.";
      setGenerationError(message);
      setError(message);
    } finally {
      setBusy(null);
    }
  }, [
    budgetCategory,
    canGenerate,
    client,
    customerName,
    days,
    destinationLabel,
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

  const handleCreateNew = useCallback(async () => {
    if (!draft || !locationId) return;
    const key =
      targetType === "tourPackageQuery"
        ? AI_DRAFT_KEYS.queryCreate
        : AI_DRAFT_KEYS.packageCreate;
    await storeAiDraft(key, { locationId, data: draft });
    if (targetType === "tourPackageQuery") {
      router.push(`/admin/tour-queries/new?locationId=${encodeURIComponent(locationId)}` as never);
    } else {
      router.push(
        `/admin/operations/tour-packages/new?locationId=${encodeURIComponent(locationId)}` as never
      );
    }
  }, [draft, locationId, router, targetType]);

  const handleApplyExisting = useCallback(async () => {
    if (!draft || !locationId || !selectedEntityId) {
      Alert.alert(
        "Select existing record",
        `Choose an existing tour ${entityLabel} to apply this itinerary to.`
      );
      return;
    }
    const key =
      targetType === "tourPackageQuery"
        ? AI_DRAFT_KEYS.queryApply
        : AI_DRAFT_KEYS.packageApply;
    await storeAiDraft(key, { locationId, data: draft });
    if (targetType === "tourPackageQuery") {
      router.push(`/admin/tour-queries/${selectedEntityId}/edit` as never);
    } else {
      router.push(`/admin/operations/tour-packages/${selectedEntityId}` as never);
    }
  }, [draft, entityLabel, locationId, router, selectedEntityId, targetType]);

  const startOver = useCallback(() => {
    setDraft(null);
    setStep(1);
    setGenerationError(null);
    setProgress(0);
    setTokenUsage(null);
    setExpandedDays({});
  }, []);

  async function shareDraft() {
    if (!draft) return;
    const lines = [
      draft.tourPackageName,
      draft.numDaysNight,
      draft.transport ? `Transport: ${draft.transport}` : "",
      "",
      ...(draft.itineraries ?? []).map(
        (day, index) =>
          `Day ${day.dayNumber ?? index + 1}: ${day.itineraryTitle ?? ""}\n${day.itineraryDescription ?? ""}`
      ),
    ].filter(Boolean);
    await Share.share({ title: draft.tourPackageName, message: lines.join("\n") });
  }

  const progressMessage =
    progress < 30
      ? GENERATION_MESSAGES[0]
      : progress < 60
        ? GENERATION_MESSAGES[1]
        : progress < 90
          ? GENERATION_MESSAGES[2]
          : GENERATION_MESSAGES[3];

  const screenTitle =
    targetType === "tourPackageQuery" ? "AI Query Wizard" : "AI Package Wizard";

  return (
    <AdminScreen
      testID="ai-wizards-screen"
      bottomInset={Spacing.xl}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />
      <AdminTopBar
        title={screenTitle}
        subtitle="Generate, refine, then open in editor"
        onBackPress={() => router.back()}
        testID="ai-wizards-header"
      />
      <AdminWorkflowRail
        testID="ai-step-rail"
        steps={[
          { id: "details", label: "Details", done: step > 1, active: step === 1 },
          { id: "generate", label: "Generate", done: step > 2, active: step === 2 },
          { id: "review", label: "Review", done: step === 3 && !!draft, active: step === 3 },
        ]}
      />

      {error && step !== 2 ? (
        <AdminErrorState message={error} testID="ai-wizards-error" />
      ) : null}

      {step === 1 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Trip details</Text>
          <View style={styles.twoCol}>
            <SegmentButton
              label="Package"
              selected={targetType === "tourPackage"}
              testID="ai-target-package"
              onPress={() => {
                setTargetType("tourPackage");
                setSelectedEntityId("");
              }}
            />
            <SegmentButton
              label="Query"
              selected={targetType === "tourPackageQuery"}
              testID="ai-target-query"
              onPress={() => {
                setTargetType("tourPackageQuery");
                setSelectedEntityId("");
              }}
            />
          </View>

          <Pressable
            testID="ai-location-picker"
            accessibilityRole="button"
            accessibilityLabel="Destination location"
            style={styles.pickerButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.fieldLabel}>Destination</Text>
            <Text style={destinationLabel ? styles.pickerValue : styles.pickerPlaceholder}>
              {destinationLabel || "Select location"}
            </Text>
          </Pressable>

          <Pressable
            testID="ai-entity-picker"
            accessibilityRole="button"
            accessibilityLabel={`Apply to existing ${entityLabel}`}
            style={styles.pickerButton}
            onPress={() => setShowEntityPicker(true)}
            disabled={!locationId || entitiesLoading}
          >
            <Text style={styles.fieldLabel}>Apply to existing (optional)</Text>
            <Text
              style={
                selectedEntity ? styles.pickerValue : styles.pickerPlaceholder
              }
            >
              {entitiesLoading
                ? "Loading…"
                : selectedEntity
                  ? selectedEntity.tourPackageName
                  : entities.length
                    ? `Create new ${entityLabel}`
                    : `No ${entityLabel}s at this location`}
            </Text>
          </Pressable>

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
          <View style={styles.budgetList}>
            {BUDGETS.map((option) => (
              <Pressable
                key={option.id}
                testID={`ai-budget-${option.id}`}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: budgetCategory === option.id }}
                style={[
                  styles.budgetCard,
                  budgetCategory === option.id ? styles.budgetCardActive : null,
                ]}
                onPress={() => setBudgetCategory(option.id)}
              >
                <Text style={styles.budgetLabel}>{option.label}</Text>
                <Text style={styles.budgetHint}>{option.hint}</Text>
              </Pressable>
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
          <Text style={styles.helperText}>
            When you paste content here, generation follows your text strictly. Leave empty to
            invent a new itinerary from destination and duration.
          </Text>

          <Pressable
            testID="ai-generate"
            accessibilityRole="button"
            accessibilityLabel="Generate itinerary"
            accessibilityState={{ disabled: !canGenerate || busy !== null }}
            disabled={!canGenerate || busy !== null}
            style={[styles.primaryButton, !canGenerate || busy ? styles.disabled : null]}
            onPress={() => void generate()}
          >
            <Ionicons name="sparkles-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Generate itinerary</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.panel} testID="ai-generating-panel">
          <View style={styles.generatingIconWrap}>
            <Ionicons
              name="sparkles"
              size={32}
              color={generationError ? Colors.error : Colors.primary}
            />
          </View>
          <Text style={styles.panelTitle}>
            {generationError ? "Generation failed" : "Creating your itinerary"}
          </Text>
          <Text style={styles.generatingSubtitle}>
            {generationError ?? "Our AI is crafting a personalized travel experience"}
          </Text>
          {!generationError ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressPct}>{progress}%</Text>
              <Text style={styles.progressMsg}>{progressMessage}</Text>
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
            </>
          ) : (
            <>
              <Pressable
                testID="ai-retry-generate"
                style={styles.primaryButton}
                onPress={() => void generate()}
              >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
              <Pressable
                testID="ai-back-to-details"
                style={styles.secondaryButton}
                onPress={() => {
                  setGenerationError(null);
                  setStep(1);
                }}
              >
                <Text style={styles.secondaryButtonText}>Back to details</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {step === 3 && draft ? (
        <View style={styles.panel} testID="ai-review-panel">
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>{draft.tourPackageName}</Text>
              <View style={styles.badgeRow}>
                <Badge text={draft.numDaysNight || `${nights}N/${days}D`} />
                {draft.tourPackageType ? <Badge text={draft.tourPackageType} /> : null}
                {draft.transport ? <Badge text={draft.transport} /> : null}
              </View>
            </View>
            <View style={styles.reviewActions}>
              {tokenUsage != null ? (
                <Text style={styles.tokenText}>{tokenUsage} tokens</Text>
              ) : null}
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
          </View>

          {Array.isArray(draft.highlights) && draft.highlights.length ? (
            <View style={styles.highlightBox}>
              <Text style={styles.sectionLabel}>Highlights</Text>
              <View style={styles.wrapRail}>
                {draft.highlights.map((highlight, index) => (
                  <Badge key={`${highlight}-${index}`} text={highlight} />
                ))}
              </View>
            </View>
          ) : null}

          {draft.estimatedBudget && typeof draft.estimatedBudget === "object" ? (
            <View style={styles.budgetEstimate}>
              <Text style={styles.sectionLabel}>Estimated budget</Text>
              <Text style={styles.budgetTotal}>
                {String((draft.estimatedBudget as { total?: string }).total ?? "—")}
              </Text>
              <Text style={styles.budgetPerPerson}>
                {String((draft.estimatedBudget as { perPerson?: string }).perPerson ?? "")}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Itinerary preview</Text>
          <View style={styles.dayList}>
            {(draft.itineraries ?? []).map((day, index) => {
              const dayNum = day.dayNumber ?? index + 1;
              const expanded = expandedDays[dayNum] ?? false;
              return (
                <View key={`${dayNum}-${day.itineraryTitle ?? ""}`} style={styles.dayCard}>
                  <Pressable
                    testID={`ai-day-${dayNum}-toggle`}
                    accessibilityRole="button"
                    onPress={() =>
                      setExpandedDays((prev) => ({ ...prev, [dayNum]: !expanded }))
                    }
                  >
                    <Text style={styles.dayTitle}>
                      Day {dayNum}: {day.itineraryTitle ?? "Untitled day"}
                    </Text>
                  </Pressable>
                  <Text style={styles.dayDescription} numberOfLines={expanded ? undefined : 3}>
                    {day.itineraryDescription ?? "No description"}
                  </Text>
                  <View style={styles.badgeRow}>
                    {day.mealsIncluded ? <Badge text={day.mealsIncluded} /> : null}
                    {day.suggestedHotel ? <Badge text={`🏨 ${day.suggestedHotel}`} /> : null}
                  </View>
                  {expanded && (day.activities ?? []).length > 0 ? (
                    <View style={styles.activityList}>
                      {(day.activities ?? []).map((act, actIndex) => (
                        <View key={`act-${actIndex}`} style={styles.activityCard}>
                          <Text style={styles.activityTitle}>
                            {act.activityTitle || `Activity ${actIndex + 1}`}
                          </Text>
                          {act.activityDescription ? (
                            <Text style={styles.activityDesc}>{act.activityDescription}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Modify with AI</Text>
          <TextInput
            testID="ai-refine-prompt"
            accessibilityLabel="Refinement instructions"
            style={[styles.input, styles.multilineInput]}
            value={refinePrompt}
            onChangeText={setRefinePrompt}
            placeholder="e.g. Day 2 only: change hotel to Taj Jai Mahal"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          <Pressable
            testID="ai-refine"
            accessibilityRole="button"
            accessibilityLabel="Refine itinerary"
            disabled={busy !== null || !refinePrompt.trim()}
            style={[styles.secondaryButton, busy || !refinePrompt.trim() ? styles.disabled : null]}
            onPress={() => void refine()}
          >
            {busy === "refine" ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Ionicons name="color-wand-outline" size={17} color={Colors.primary} />
            )}
            <Text style={styles.secondaryButtonText}>Update itinerary</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>What would you like to do?</Text>
          {selectedEntity ? (
            <Pressable
              testID="ai-apply-existing"
              accessibilityRole="button"
              accessibilityLabel={`Apply to ${selectedEntity.tourPackageName}`}
              disabled={busy !== null}
              style={[styles.primaryButton, busy ? styles.disabled : null]}
              onPress={() => void handleApplyExisting()}
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                Apply to &quot;{selectedEntity.tourPackageName}&quot;
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="ai-create-new"
            accessibilityRole="button"
            accessibilityLabel={`Create new ${entityLabel}`}
            disabled={busy !== null}
            style={[
              selectedEntity ? styles.secondaryButton : styles.primaryButton,
              busy ? styles.disabled : null,
            ]}
            onPress={() => void handleCreateNew()}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={selectedEntity ? Colors.primary : "#fff"}
            />
            <Text
              style={
                selectedEntity ? styles.secondaryButtonText : styles.primaryButtonText
              }
            >
              Create new {targetType === "tourPackageQuery" ? "query" : "package"}
            </Text>
          </Pressable>
          <Pressable
            testID="ai-regenerate"
            accessibilityRole="button"
            accessibilityLabel="Regenerate itinerary"
            style={styles.ghostButton}
            onPress={() => {
              setDraft(null);
              setStep(2);
              void generate();
            }}
          >
            <Text style={styles.ghostButtonText}>Regenerate</Text>
          </Pressable>
          <Pressable
            testID="ai-start-over"
            accessibilityRole="button"
            accessibilityLabel="Start over"
            style={styles.ghostButton}
            onPress={startOver}
          >
            <Text style={styles.ghostButtonText}>Start over</Text>
          </Pressable>
        </View>
      ) : null}

      <AdminPickerSheet
        visible={showLocationPicker}
        title="Destination"
        testID="ai-location-sheet"
        options={locations.map((l) => ({ id: l.id, label: l.label }))}
        selectedId={locationId}
        onSelect={(opt) => {
          setLocationId(opt.id);
          setSelectedEntityId("");
          setShowLocationPicker(false);
        }}
        onClose={() => setShowLocationPicker(false)}
      />

      <AdminPickerSheet
        visible={showEntityPicker}
        title={`Existing ${entityLabel}`}
        testID="ai-entity-sheet"
        options={[
          { id: "", label: `Create new ${entityLabel}` },
          ...entities.map((e) => ({
            id: e.id,
            label: e.tourPackageName,
            subtitle: [e.numDaysNight, e.tourPackageType].filter(Boolean).join(" · "),
          })),
        ]}
        selectedId={selectedEntityId}
        onSelect={(opt) => {
          setSelectedEntityId(opt.id);
          setShowEntityPicker(false);
        }}
        onClose={() => setShowEntityPicker(false)}
      />
    </AdminScreen>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
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
  sectionLabel: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  helperText: { fontSize: FontSize.xs, color: Colors.textTertiary, lineHeight: 18 },
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
  pickerButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
    gap: 4,
  },
  pickerValue: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  pickerPlaceholder: { fontSize: FontSize.sm, color: Colors.textTertiary },
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
  budgetList: { gap: Spacing.xs },
  budgetCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  budgetCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  budgetLabel: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  budgetHint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
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
  ghostButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  reviewActions: { alignItems: "flex-end", gap: 4 },
  tokenText: { fontSize: FontSize.xs, color: Colors.textTertiary },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "700" },
  highlightBox: { gap: Spacing.sm },
  budgetEstimate: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
    gap: 4,
  },
  budgetTotal: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  budgetPerPerson: { fontSize: FontSize.sm, color: Colors.textSecondary },
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
  activityList: { gap: Spacing.xs, marginTop: 4 },
  activityCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  activityTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  activityDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  generatingIconWrap: {
    alignSelf: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
  },
  generatingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    overflow: "hidden",
    marginTop: Spacing.md,
  },
  progressFill: { height: "100%", backgroundColor: Colors.primary },
  progressPct: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  progressMsg: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
  },
});
