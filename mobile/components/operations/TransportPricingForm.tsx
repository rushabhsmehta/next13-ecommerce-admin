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
  type TransportPricingInput,
  type TransportType,
} from "@/lib/operations";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

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

  const [locationOptions, setLocationOptions] = useState<InquiryLookupOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<InquiryLookupOption[]>([]);
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
      setLocationOptions(
        locRes.items.map((l) => ({ id: l.id, label: l.name }))
      );
      setVehicleOptions(
        vtRes.items.map((v) => ({ id: v.id, label: v.name }))
      );
    } catch {
      // Pickers may still work if user already has values from initial.
    } finally {
      setPickersLoading(false);
    }
  }, [client, request]);

  useEffect(() => {
    void loadPickers();
  }, [loadPickers]);

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
        router.replace(
          `/admin/operations/transport-pricing/${saved.id}` as never
        );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New transport pricing" : "Edit transport pricing",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="transport-pricing-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New transport pricing" : "Edit transport pricing"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Location *</Text>
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

        <Text style={styles.label}>Vehicle type *</Text>
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

        <Text style={styles.label}>Transport type *</Text>
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

        <Text style={styles.label}>Price (INR) *</Text>
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

        <Text style={styles.label}>Start date *</Text>
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

        <Text style={styles.label}>End date *</Text>
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

        {dateField ? (
          <DateTimePicker
            value={dateField === "start" ? startDate : endDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
          />
        ) : null}

        <Text style={styles.label}>Description</Text>
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="transport-pricing-form-active"
            accessibilityLabel="Active pricing"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="transport-pricing-form-submit"
          accessibilityRole="button"
          accessibilityLabel={
            mode === "create" ? "Create transport pricing" : "Save changes"
          }
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
        visible={showLocationPicker}
        title="Location"
        options={locationOptions}
        testID="transport-pricing-location-picker"
        onClose={() => setShowLocationPicker(false)}
        onSelect={(id) => {
          const opt = locationOptions.find((o) => o.id === id);
          setLocationId(id);
          setLocationLabel(opt?.label ?? "");
        }}
      />
      <LookupPickerModal
        visible={showVehiclePicker}
        title="Vehicle type"
        options={vehicleOptions}
        testID="transport-pricing-vehicle-picker"
        onClose={() => setShowVehiclePicker(false)}
        onSelect={(id) => {
          const opt = vehicleOptions.find((o) => o.id === id);
          setVehicleTypeId(id);
          setVehicleTypeName(opt?.label ?? "");
        }}
      />
    </KeyboardAvoidingView>
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
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
  chipRow: { flexDirection: "row", gap: Spacing.sm, marginTop: 4 },
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
