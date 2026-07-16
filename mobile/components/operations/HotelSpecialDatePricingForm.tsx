import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
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
  type HotelSpecialDatePricingInput,
} from "@/lib/operations";

interface InitialValues {
  name: string;
  roomTypeId: string;
  roomTypeName: string;
  occupancyTypeId: string;
  occupancyTypeName: string;
  mealPlanId: string;
  mealPlanName: string;
  price: string;
  notes?: string | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface Props {
  hotelId: string;
  mode: "create" | "edit";
  specialPricingId?: string;
  initial?: InitialValues;
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

function PickerButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  return (
    <Text
      testID={testID}
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={[styles.pickerButton, disabled && styles.disabled]}
    >
      {label}
    </Text>
  );
}

export function HotelSpecialDatePricingForm({
  hotelId,
  mode,
  specialPricingId,
  initial,
}: Props) {
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

  const [name, setName] = useState(initial?.name ?? "");
  const [roomTypeId, setRoomTypeId] = useState(initial?.roomTypeId ?? "");
  const [roomTypeName, setRoomTypeName] = useState(initial?.roomTypeName ?? "");
  const [occupancyTypeId, setOccupancyTypeId] = useState(initial?.occupancyTypeId ?? "");
  const [occupancyTypeName, setOccupancyTypeName] = useState(
    initial?.occupancyTypeName ?? ""
  );
  const [mealPlanId, setMealPlanId] = useState(initial?.mealPlanId ?? "");
  const [mealPlanName, setMealPlanName] = useState(initial?.mealPlanName ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [startDate, setStartDate] = useState(asDate(initial?.startDate));
  const [endDate, setEndDate] = useState(
    initial?.endDate ? asDate(initial.endDate) : new Date()
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
      const { hotel } = await client.getHotel(hotelId);
      const lookups = await client.getHotelPricingLookups(hotel.locationId);
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
      if (!roomTypeId && lookups.roomTypes[0]) {
        setRoomTypeId(lookups.roomTypes[0].id);
        setRoomTypeName(lookups.roomTypes[0].name);
      }
      if (!occupancyTypeId && lookups.occupancyTypes[0]) {
        setOccupancyTypeId(lookups.occupancyTypes[0].id);
        setOccupancyTypeName(lookups.occupancyTypes[0].name);
      }
    } catch (err) {
      Alert.alert(
        "Lookups failed",
        err instanceof ApiError ? err.message : "Could not load pricing lookups."
      );
    } finally {
      setLookupsLoading(false);
    }
  }, [client, hotelId, occupancyTypeId, roomTypeId]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const pickerOptions =
    picker === "room"
      ? roomTypes
      : picker === "occupancy"
        ? occupancies
        : mealPlans;
  const pickerSelectedId =
    picker === "meal" && !mealPlanId
      ? "__none"
      : picker === "room"
        ? roomTypeId
        : picker === "occupancy"
          ? occupancyTypeId
          : mealPlanId;

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setDateField(null);
    if (event.type === "dismissed" || !selected) return;
    if (dateField === "start") setStartDate(selected);
    if (dateField === "end") setEndDate(selected);
  }

  function buildPayload(): HotelSpecialDatePricingInput {
    return {
      name: name.trim(),
      roomTypeId,
      occupancyTypeId,
      mealPlanId: mealPlanId || null,
      price: Number(price),
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      notes: notes.trim() || null,
      isActive,
    };
  }

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Name required", "Enter a special date name.");
      return;
    }
    if (!roomTypeId || !occupancyTypeId) {
      Alert.alert("Missing details", "Select room type and occupancy.");
      return;
    }
    if (!price || Number(price) < 0) {
      Alert.alert("Invalid price", "Enter a valid price.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        await client.createHotelSpecialDatePricing(hotelId, buildPayload());
        router.replace(`/admin/operations/hotels/${hotelId}/pricing` as never);
      } else if (specialPricingId) {
        await client.updateHotelSpecialDatePricing(
          hotelId,
          specialPricingId,
          buildPayload()
        );
        router.replace(
          `/admin/operations/hotels/${hotelId}/special-date-pricing/${specialPricingId}` as never
        );
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save special date pricing."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const screenTitle =
    mode === "create" ? "New special date pricing" : "Edit special date pricing";

  return (
    <AdminScreen
      testID="hotel-special-date-pricing-form"
      bottomInset={Spacing.xl + 72}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />
      <AdminTopBar
        title={screenTitle}
        subtitle="Event and holiday override"
        onBackPress={() => router.back()}
        testID="hotel-special-date-pricing-form-header"
      />

      <AdminFormSection title="Special date" testID="hotel-special-date-pricing-details">
        <AdminFormField label="Name" required>
          <TextInput
            testID="hotel-special-date-pricing-name"
            value={name}
            onChangeText={setName}
            placeholder="Christmas, New Year..."
            style={styles.input}
          />
        </AdminFormField>
        <AdminFormField label="Start date" required>
          <PickerButton
            testID="hotel-special-date-pricing-start-date"
            label={fmtDateLabel(startDate)}
            onPress={() => setDateField("start")}
          />
        </AdminFormField>
        <AdminFormField label="End date" required>
          <PickerButton
            testID="hotel-special-date-pricing-end-date"
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
      </AdminFormSection>

      <AdminFormSection title="Rate" testID="hotel-special-date-pricing-rate">
        <AdminFormField label="Room type" required>
          <PickerButton
            testID="hotel-special-date-pricing-room"
            label={roomTypeName || "Select room type"}
            disabled={lookupsLoading}
            onPress={() => setPicker("room")}
          />
        </AdminFormField>
        <AdminFormField label="Occupancy" required>
          <PickerButton
            testID="hotel-special-date-pricing-occupancy"
            label={occupancyTypeName || "Select occupancy"}
            disabled={lookupsLoading}
            onPress={() => setPicker("occupancy")}
          />
        </AdminFormField>
        <AdminFormField label="Meal plan">
          <PickerButton
            testID="hotel-special-date-pricing-meal"
            label={mealPlanName || "No meal plan"}
            disabled={lookupsLoading}
            onPress={() => setPicker("meal")}
          />
        </AdminFormField>
        <AdminFormField label="Price" required>
          <TextInput
            testID="hotel-special-date-pricing-price"
            value={String(price)}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0"
            style={styles.input}
          />
        </AdminFormField>
        <AdminFormField label="Notes">
          <TextInput
            testID="hotel-special-date-pricing-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional supplier note"
            style={[styles.input, styles.multiline]}
            multiline
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="hotel-special-date-pricing-active"
            accessibilityLabel="Active special date pricing"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </AdminFormSection>

      <AdminPickerSheet
        visible={!!picker}
        title={
          picker === "room"
            ? "Room type"
            : picker === "occupancy"
              ? "Occupancy"
              : "Meal plan"
        }
        options={pickerOptions}
        selectedId={pickerSelectedId}
        onClose={() => setPicker(null)}
        onSelect={(opt) => {
          if (picker === "room") {
            setRoomTypeId(opt.id);
            setRoomTypeName(opt.label);
          } else if (picker === "occupancy") {
            setOccupancyTypeId(opt.id);
            setOccupancyTypeName(opt.label);
          } else if (picker === "meal") {
            if (opt.id === "__none") {
              setMealPlanId("");
              setMealPlanName("");
            } else {
              setMealPlanId(opt.id);
              setMealPlanName(opt.label);
            }
          }
        }}
      />

      <AdminBottomActionBar
        primaryLabel={submitting ? "Saving..." : "Save"}
        primaryIcon="save-outline"
        onPrimaryPress={() => void submit()}
        primaryDisabled={submitting}
        secondaryLabel="Cancel"
        onSecondaryPress={() => router.back()}
        primaryTestID="hotel-special-date-pricing-actions"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
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
  multiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  disabled: { opacity: 0.5 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
});
