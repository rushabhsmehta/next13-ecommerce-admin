import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import {
  AdminBottomActionBar,
  AdminErrorState,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
  AdminWorkflowRail,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { downloadAndSharePdf } from "@/lib/pdf-download";
import { resolveTourQueryLabel } from "@/lib/tour-query-label";
import {
  createSmartQueryBuildClient,
  type SmartBuildPrefill,
  type SmartBuildRoomAllocation,
  type SmartBuildTransportDetail,
} from "@/lib/smart-query-build";

type Step = "package" | "rooms" | "transport" | "review";

const STEPS: Step[] = ["package", "rooms", "transport", "review"];

export default function SmartBuildScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <SmartBuildInner />
    </PermissionGate>
  );
}

function SmartBuildInner() {
  const router = useRouter();
  const { inquiryId } = useLocalSearchParams<{ inquiryId?: string }>();
  const resolvedInquiryId = typeof inquiryId === "string" ? inquiryId : "";
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("salesTrips.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createSmartQueryBuildClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [step, setStep] = useState<Step>("package");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<SmartBuildPrefill | null>(null);
  const [tourPackageId, setTourPackageId] = useState("");
  const [mealPlanId, setMealPlanId] = useState("");
  const [roomAllocations, setRoomAllocations] = useState<SmartBuildRoomAllocation[]>([]);
  const [transportDetails, setTransportDetails] = useState<SmartBuildTransportDetail[]>([]);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [priceLines, setPriceLines] = useState<string[]>([]);
  const [queryNumber, setQueryNumber] = useState("");
  const [picker, setPicker] = useState<
    "package" | "mealPlan" | "roomType" | "occupancy" | "vehicle" | null
  >(null);
  const [pickerRowIndex, setPickerRowIndex] = useState(0);

  const load = useCallback(async () => {
    if (!resolvedInquiryId) {
      setError("Missing inquiry id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await client.loadPrefill(resolvedInquiryId);
      setPrefill(data);
      setRoomAllocations(data.suggestedRoomAllocations);
      setTransportDetails(data.suggestedTransport);
      if (data.lookups.mealPlans[0]) setMealPlanId(data.lookups.mealPlans[0].id);
      setQueryNumber(`TPQ-${Date.now()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load smart build data.");
    } finally {
      setLoading(false);
    }
  }, [client, resolvedInquiryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPackage = prefill?.tourPackages.find((p) => p.id === tourPackageId);

  const canNextFromPackage =
    !!tourPackageId &&
    !!mealPlanId &&
    !!selectedPackage &&
    selectedPackage.validationErrors.length === 0;

  const canNextFromRooms = roomAllocations.every(
    (row) =>
      row.occupancyTypeId &&
      row.quantity >= 1 &&
      (row.useCustomRoomType ? (row.customRoomType || "").trim().length > 0 : !!row.roomTypeId)
  );

  const runPriceCalc = useCallback(async () => {
    if (!prefill || !tourPackageId || !mealPlanId || !canNextFromRooms) return;
    setCalculating(true);
    try {
      const result = await client.calculatePrice({
        inquiryId: prefill.inquiry.id,
        tourPackageId,
        mealPlanId,
        roomAllocations,
      });
      setTotalPrice(result.totalPrice);
      setPriceLines(result.lines?.map((line) => line.description) ?? []);
      if (result.error) {
        Alert.alert("Pricing", result.error);
      }
    } catch (err) {
      Alert.alert(
        "Pricing",
        err instanceof ApiError ? err.message : "Could not calculate price."
      );
    } finally {
      setCalculating(false);
    }
  }, [canNextFromRooms, client, mealPlanId, prefill, roomAllocations, tourPackageId]);

  useEffect(() => {
    if (step === "review" && totalPrice == null && !calculating) {
      void runPriceCalc();
    }
  }, [step, totalPrice, calculating, runPriceCalc]);

  async function submit(downloadPdfAfter = false) {
    if (!prefill || !canWrite || !canNextFromPackage || !canNextFromRooms) return;
    setSubmitting(true);
    try {
      const created = await client.create({
        inquiryId: prefill.inquiry.id,
        tourPackageId,
        mealPlanId,
        roomAllocations,
        transportDetails,
        totalPrice,
        tourPackageQueryNumber: queryNumber.trim() || undefined,
      });
      if (downloadPdfAfter) {
        try {
          await downloadAndSharePdf({
            endpoint: `/api/mobile/tour-queries/${encodeURIComponent(created.id)}/pdf`,
            fileName: resolveTourQueryLabel(created, "tour-query"),
            getToken: () => getTokenRef.current(),
            dialogTitle: "Share tour query PDF",
          });
        } catch (pdfErr) {
          Alert.alert(
            "Query created",
            pdfErr instanceof ApiError
              ? `${pdfErr.message} Open the query to download the PDF later.`
              : "PDF download failed. Open the query to download later."
          );
        }
      }
      router.replace(`/admin/tour-queries/${created.id}/edit` as never);
    } catch (err) {
      Alert.alert(
        "Create failed",
        err instanceof ApiError ? err.message : "Could not create tour package query."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step === "package" && canNextFromPackage) setStep("rooms");
    else if (step === "rooms" && canNextFromRooms) setStep("transport");
    else if (step === "transport") setStep("review");
  }

  function goBackStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
    else router.back();
  }

  if (loading) {
    return (
      <AdminScreen testID="smart-build-screen">
        <Stack.Screen options={{ title: "Smart Build", headerShown: false }} />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </AdminScreen>
    );
  }

  if (error || !prefill) {
    return (
      <AdminScreen testID="smart-build-screen">
        <Stack.Screen options={{ title: "Smart Build", headerShown: false }} />
        <AdminTopBar title="Smart Build" onBackPress={() => router.back()} testID="smart-build-header" />
        <AdminErrorState message={error ?? "Could not load inquiry."} onRetry={() => void load()} testID="smart-build-error" />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen testID="smart-build-screen" bottomInset={96}>
      <Stack.Screen options={{ title: "Smart Build", headerShown: false }} />
      <AdminTopBar
        title="Smart Build"
        subtitle={prefill.inquiry.customerName}
        onBackPress={goBackStep}
        testID="smart-build-header"
      />
      <AdminWorkflowRail
        testID="smart-build-step-rail"
        steps={[
          { id: "package", label: "Package", done: canNextFromPackage, active: step === "package" },
          { id: "rooms", label: "Rooms", done: canNextFromRooms, active: step === "rooms" },
          { id: "transport", label: "Transport", done: step === "review", active: step === "transport" },
          { id: "review", label: "Create", done: false, active: step === "review" },
        ]}
      />

      {step === "package" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Template package</Text>
          <Text style={styles.meta}>
            {prefill.inquiry.locationLabel}
            {prefill.inquiry.journeyDate ? ` · ${prefill.inquiry.journeyDate}` : ""}
          </Text>
          <FieldButton
            testID="smart-build-package-picker"
            label="Tour package"
            value={selectedPackage?.tourPackageName ?? "Select package"}
            onPress={() => setPicker("package")}
          />
          {selectedPackage?.validationErrors.length ? (
            <Text style={styles.validationText}>{selectedPackage.validationErrors.join("\n")}</Text>
          ) : null}
          <FieldButton
            testID="smart-build-meal-plan-picker"
            label="Meal plan"
            value={
              prefill.lookups.mealPlans.find((m) => m.id === mealPlanId)?.name ?? "Select meal plan"
            }
            onPress={() => setPicker("mealPlan")}
          />
        </View>
      ) : null}

      {step === "rooms" ? (
        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Room allocations</Text>
            <Pressable
              testID="smart-build-add-room"
              accessibilityRole="button"
              accessibilityLabel="Add room allocation"
              onPress={() =>
                setRoomAllocations((prev) => [
                  ...prev,
                  {
                    roomTypeId: "",
                    occupancyTypeId: "",
                    quantity: 1,
                    customRoomType: "",
                    useCustomRoomType: false,
                  },
                ])
              }
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            </Pressable>
          </View>
          {roomAllocations.map((row, index) => (
            <View key={`room-${index}`} style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Custom room type</Text>
                <Switch
                  testID={`smart-build-custom-room-${index}`}
                  accessibilityLabel={`Custom room type row ${index + 1}`}
                  value={!!row.useCustomRoomType}
                  onValueChange={(checked) =>
                    setRoomAllocations((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              useCustomRoomType: checked,
                              roomTypeId: checked ? "" : item.roomTypeId,
                              customRoomType: checked ? item.customRoomType : "",
                            }
                          : item
                      )
                    )
                  }
                />
              </View>
              {row.useCustomRoomType ? (
                <>
                  <Text style={styles.fieldLabel}>Custom room name</Text>
                  <TextInput
                    testID={`smart-build-custom-room-name-${index}`}
                    accessibilityLabel={`Custom room name row ${index + 1}`}
                    style={styles.input}
                    value={row.customRoomType ?? ""}
                    onChangeText={(text) =>
                      setRoomAllocations((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, customRoomType: text } : item
                        )
                      )
                    }
                    placeholder="e.g. Villa with pool"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </>
              ) : (
                <FieldButton
                  testID={`smart-build-room-type-${index}`}
                  label="Room type"
                  value={
                    prefill.lookups.roomTypes.find((r) => r.id === row.roomTypeId)?.name ??
                    "Select room type"
                  }
                  onPress={() => {
                    setPickerRowIndex(index);
                    setPicker("roomType");
                  }}
                />
              )}
              <FieldButton
                testID={`smart-build-occupancy-${index}`}
                label="Occupancy"
                value={
                  prefill.lookups.occupancyTypes.find((o) => o.id === row.occupancyTypeId)?.name ??
                  "Select occupancy"
                }
                onPress={() => {
                  setPickerRowIndex(index);
                  setPicker("occupancy");
                }}
              />
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                testID={`smart-build-room-qty-${index}`}
                accessibilityLabel={`Room quantity row ${index + 1}`}
                style={styles.input}
                keyboardType="number-pad"
                value={String(row.quantity)}
                onChangeText={(text) => {
                  const quantity = Math.max(1, Number.parseInt(text, 10) || 1);
                  setRoomAllocations((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, quantity } : item))
                  );
                }}
              />
              {roomAllocations.length > 1 ? (
                <Pressable
                  testID={`smart-build-remove-room-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove room row ${index + 1}`}
                  onPress={() =>
                    setRoomAllocations((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <Text style={styles.removeText}>Remove room</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {step === "transport" ? (
        <View style={styles.panel}>
          <View style={styles.rowBetween}>
            <Text style={styles.panelTitle}>Transport</Text>
            <Pressable
              testID="smart-build-add-transport"
              accessibilityRole="button"
              accessibilityLabel="Add transport detail"
              onPress={() =>
                setTransportDetails((prev) => [
                  ...prev,
                  {
                    vehicleTypeId: null,
                    quantity: 1,
                    isAirportPickupRequired: false,
                    isAirportDropRequired: false,
                    pickupLocation: "",
                    dropLocation: "",
                    requirementDate: null,
                    notes: "",
                  },
                ])
              }
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            </Pressable>
          </View>
          {transportDetails.length === 0 ? (
            <Text style={styles.meta}>No transport rows. You can continue without transport.</Text>
          ) : null}
          {transportDetails.map((row, index) => (
            <View key={`transport-${index}`} style={styles.card}>
              <FieldButton
                testID={`smart-build-vehicle-${index}`}
                label="Vehicle"
                value={
                  prefill.lookups.vehicleTypes.find((v) => v.id === row.vehicleTypeId)?.name ??
                  "Select vehicle"
                }
                onPress={() => {
                  setPickerRowIndex(index);
                  setPicker("vehicle");
                }}
              />
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                testID={`smart-build-transport-qty-${index}`}
                style={styles.input}
                keyboardType="number-pad"
                value={String(row.quantity ?? 1)}
                onChangeText={(text) => {
                  const quantity = Math.max(1, Number.parseInt(text, 10) || 1);
                  setTransportDetails((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, quantity } : item))
                  );
                }}
              />
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Airport pickup</Text>
                <Switch
                  testID={`smart-build-airport-pickup-${index}`}
                  value={!!row.isAirportPickupRequired}
                  onValueChange={(checked) =>
                    setTransportDetails((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, isAirportPickupRequired: checked } : item
                      )
                    )
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Airport drop</Text>
                <Switch
                  testID={`smart-build-airport-drop-${index}`}
                  value={!!row.isAirportDropRequired}
                  onValueChange={(checked) =>
                    setTransportDetails((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, isAirportDropRequired: checked } : item
                      )
                    )
                  }
                />
              </View>
              <Text style={styles.fieldLabel}>Pickup location</Text>
              <TextInput
                testID={`smart-build-pickup-${index}`}
                style={styles.input}
                value={row.pickupLocation ?? ""}
                onChangeText={(text) =>
                  setTransportDetails((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, pickupLocation: text } : item
                    )
                  )
                }
              />
              <Text style={styles.fieldLabel}>Drop location</Text>
              <TextInput
                testID={`smart-build-drop-${index}`}
                style={styles.input}
                value={row.dropLocation ?? ""}
                onChangeText={(text) =>
                  setTransportDetails((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, dropLocation: text } : item
                    )
                  )
                }
              />
              <Text style={styles.fieldLabel}>Requirement date</Text>
              <DateField
                testID={`smart-build-requirement-date-${index}`}
                accessibilityLabel="Requirement date"
                style={styles.input}
                value={row.requirementDate ?? ""}
                onChange={(value) =>
                  setTransportDetails((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, requirementDate: value || null } : item
                    )
                  )
                }
                placeholder="Optional"
              />
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                testID={`smart-build-transport-notes-${index}`}
                style={[styles.input, styles.multilineInput]}
                value={row.notes ?? ""}
                multiline
                onChangeText={(text) =>
                  setTransportDetails((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, notes: text } : item))
                  )
                }
              />
              <Pressable
                testID={`smart-build-remove-transport-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove transport row ${index + 1}`}
                onPress={() =>
                  setTransportDetails((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Text style={styles.removeText}>Remove transport</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {step === "review" ? (
        <View style={styles.panel} testID="smart-build-review-panel">
          <Text style={styles.panelTitle}>Review & create</Text>
          <Text style={styles.fieldLabel}>Query number (optional)</Text>
          <TextInput
            testID="smart-build-query-number"
            accessibilityLabel="Tour package query number"
            style={styles.input}
            value={queryNumber}
            onChangeText={setQueryNumber}
            placeholder="Auto-generated if empty"
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={styles.meta}>{selectedPackage?.tourPackageName ?? "—"}</Text>
          <Text style={styles.meta}>
            {roomAllocations.length} room allocation{roomAllocations.length === 1 ? "" : "s"}
            {transportDetails.length ? ` · ${transportDetails.length} transport row(s)` : ""}
          </Text>
          {calculating ? (
            <ActivityIndicator color={Colors.primary} />
          ) : totalPrice != null ? (
            <Text style={styles.priceText}>Total: ₹{totalPrice.toLocaleString("en-IN")}</Text>
          ) : (
            <Text style={styles.meta}>Price could not be calculated automatically.</Text>
          )}
          {priceLines.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.meta}>
              {line}
            </Text>
          ))}
          <Pressable
            testID="smart-build-recalculate-inline"
            accessibilityRole="button"
            accessibilityLabel="Recalculate price"
            style={styles.recalcButton}
            onPress={() => void runPriceCalc()}
          >
            <Text style={styles.recalcText}>Recalculate price</Text>
          </Pressable>
        </View>
      ) : null}

      <AdminBottomActionBar
        primaryLabel={step === "review" ? "Create query" : "Continue"}
        primaryTestID={step === "review" ? "smart-build-create" : "smart-build-next"}
        primaryDisabled={
          submitting ||
          (step === "package" && !canNextFromPackage) ||
          (step === "rooms" && !canNextFromRooms)
        }
        onPrimaryPress={() => {
          if (step === "review") void submit(false);
          else goNext();
        }}
        secondaryLabel={step === "review" ? "Create & download PDF" : undefined}
        secondaryTestID="smart-build-create-download"
        secondaryIcon={step === "review" ? "download-outline" : undefined}
        onSecondaryPress={step === "review" ? () => void submit(true) : undefined}
      />

      <AdminPickerSheet
        visible={picker === "package"}
        title="Tour package"
        testID="smart-build-package-sheet"
        options={prefill.tourPackages.map((pkg) => ({
          id: pkg.id,
          label: pkg.tourPackageName || "Untitled",
          subtitle: [
            pkg.numDaysNight,
            pkg.itineraryCount ? `${pkg.itineraryCount} days` : null,
            pkg.validationErrors.length ? "Needs fixes" : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
        selectedId={tourPackageId}
        onSelect={(option) => {
          setTourPackageId(option.id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <AdminPickerSheet
        visible={picker === "mealPlan"}
        title="Meal plan"
        testID="smart-build-meal-plan-sheet"
        options={prefill.lookups.mealPlans.map((m) => ({ id: m.id, label: m.name }))}
        selectedId={mealPlanId}
        onSelect={(option) => {
          setMealPlanId(option.id);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <AdminPickerSheet
        visible={picker === "roomType"}
        title="Room type"
        testID="smart-build-room-type-sheet"
        options={prefill.lookups.roomTypes.map((r) => ({ id: r.id, label: r.name }))}
        selectedId={roomAllocations[pickerRowIndex]?.roomTypeId ?? ""}
        onSelect={(option) => {
          setRoomAllocations((prev) =>
            prev.map((row, i) =>
              i === pickerRowIndex
                ? { ...row, roomTypeId: option.id, useCustomRoomType: false, customRoomType: "" }
                : row
            )
          );
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <AdminPickerSheet
        visible={picker === "occupancy"}
        title="Occupancy"
        testID="smart-build-occupancy-sheet"
        options={prefill.lookups.occupancyTypes.map((o) => ({ id: o.id, label: o.name }))}
        selectedId={roomAllocations[pickerRowIndex]?.occupancyTypeId ?? ""}
        onSelect={(option) => {
          setRoomAllocations((prev) =>
            prev.map((row, i) => (i === pickerRowIndex ? { ...row, occupancyTypeId: option.id } : row))
          );
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <AdminPickerSheet
        visible={picker === "vehicle"}
        title="Vehicle type"
        testID="smart-build-vehicle-sheet"
        options={prefill.lookups.vehicleTypes.map((v) => ({ id: v.id, label: v.name }))}
        selectedId={transportDetails[pickerRowIndex]?.vehicleTypeId ?? ""}
        onSelect={(option) => {
          setTransportDetails((prev) =>
            prev.map((row, i) => (i === pickerRowIndex ? { ...row, vehicleTypeId: option.id } : row))
          );
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </AdminScreen>
  );
}

function FieldButton({
  testID,
  label,
  value,
  onPress,
}: {
  testID: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={styles.fieldButton}
        onPress={onPress}
      >
        <Text style={styles.fieldValue} numberOfLines={2}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  panelTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  validationText: { fontSize: FontSize.sm, color: Colors.error, lineHeight: 20 },
  priceText: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.primary },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  card: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    gap: Spacing.sm,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  fieldButton: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  fieldValue: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  input: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  multilineInput: { minHeight: 72, textAlignVertical: "top", paddingVertical: 10 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  removeText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: "700" },
  recalcButton: { alignSelf: "flex-start", paddingVertical: Spacing.xs },
  recalcText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "800" },
});
