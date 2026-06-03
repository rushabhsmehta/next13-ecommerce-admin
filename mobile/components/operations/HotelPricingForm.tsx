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
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type HotelPricingInput,
} from "@/lib/operations";

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
  const [occupancyTypeId, setOccupancyTypeId] = useState(initial?.occupancyTypeId ?? "");
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
  const [roomTypes, setRoomTypes] = useState<{ id: string; label: string }[]>([]);
  const [occupancies, setOccupancies] = useState<{ id: string; label: string }[]>([]);
  const [mealPlans, setMealPlans] = useState<{ id: string; label: string }[]>([]);
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

  const screenTitle = mode === "create" ? "New hotel pricing" : "Edit hotel pricing";
  const canSubmit =
    !!roomTypeId &&
    !!occupancyTypeId &&
    price.trim().length > 0 &&
    Number(price) >= 0 &&
    !Number.isNaN(Number(price)) &&
    !submitting;

  const pickerOptions =
    picker === "room" ? roomTypes : picker === "occupancy" ? occupancies : mealPlans;
  const pickerTitle =
    picker === "room" ? "Room type" : picker === "occupancy" ? "Occupancy" : "Meal plan";
  const pickerSelectedId =
    picker === "meal" && !mealPlanId ? "__none" : picker === "room" ? roomTypeId : picker === "occupancy" ? occupancyTypeId : mealPlanId;

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
      Alert.alert("Invalid dates", "End date must be on or after the start date.");
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

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "hotel-pricing-new-screen" : "hotel-pricing-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create pricing" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="hotel-pricing-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !roomTypeId
              ? "Select a room type."
              : !occupancyTypeId
                ? "Select an occupancy."
                : !price.trim() || Number.isNaN(Number(price))
                  ? "Enter a valid price."
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
        subtitle="Hotel pricing"
        onBackPress={() => router.back()}
        testID="hotel-pricing-form"
      />

      <AdminFormSection title="Room" testID="hotel-pricing-form-room-section">
        <AdminFormField label="Room type" required>
          <PickerButton
            testID="hotel-pricing-form-room"
            label={roomTypeName || "Select room type"}
            selected={!!roomTypeId}
            disabled={lookupsLoading}
            onPress={() => setPicker("room")}
          />
        </AdminFormField>
        <AdminFormField label="Occupancy" required>
          <PickerButton
            testID="hotel-pricing-form-occupancy"
            label={occupancyTypeName || "Select occupancy"}
            selected={!!occupancyTypeId}
            disabled={lookupsLoading}
            onPress={() => setPicker("occupancy")}
          />
        </AdminFormField>
        <AdminFormField label="Meal plan">
          <PickerButton
            testID="hotel-pricing-form-meal"
            label={mealPlanName || "No meal plan"}
            selected
            disabled={lookupsLoading}
            onPress={() => setPicker("meal")}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Rates" testID="hotel-pricing-form-rates">
        <AdminFormField label="Price (INR)" required>
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
        </AdminFormField>
        <AdminFormField label="Start date" required>
          <DateButton
            testID="hotel-pricing-form-start-date"
            label={fmtDateLabel(startDate)}
            onPress={() => setDateField("start")}
          />
        </AdminFormField>
        <AdminFormField label="End date" required>
          <DateButton
            testID="hotel-pricing-form-end-date"
            label={fmtDateLabel(endDate)}
            onPress={() => setDateField("end")}
          />
        </AdminFormField>
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
      </AdminFormSection>

      <AdminPickerSheet
        visible={!!picker}
        title={pickerTitle}
        options={pickerOptions}
        selectedId={picker ? pickerSelectedId : null}
        loading={lookupsLoading}
        onClose={() => setPicker(null)}
        onSelect={(opt) => {
          if (picker === "room") {
            setRoomTypeId(opt.id);
            setRoomTypeName(opt.label);
          } else if (picker === "occupancy") {
            setOccupancyTypeId(opt.id);
            setOccupancyTypeName(opt.label);
          } else if (opt.id === "__none") {
            setMealPlanId("");
            setMealPlanName("No meal plan");
          } else {
            setMealPlanId(opt.id);
            setMealPlanName(opt.label);
          }
        }}
        testID="hotel-pricing-picker"
      />
    </AdminScreen>
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
      <Text style={selected ? styles.pickerValue : styles.pickerPlaceholder}>{label}</Text>
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
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
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
