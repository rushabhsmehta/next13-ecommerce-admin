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
import { useAuth } from "@clerk/clerk-expo";
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
  type TransportPricingInput,
  type TransportType,
} from "@/lib/operations";

interface InitialValues {
  locationId: string;
  locationLabel: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  price: string;
  transportType: TransportType;
  description: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

function defaultEndDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

const EMPTY: InitialValues = {
  locationId: "",
  locationLabel: "",
  vehicleTypeId: "",
  vehicleTypeName: "",
  price: "",
  transportType: "PerDay",
  description: "",
  startDate: new Date(),
  endDate: defaultEndDate(),
  isActive: true,
};

function fmtDateLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  mode: "create" | "edit";
  pricingId?: string;
  initial?: InitialValues;
}

/** Shared transport-pricing form for create and edit flows. */
export function TransportPricingForm({ mode, pricingId, initial }: Props) {
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
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const seed = initial ?? EMPTY;
  const [locationId, setLocationId] = useState(seed.locationId);
  const [locationLabel, setLocationLabel] = useState(seed.locationLabel);
  const [vehicleTypeId, setVehicleTypeId] = useState(seed.vehicleTypeId);
  const [vehicleTypeName, setVehicleTypeName] = useState(seed.vehicleTypeName);
  const [price, setPrice] = useState(seed.price);
  const [transportType, setTransportType] = useState<TransportType>(seed.transportType);
  const [description, setDescription] = useState(seed.description);
  const [startDate, setStartDate] = useState(seed.startDate);
  const [endDate, setEndDate] = useState(seed.endDate);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);

  const [locationOptions, setLocationOptions] = useState<{ id: string; label: string }[]>(
    []
  );
  const [vehicleOptions, setVehicleOptions] = useState<{ id: string; label: string }[]>(
    []
  );
  const [pickersLoading, setPickersLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [dateField, setDateField] = useState<"start" | "end" | null>(null);

  const loadPickers = useCallback(async () => {
    setPickersLoading(true);
    try {
      const [locRes, vtRes] = await Promise.all([
        request<{ items: { id: string; name: string }[] }>(
          "/api/mobile/operations/list?type=locations&limit=100"
        ),
        client.listVehicleTypes({ activeOnly: true }),
      ]);
      setLocationOptions(locRes.items.map((l) => ({ id: l.id, label: l.name })));
      setVehicleOptions(vtRes.items.map((v) => ({ id: v.id, label: v.name })));
    } catch {
      // Pickers may still work if user already has values from initial.
    } finally {
      setPickersLoading(false);
    }
  }, [client, request]);

  useEffect(() => {
    void loadPickers();
  }, [loadPickers]);

  const screenTitle =
    mode === "create" ? "New transport pricing" : "Edit transport pricing";
  const canSubmit =
    locationId.length > 0 &&
    vehicleTypeId.length > 0 &&
    price.trim().length > 0 &&
    !Number.isNaN(Number(price)) &&
    Number(price) >= 0 &&
    !submitting;

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS !== "ios") setDateField(null);
    if (event.type === "dismissed" || !selected) return;
    if (dateField === "start") setStartDate(selected);
    if (dateField === "end") setEndDate(selected);
  }

  async function submit() {
    if (!canSubmit) return;
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be on or after the start date.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: TransportPricingInput = {
        locationId,
        vehicleTypeId,
        price: Number(price),
        transportType,
        description: description.trim() || null,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        isActive,
      };
      if (mode === "create") {
        const saved = await client.createTransportPricing(payload);
        router.replace(`/admin/operations/transport-pricing/${saved.id}` as never);
      } else if (pricingId) {
        await client.updateTransportPricing(pricingId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} transport pricing.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={
        mode === "create" ? "transport-pricing-new-screen" : "transport-pricing-edit-screen"
      }
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create pricing" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="transport-pricing-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !locationId
              ? "Select a location."
              : !vehicleTypeId
                ? "Select a vehicle type."
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
        subtitle="Transport pricing"
        onBackPress={() => router.back()}
        testID="transport-pricing-form"
      />

      <AdminFormSection title="Route" testID="transport-pricing-form-route">
        <AdminFormField label="Location" required>
          <Pressable
            testID="transport-pricing-form-location"
            accessibilityRole="button"
            accessibilityLabel="Choose location"
            style={styles.pickerBtn}
            onPress={() => setShowLocationPicker(true)}
            disabled={pickersLoading}
          >
            <Text style={locationId ? styles.pickerValue : styles.pickerPlaceholder}>
              {locationLabel || "Select location…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
        <AdminFormField label="Vehicle type" required>
          <Pressable
            testID="transport-pricing-form-vehicle"
            accessibilityRole="button"
            accessibilityLabel="Choose vehicle type"
            style={styles.pickerBtn}
            onPress={() => setShowVehiclePicker(true)}
            disabled={pickersLoading}
          >
            <Text style={vehicleTypeId ? styles.pickerValue : styles.pickerPlaceholder}>
              {vehicleTypeName || "Select vehicle type…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Pricing" testID="transport-pricing-form-pricing">
        <AdminFormField label="Transport type" required>
          <View style={styles.chipRow}>
            {(["PerDay", "PerTrip"] as const).map((t) => {
              const active = transportType === t;
              return (
                <Pressable
                  key={t}
                  testID={`transport-pricing-form-type-${t}`}
                  accessibilityRole="button"
                  accessibilityLabel={t === "PerDay" ? "Per day" : "Per trip"}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setTransportType(t)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                    {t === "PerDay" ? "Per day" : "Per trip"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AdminFormField>
        <AdminFormField label="Price (INR)" required>
          <TextInput
            testID="transport-pricing-form-price"
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
          <Pressable
            testID="transport-pricing-form-start-date"
            accessibilityRole="button"
            accessibilityLabel="Choose start date"
            style={styles.pickerBtn}
            onPress={() => setDateField("start")}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.pickerValue}>{fmtDateLabel(startDate)}</Text>
          </Pressable>
        </AdminFormField>
        <AdminFormField label="End date" required>
          <Pressable
            testID="transport-pricing-form-end-date"
            accessibilityRole="button"
            accessibilityLabel="Choose end date"
            style={styles.pickerBtn}
            onPress={() => setDateField("end")}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.pickerValue}>{fmtDateLabel(endDate)}</Text>
          </Pressable>
        </AdminFormField>
        {dateField ? (
          <DateTimePicker
            value={dateField === "start" ? startDate : endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
          />
        ) : null}
        <AdminFormField label="Description">
          <TextInput
            testID="transport-pricing-form-description"
            accessibilityLabel="Description"
            style={[styles.input, styles.textarea]}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="transport-pricing-form-active"
            accessibilityLabel="Active pricing"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </AdminFormSection>

      <AdminPickerSheet
        visible={showLocationPicker}
        title="Location"
        options={locationOptions}
        selectedId={locationId}
        loading={pickersLoading}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(opt) => {
          setLocationId(opt.id);
          setLocationLabel(opt.label);
        }}
        testID="transport-pricing-location-picker"
      />
      <AdminPickerSheet
        visible={showVehiclePicker}
        title="Vehicle type"
        options={vehicleOptions}
        selectedId={vehicleTypeId}
        loading={pickersLoading}
        onClose={() => setShowVehiclePicker(false)}
        onSelect={(opt) => {
          setVehicleTypeId(opt.id);
          setVehicleTypeName(opt.label);
        }}
        testID="transport-pricing-vehicle-picker"
      />
    </AdminScreen>
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
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
  chipRow: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  chipText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
