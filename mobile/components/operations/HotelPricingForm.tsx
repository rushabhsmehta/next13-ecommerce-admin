import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type HotelPricingInput,
} from "@/lib/operations";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

interface InitialValues {
  roomTypeId: string;
  roomTypeName: string;
  occupancyTypeId: string;
  occupancyTypeName: string;
  mealPlanId: string;
  mealPlanName: string;
  price: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface Props {
  hotelId: string;
  mode: "create" | "edit";
  pricingId?: string;
  initial?: InitialValues;
}

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

export function HotelPricingForm({ hotelId, mode, pricingId, initial }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [roomTypeId, setRoomTypeId] = useState(initial?.roomTypeId ?? "");
  const [roomTypeName, setRoomTypeName] = useState(initial?.roomTypeName ?? "");
  const [occupancyTypeId, setOccupancyTypeId] = useState(
    initial?.occupancyTypeId ?? ""
  );
  const [occupancyTypeName, setOccupancyTypeName] = useState(
    initial?.occupancyTypeName ?? ""
  );
  const [mealPlanId, setMealPlanId] = useState(initial?.mealPlanId ?? "");
  const [mealPlanName, setMealPlanName] = useState(initial?.mealPlanName ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [startDate, setStartDate] = useState(asDate(initial?.startDate));
  const [endDate, setEndDate] = useState(
    initial?.endDate ? asDate(initial.endDate) : addDays(new Date(), 30)
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<InquiryLookupOption[]>([]);
  const [occupancies, setOccupancies] = useState<InquiryLookupOption[]>([]);
  const [mealPlans, setMealPlans] = useState<InquiryLookupOption[]>([]);
  const [picker, setPicker] = useState<"room" | "occupancy" | "meal" | null>(null);
  const [dateField, setDateField] = useState<"start" | "end" | null>(null);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const lookups = await client.getHotelPricingLookups();
      setRoomTypes(lookups.roomTypes.map((r) => ({ id: r.id, label: r.name })));
      setOccupancies(
        lookups.occupancyTypes.map((o) => ({
          id: o.id,
          label: `${o.name}${o.maxPersons ? ` (${o.maxPersons})` : ""}`,
        }))
      );
      setMealPlans([
        { id: "__none", label: "No meal plan" },
        ...lookups.mealPlans.map((m) => ({
          id: m.id,
          label: `${m.code} - ${m.name}`,
        })),
      ]);
    } catch {
      // Existing values still allow edit; validation will catch missing IDs.
    } finally {
      setLookupsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const canSubmit =
    !!roomTypeId &&
    !!occupancyTypeId &&
    price.trim().length > 0 &&
    Number(price) >= 0 &&
    !Number.isNaN(Number(price)) &&
    !submitting;

  function buildPayload(applySplit = false): HotelPricingInput {
    return {
      roomTypeId,
      occupancyTypeId,
      mealPlanId: mealPlanId || null,
      price: Number(price),
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      isActive,
      applySplit,
    };
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setDateField(null);
    if (event.type === "dismissed" || !selected) return;
    if (dateField === "start") setStartDate(selected);
    if (dateField === "end") setEndDate(selected);
  }

  async function save(applySplit = false) {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await client.createHotelPricing(hotelId, buildPayload(applySplit));
        router.replace(`/admin/operations/hotels/${hotelId}/pricing` as never);
      } else if (pricingId) {
        await client.updateHotelPricing(hotelId, pricingId, buildPayload(false));
        router.replace(
          `/admin/operations/hotels/${hotelId}/pricing/${pricingId}` as never
        );
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save hotel pricing."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be on or after start date.");
      return;
    }

    if (mode === "create") {
      try {
        const preview = await client.checkHotelPricingOverlap(
          hotelId,
          buildPayload(false)
        );
        if (preview.willSplit) {
          Alert.alert("Overlap detected", preview.message, [
            { text: "Cancel", style: "cancel" },
            { text: "Apply split", onPress: () => void save(true) },
          ]);
          return;
        }
      } catch {
        // If preview fails, save without split and let the API validation handle it.
      }
    }

    await save(false);
  }

  const pickerOptions =
    picker === "room" ? roomTypes : picker === "occupancy" ? occupancies : mealPlans;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New hotel pricing" : "Edit hotel pricing",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="hotel-pricing-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New hotel pricing" : "Edit hotel pricing"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Room type *</Text>
        <PickerButton
          testID="hotel-pricing-form-room"
          label={roomTypeName || "Select room type"}
          selected={!!roomTypeId}
          disabled={lookupsLoading}
          onPress={() => setPicker("room")}
        />

        <Text style={styles.label}>Occupancy *</Text>
        <PickerButton
          testID="hotel-pricing-form-occupancy"
          label={occupancyTypeName || "Select occupancy"}
          selected={!!occupancyTypeId}
          disabled={lookupsLoading}
          onPress={() => setPicker("occupancy")}
        />

        <Text style={styles.label}>Meal plan</Text>
        <PickerButton
          testID="hotel-pricing-form-meal"
          label={mealPlanName || "No meal plan"}
          selected
          disabled={lookupsLoading}
          onPress={() => setPicker("meal")}
        />

        <Text style={styles.label}>Price (INR) *</Text>
        <TextInput
          testID="hotel-pricing-form-price"
          accessibilityLabel="Price in rupees"
          style={styles.input}
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Start date *</Text>
        <DateButton
          testID="hotel-pricing-form-start-date"
          label={fmtDateLabel(startDate)}
          onPress={() => setDateField("start")}
        />

        <Text style={styles.label}>End date *</Text>
        <DateButton
          testID="hotel-pricing-form-end-date"
          label={fmtDateLabel(endDate)}
          onPress={() => setDateField("end")}
        />

        {dateField ? (
          <DateTimePicker
            value={dateField === "start" ? startDate : endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
          />
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="hotel-pricing-form-active"
            accessibilityLabel="Active pricing"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="hotel-pricing-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create hotel pricing" : "Save changes"}
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit ? styles.submitDisabled : null]}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>
                {mode === "create" ? "Create pricing" : "Save changes"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LookupPickerModal
        visible={!!picker}
        title={
          picker === "room"
            ? "Room type"
            : picker === "occupancy"
              ? "Occupancy"
              : "Meal plan"
        }
        options={pickerOptions}
        testID="hotel-pricing-picker"
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (picker === "room") {
            const opt = roomTypes.find((o) => o.id === id);
            setRoomTypeId(id);
            setRoomTypeName(opt?.label ?? "");
          } else if (picker === "occupancy") {
            const opt = occupancies.find((o) => o.id === id);
            setOccupancyTypeId(id);
            setOccupancyTypeName(opt?.label ?? "");
          } else {
            if (id === "__none") {
              setMealPlanId("");
              setMealPlanName("No meal plan");
            } else {
              const opt = mealPlans.find((o) => o.id === id);
              setMealPlanId(id);
              setMealPlanName(opt?.label ?? "");
            }
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

function PickerButton({
  label,
  selected,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.pickerBtn}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={selected ? styles.pickerValue : styles.pickerPlaceholder}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

function DateButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.pickerBtn}
      onPress={onPress}
    >
      <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
      <Text style={styles.pickerValue}>{label}</Text>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
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
