import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  AdminBottomActionBar,
  AdminDangerZone,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createTourPackagesClient,
  type PricingComponentInput,
  type TourPackagePricingRow,
  type TourPackagePricingInput,
} from "@/lib/tour-packages";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function asDate(value?: string | Date | null): Date {
  if (value instanceof Date) return value;
  const d = value ? new Date(value) : new Date();
  return Number.isFinite(d.getTime()) ? d : new Date();
}

interface SeasonalPeriodOption {
  id: string;
  label: string;
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
  description?: string | null;
}

function datesForSeason(period: SeasonalPeriodOption, reference: Date) {
  if (!period.startMonth || !period.startDay || !period.endMonth || !period.endDay) {
    return null;
  }
  const year = reference.getFullYear();
  const start = new Date(year, period.startMonth - 1, period.startDay);
  let end = new Date(year, period.endMonth - 1, period.endDay);
  if (end < start) {
    end = new Date(year + 1, period.endMonth - 1, period.endDay);
  }
  return { start, end };
}

interface Props {
  packageId: string;
  locationId: string;
  mode: "create" | "edit";
  pricingId?: string;
  lockedVariant?: {
    id: string;
    name?: string | null;
  };
  initial?: {
    startDate: Date;
    endDate: Date;
    mealPlanId: string;
    mealPlanName: string;
    numberOfRooms: string;
    packageVariantId: string;
    packageVariantName: string;
    vehicleTypeId: string;
    vehicleTypeName: string;
    locationSeasonalPeriodId: string;
    seasonalPeriodName: string;
    description: string;
    isGroupPricing: boolean;
    isActive: boolean;
    components: {
      pricingAttributeId: string;
      price: string;
      purchasePrice: string;
      description: string;
    }[];
  };
}

export function TourPackagePricingForm({
  packageId,
  locationId,
  mode,
  pricingId,
  lockedVariant,
  initial,
}: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [startDate, setStartDate] = useState(asDate(initial?.startDate));
  const [endDate, setEndDate] = useState(
    initial?.endDate ? asDate(initial.endDate) : addDays(new Date(), 30)
  );
  const [mealPlanId, setMealPlanId] = useState(initial?.mealPlanId ?? "");
  const [mealPlanName, setMealPlanName] = useState(initial?.mealPlanName ?? "");
  const [numberOfRooms, setNumberOfRooms] = useState(initial?.numberOfRooms ?? "1");
  const variantLocked =
    !!lockedVariant?.id &&
    (mode === "create" || initial?.packageVariantId === lockedVariant.id);
  const lockedVariantLabel =
    lockedVariant?.name?.trim() || initial?.packageVariantName || "Selected variant";
  const [packageVariantId, setPackageVariantId] = useState(
    initial?.packageVariantId ?? lockedVariant?.id ?? ""
  );
  const [packageVariantName, setPackageVariantName] = useState(
    initial?.packageVariantName ?? lockedVariant?.name ?? ""
  );
  const [vehicleTypeId, setVehicleTypeId] = useState(initial?.vehicleTypeId ?? "");
  const [vehicleTypeName, setVehicleTypeName] = useState(initial?.vehicleTypeName ?? "");
  const [seasonalPeriodId, setSeasonalPeriodId] = useState(
    initial?.locationSeasonalPeriodId ?? ""
  );
  const [seasonalPeriodName, setSeasonalPeriodName] = useState(
    initial?.seasonalPeriodName ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isGroupPricing, setIsGroupPricing] = useState(initial?.isGroupPricing ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [componentPrices, setComponentPrices] = useState<
    Record<string, { price: string; purchasePrice: string; description: string }>
  >(() => {
    const map: Record<string, { price: string; purchasePrice: string; description: string }> = {};
    for (const c of initial?.components ?? []) {
      map[c.pricingAttributeId] = {
        price: c.price,
        purchasePrice: c.purchasePrice,
        description: c.description,
      };
    }
    return map;
  });

  const [mealPlans, setMealPlans] = useState<{ id: string; label: string }[]>([]);
  const [variants, setVariants] = useState<{ id: string; label: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ id: string; label: string }[]>([]);
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriodOption[]>([]);
  const [copySources, setCopySources] = useState<TourPackagePricingRow[]>([]);
  const [pricingAttributes, setPricingAttributes] = useState<
    { id: string; name: string }[]
  >([]);
  const [picker, setPicker] = useState<
    "meal" | "variant" | "vehicle" | "season" | "copy" | null
  >(null);
  const [dateField, setDateField] = useState<"start" | "end" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadLookups = useCallback(async () => {
    try {
      const [lookups, variantRes, pricingRes] = await Promise.all([
        client.getLookups(locationId),
        client.listVariants(packageId),
        client.listPricing(packageId),
      ]);
      setMealPlans(lookups.mealPlans.map((m) => ({ id: m.id, label: `${m.code} - ${m.name}` })));
      setVehicleTypes([
        { id: "__none", label: "No vehicle type" },
        ...lookups.vehicleTypes.map((v) => ({ id: v.id, label: v.name })),
      ]);
      setSeasonalPeriods([
        { id: "__none", label: "No seasonal period" },
        ...lookups.seasonalPeriods.map((s) => ({
          id: s.id,
          label: s.name,
          startMonth: s.startMonth,
          startDay: s.startDay,
          endMonth: s.endMonth,
          endDay: s.endDay,
          description: s.description,
        })),
      ]);
      setCopySources(
        pricingRes.items.filter((item) => item.id !== pricingId)
      );
      setPricingAttributes(lookups.pricingAttributes);
      setVariants([
        { id: "__none", label: "All variants (global)" },
        ...variantRes.variants.map((v) => ({ id: v.id, label: v.name })),
      ]);
      setComponentPrices((prev) => {
        const next = { ...prev };
        for (const attr of lookups.pricingAttributes) {
          if (!next[attr.id]) next[attr.id] = { price: "", purchasePrice: "", description: "" };
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [client, locationId, packageId, pricingId]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const hasComponents = pricingAttributes.some(
    (a) => Number(componentPrices[a.id]?.price) >= 0 && componentPrices[a.id]?.price !== ""
  );
  const canSubmit = !!mealPlanId && hasComponents && !submitting;
  const screenTitle = mode === "create" ? "New seasonal pricing" : "Edit seasonal pricing";

  function applyPricingCopy(source: TourPackagePricingRow) {
    setMealPlanId(source.mealPlanId);
    setMealPlanName(`${source.mealPlanCode} - ${source.mealPlanName}`);
    setNumberOfRooms(String(source.numberOfRooms || 1));
    if (variantLocked && lockedVariant?.id) {
      setPackageVariantId(lockedVariant.id);
      setPackageVariantName(lockedVariantLabel);
    } else {
      setPackageVariantId(source.packageVariantId ?? "");
      setPackageVariantName(source.packageVariantName ?? "");
    }
    setVehicleTypeId(source.vehicleTypeId ?? "");
    setVehicleTypeName(source.vehicleTypeName ?? "");
    setIsGroupPricing(source.isGroupPricing);
    if (!description.trim() && source.description) {
      setDescription(source.description);
    }
    setComponentPrices((prev) => {
      const next = { ...prev };
      for (const component of source.pricingComponents) {
        next[component.pricingAttributeId] = {
          price: String(component.price ?? ""),
          purchasePrice:
            component.purchasePrice != null ? String(component.purchasePrice) : "",
          description: component.description ?? "",
        };
      }
      return next;
    });
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setDateField(null);
    if (event.type === "dismissed" || !selected) return;
    if (dateField === "start") setStartDate(selected);
    if (dateField === "end") setEndDate(selected);
  }

  function buildPayload(): TourPackagePricingInput {
    const components: PricingComponentInput[] = pricingAttributes
      .map((attr) => ({
        pricingAttributeId: attr.id,
        price: Number(componentPrices[attr.id]?.price || 0),
        purchasePrice: componentPrices[attr.id]?.purchasePrice
          ? Number(componentPrices[attr.id].purchasePrice)
          : null,
        description: componentPrices[attr.id]?.description?.trim() || null,
      }))
      .filter((c) => c.price > 0 || c.purchasePrice || c.description);

    return {
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      mealPlanId,
      numberOfRooms: Number(numberOfRooms) || 1,
      packageVariantId: packageVariantId || null,
      vehicleTypeId: vehicleTypeId || null,
      locationSeasonalPeriodId: seasonalPeriodId || null,
      description: description.trim() || null,
      isGroupPricing,
      isActive,
      pricingComponents: components,
    };
  }

  async function submit() {
    if (!canSubmit) return;
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be on or after start date.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        await client.createPricing(packageId, buildPayload());
      } else if (pricingId) {
        await client.updatePricing(packageId, pricingId, buildPayload());
      }
      router.replace(buildPricingListPath(packageId, lockedVariant) as never);
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save pricing."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function deletePricing() {
    if (!pricingId) return;
    Alert.alert(
      "Delete pricing",
      "This removes the selected seasonal pricing period.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await client.deletePricing(packageId, pricingId);
              router.replace(buildPricingListPath(packageId, lockedVariant) as never);
            } catch (err) {
              Alert.alert(
                "Delete failed",
                err instanceof ApiError ? err.message : "Could not delete pricing."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  const pickerOptions =
    picker === "meal"
      ? mealPlans
      : picker === "variant"
        ? variants
        : picker === "vehicle"
          ? vehicleTypes
          : picker === "copy"
            ? copySources.map((item) => ({
                id: item.id,
                label: `${fmtDateLabel(asDate(item.startDate))} - ${fmtDateLabel(
                  asDate(item.endDate)
                )} - ${item.mealPlanName}`,
              }))
          : seasonalPeriods;
  const pickerTitle =
    picker === "meal"
      ? "Meal plan"
      : picker === "variant"
        ? "Variant"
        : picker === "vehicle"
          ? "Vehicle type"
          : picker === "copy"
            ? "Copy from period"
          : "Seasonal period";
  const pickerSelectedId =
    picker === "meal"
      ? mealPlanId || null
      : picker === "variant"
        ? packageVariantId || "__none"
        : picker === "vehicle"
          ? vehicleTypeId || "__none"
          : picker === "copy"
            ? null
          : seasonalPeriodId || "__none";

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "tour-pricing-new-screen" : "tour-pricing-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create pricing" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="tour-pricing-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !mealPlanId
              ? "Select a meal plan."
              : !hasComponents
                ? "Enter at least one component price."
                : submitting
                  ? "Saving…"
                  : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />
      <AdminTopBar
        title={screenTitle}
        subtitle="Seasonal pricing"
        onBackPress={() => router.back()}
        testID="tour-pricing-form-header"
      />

      <AdminFormSection title="Period" testID="tour-pricing-form-period">
        <AdminFormField label="Start date" required>
          <Pressable
            testID="tour-pricing-form-start-date"
            accessibilityRole="button"
            accessibilityLabel="Start date"
            style={styles.pickerBtn}
            onPress={() => setDateField("start")}
          >
            <Text style={styles.pickerValue}>{fmtDateLabel(startDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="End date" required>
          <Pressable
            testID="tour-pricing-form-end-date"
            accessibilityRole="button"
            accessibilityLabel="End date"
            style={styles.pickerBtn}
            onPress={() => setDateField("end")}
          >
            <Text style={styles.pickerValue}>{fmtDateLabel(endDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="Meal plan" required>
          <Pressable
            testID="tour-pricing-form-mealplan"
            accessibilityRole="button"
            accessibilityLabel="Meal plan"
            style={styles.pickerBtn}
            onPress={() => setPicker("meal")}
          >
            <Text style={mealPlanId ? styles.pickerValue : styles.pickerPlaceholder}>
              {mealPlanName || "Select meal plan"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="Number of rooms" required>
          <TextInput
            testID="tour-pricing-form-rooms"
            style={styles.input}
            value={numberOfRooms}
            onChangeText={setNumberOfRooms}
            keyboardType="number-pad"
          />
        </AdminFormField>
        <AdminFormField label="Variant">
          <Pressable
            testID="tour-pricing-form-variant"
            accessibilityRole="button"
            accessibilityLabel={variantLocked ? "Locked variant" : "Variant"}
            accessibilityState={{ disabled: variantLocked }}
            disabled={variantLocked}
            style={[styles.pickerBtn, variantLocked ? styles.lockedPickerBtn : null]}
            onPress={() => setPicker("variant")}
          >
            <Text style={styles.pickerValue}>
              {packageVariantName || (variantLocked ? lockedVariantLabel : "All variants (global)")}
            </Text>
            <Ionicons
              name={variantLocked ? "lock-closed-outline" : "chevron-down"}
              size={18}
              color={Colors.textTertiary}
            />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="Vehicle type">
          <Pressable
            testID="tour-pricing-form-vehicle"
            accessibilityRole="button"
            accessibilityLabel="Vehicle type"
            style={styles.pickerBtn}
            onPress={() => setPicker("vehicle")}
          >
            <Text style={styles.pickerValue}>
              {vehicleTypeName || "No vehicle type"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="Seasonal period">
          <Pressable
            testID="tour-pricing-form-season"
            accessibilityRole="button"
            accessibilityLabel="Seasonal period"
            style={styles.pickerBtn}
            onPress={() => setPicker("season")}
          >
            <Text style={styles.pickerValue}>
              {seasonalPeriodName || "No seasonal period"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        {copySources.length > 0 ? (
          <AdminFormField label="Copy from period">
            <Pressable
              testID="tour-pricing-form-copy"
              accessibilityRole="button"
              accessibilityLabel="Copy from existing pricing period"
              style={styles.pickerBtn}
              onPress={() => setPicker("copy")}
            >
              <Text style={styles.pickerPlaceholder}>
                Copy meal, rooms, vehicle, and components
              </Text>
              <Ionicons name="copy-outline" size={18} color={Colors.textTertiary} />
            </Pressable>
          </AdminFormField>
        ) : null}
        <AdminFormField label="Description">
          <TextInput
            testID="tour-pricing-form-description"
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Group pricing</Text>
          <Switch value={isGroupPricing} onValueChange={setIsGroupPricing} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>
      </AdminFormSection>

      <AdminFormSection title="Pricing components" testID="tour-pricing-form-components">
        {pricingAttributes.length === 0 ? (
          <Text style={styles.hint}>No pricing attributes configured.</Text>
        ) : (
          pricingAttributes.map((attr, index) => (
            <View key={attr.id} style={styles.componentCard}>
              <Text style={styles.componentTitle}>{attr.name}</Text>
              <AdminFormField label="Sell price (INR)">
                <TextInput
                  testID={`tour-pricing-form-price-${index}`}
                  style={styles.input}
                  value={componentPrices[attr.id]?.price ?? ""}
                  onChangeText={(text) =>
                    setComponentPrices((prev) => ({
                      ...prev,
                      [attr.id]: {
                        ...(prev[attr.id] ?? { purchasePrice: "", description: "" }),
                        price: text,
                      },
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                />
              </AdminFormField>
              <AdminFormField label="Purchase price (INR)">
                <TextInput
                  testID={`tour-pricing-form-purchase-price-${index}`}
                  style={styles.input}
                  value={componentPrices[attr.id]?.purchasePrice ?? ""}
                  onChangeText={(text) =>
                    setComponentPrices((prev) => ({
                      ...prev,
                      [attr.id]: {
                        ...(prev[attr.id] ?? { price: "", description: "" }),
                        purchasePrice: text,
                      },
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={Colors.textTertiary}
                />
              </AdminFormField>
              <AdminFormField label="Description">
                <TextInput
                  testID={`tour-pricing-form-component-description-${index}`}
                  style={[styles.input, styles.textarea]}
                  value={componentPrices[attr.id]?.description ?? ""}
                  onChangeText={(text) =>
                    setComponentPrices((prev) => ({
                      ...prev,
                      [attr.id]: {
                        ...(prev[attr.id] ?? { price: "", purchasePrice: "" }),
                        description: text,
                      },
                    }))
                  }
                  multiline
                  placeholder="Optional"
                  placeholderTextColor={Colors.textTertiary}
                />
              </AdminFormField>
            </View>
          ))
        )}
      </AdminFormSection>

      {mode === "edit" && pricingId ? (
        <AdminDangerZone
          testID="tour-pricing-danger-zone"
          actions={[
            {
              id: "delete-pricing",
              label: "Delete pricing",
              hint: "Permanently removes this seasonal pricing period",
              onPress: deletePricing,
              disabled: submitting,
              testID: "tour-pricing-delete-btn",
            },
          ]}
        />
      ) : null}

      {dateField ? (
        <DateTimePicker
          value={dateField === "start" ? startDate : endDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      ) : null}

      <AdminPickerSheet
        visible={picker !== null}
        title={pickerTitle}
        options={pickerOptions}
        selectedId={pickerSelectedId}
        onSelect={(opt) => {
          if (picker === "meal") {
            setMealPlanId(opt.id);
            setMealPlanName(opt.label);
          } else if (picker === "variant") {
            if (opt.id === "__none") {
              setPackageVariantId("");
              setPackageVariantName("");
            } else {
              setPackageVariantId(opt.id);
              setPackageVariantName(opt.label);
            }
          } else if (picker === "vehicle") {
            if (opt.id === "__none") {
              setVehicleTypeId("");
              setVehicleTypeName("");
            } else {
              setVehicleTypeId(opt.id);
              setVehicleTypeName(opt.label);
            }
          } else if (picker === "season") {
            if (opt.id === "__none") {
              setSeasonalPeriodId("");
              setSeasonalPeriodName("");
            } else {
              setSeasonalPeriodId(opt.id);
              setSeasonalPeriodName(opt.label);
              const period = seasonalPeriods.find((item) => item.id === opt.id);
              const range = period ? datesForSeason(period, startDate) : null;
              if (range) {
                setStartDate(range.start);
                setEndDate(range.end);
              }
              if (!description.trim() && period?.description) {
                setDescription(period.description);
              }
            }
          } else if (picker === "copy") {
            const source = copySources.find((item) => item.id === opt.id);
            if (source) applyPricingCopy(source);
          }
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
        testID="tour-pricing-picker"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  lockedPickerBtn: {
    backgroundColor: Colors.surfaceAlt,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, color: Colors.text },
  hint: { fontSize: FontSize.sm, color: Colors.textTertiary },
  componentCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  componentTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
});

function buildPricingListPath(
  packageId: string,
  lockedVariant?: { id: string; name?: string | null }
): string {
  if (!lockedVariant?.id) {
    return `/admin/operations/tour-packages/${packageId}/pricing`;
  }
  const query = new URLSearchParams({ packageVariantId: lockedVariant.id });
  if (lockedVariant.name?.trim()) {
    query.set("variantName", lockedVariant.name.trim());
  }
  return `/admin/operations/tour-packages/${packageId}/pricing?${query.toString()}`;
}
