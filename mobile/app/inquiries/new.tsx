import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { associateApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ─── Simple picker modal replacement (inline selection) ──────────────────────
function InlineSelect({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onSelect: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <View style={pickerStyles.wrap}>
      <Pressable style={pickerStyles.trigger} onPress={() => setOpen(!open)}>
        <Text style={[pickerStyles.triggerText, !selected && pickerStyles.placeholder]}>
          {selected ? selected.name : placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={Colors.textTertiary} />
      </Pressable>
      {open && (
        <View style={pickerStyles.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt.id}
              style={[pickerStyles.option, opt.id === value && pickerStyles.optionActive]}
              onPress={() => {
                onSelect(opt.id);
                setOpen(false);
              }}
            >
              <Text style={[pickerStyles.optionText, opt.id === value && pickerStyles.optionTextActive]}>
                {opt.name}
              </Text>
              {opt.id === value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { zIndex: 10 },
  trigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  triggerText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.textTertiary },
  dropdown: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginTop: 4,
    maxHeight: 200,
    overflow: "scroll" as any,
    ...Shadows.medium,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionActive: { backgroundColor: Colors.primaryBg },
  optionText: { fontSize: FontSize.md, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: "700" },
});

// ─── Simple date input (YYYY-MM-DD text field) ────────────────────────────────
function DateField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={fieldStyles.inputWrap}>
      <Ionicons name="calendar-outline" size={18} color={Colors.primary} style={fieldStyles.icon} />
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  icon: { marginLeft: 2 },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
});

// ─── Number stepper ───────────────────────────────────────────────────────────
function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={stepperStyles.row}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.controls}>
        <Pressable
          style={stepperStyles.btn}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Ionicons name="remove" size={16} color={Colors.primary} />
        </Pressable>
        <Text style={stepperStyles.value}>{value}</Text>
        <Pressable style={stepperStyles.btn} onPress={() => onChange(value + 1)}>
          <Ionicons name="add" size={16} color={Colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  label: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    minWidth: 28,
    textAlign: "center",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoomAllocation {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  quantity: number;
  guestNames: string;
  notes: string;
}

interface TransportDetail {
  vehicleTypeId: string;
  quantity: number;
  isAirportPickupRequired: boolean;
  isAirportDropRequired: boolean;
  pickupLocation: string;
  dropLocation: string;
  requirementDate: string;
  notes: string;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function NewInquiryScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Config data for pickers
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [mealPlans, setMealPlans] = useState<{ id: string; name: string }[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<{ id: string; name: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ id: string; name: string }[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Core fields
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [locationId, setLocationId] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  // Pax
  const [numAdults, setNumAdults] = useState(0);
  const [numChildrenAbove11, setNumChildrenAbove11] = useState(0);
  const [numChildren5to11, setNumChildren5to11] = useState(0);
  const [numChildrenBelow5, setNumChildrenBelow5] = useState(0);

  // Room allocations
  const [roomAllocations, setRoomAllocations] = useState<RoomAllocation[]>([]);

  // Transport details
  const [transportDetails, setTransportDetails] = useState<TransportDetail[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [locsData, rtData, mpData, otData, vtData] = await Promise.all([
          associateApi.getLocations(),
          associateApi.getRoomTypes(),
          associateApi.getMealPlans(),
          associateApi.getOccupancyTypes(),
          associateApi.getVehicleTypes(),
        ]);
        setLocations(
          (locsData.destinations || []).map((d: any) => ({ id: d.id, name: d.label }))
        );
        setRoomTypes((rtData || []).map((r: any) => ({ id: r.id, name: r.name })));
        setMealPlans((mpData || []).map((m: any) => ({ id: m.id, name: m.name })));
        setOccupancyTypes((otData || []).map((o: any) => ({ id: o.id, name: o.name })));
        setVehicleTypes((vtData || []).map((v: any) => ({ id: v.id, name: v.name })));
      } catch (err) {
        console.error("Failed to load form config:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  // ── Room allocation helpers ──
  const addRoom = () => {
    setRoomAllocations((prev) => [
      ...prev,
      { roomTypeId: "", occupancyTypeId: "", mealPlanId: "", quantity: 1, guestNames: "", notes: "" },
    ]);
  };
  const updateRoom = (idx: number, field: keyof RoomAllocation, value: any) => {
    setRoomAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const removeRoom = (idx: number) => {
    setRoomAllocations((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Transport detail helpers ──
  const addTransport = () => {
    setTransportDetails((prev) => [
      ...prev,
      {
        vehicleTypeId: "",
        quantity: 1,
        isAirportPickupRequired: false,
        isAirportDropRequired: false,
        pickupLocation: "",
        dropLocation: "",
        requirementDate: journeyDate,
        notes: "",
      },
    ]);
  };
  const updateTransport = (idx: number, field: keyof TransportDetail, value: any) => {
    setTransportDetails((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };
  const removeTransport = (idx: number) => {
    setTransportDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!customerName.trim()) return Alert.alert("Required", "Customer name is required.");
    if (!customerMobile.trim()) return Alert.alert("Required", "Customer mobile is required.");
    if (!locationId) return Alert.alert("Required", "Please select a destination.");
    if (!journeyDate.trim()) return Alert.alert("Required", "Journey date is required (YYYY-MM-DD).");

    // Validate room allocations have required fields
    for (let i = 0; i < roomAllocations.length; i++) {
      const r = roomAllocations[i];
      if (!r.roomTypeId || !r.occupancyTypeId) {
        return Alert.alert("Required", `Room ${i + 1}: room type and occupancy type are required.`);
      }
    }
    // Validate transport details
    for (let i = 0; i < transportDetails.length; i++) {
      const t = transportDetails[i];
      if (!t.vehicleTypeId) return Alert.alert("Required", `Vehicle ${i + 1}: vehicle type is required.`);
      if (!t.requirementDate.trim()) return Alert.alert("Required", `Vehicle ${i + 1}: requirement date is required.`);
    }

    if (!token) return;
    setSubmitting(true);
    try {
      await associateApi.createInquiry(
        {
          customerName: customerName.trim(),
          customerMobileNumber: customerMobile.trim(),
          locationId,
          journeyDate,
          numAdults,
          numChildrenAbove11,
          numChildren5to11,
          numChildrenBelow5,
          remarks: remarks.trim() || undefined,
          nextFollowUpDate: nextFollowUpDate.trim() || undefined,
          roomAllocations: roomAllocations.length ? roomAllocations : undefined,
          transportDetails: transportDetails.length ? transportDetails : undefined,
        },
        token
      );
      Alert.alert("Success", "Inquiry submitted successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (configLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* ── Customer Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Customer Name *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Full name"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
              <TextInput
                style={styles.input}
                value={customerMobile}
                onChangeText={setCustomerMobile}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* ── Trip Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Destination *</Text>
            <InlineSelect
              label="Destination"
              value={locationId}
              options={locations}
              onSelect={setLocationId}
              placeholder="Select destination"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Journey Date * (YYYY-MM-DD)</Text>
            <DateField
              value={journeyDate}
              onChange={setJourneyDate}
              placeholder="e.g. 2025-12-25"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Next Follow-up Date (YYYY-MM-DD)</Text>
            <DateField
              value={nextFollowUpDate}
              onChange={setNextFollowUpDate}
              placeholder="e.g. 2025-11-01"
            />
          </View>
        </View>

        {/* ── Travellers ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travellers</Text>
          <Stepper label="Adults" value={numAdults} onChange={setNumAdults} />
          <View style={styles.divider} />
          <Stepper label="Children (above 11)" value={numChildrenAbove11} onChange={setNumChildrenAbove11} />
          <View style={styles.divider} />
          <Stepper label="Children (5–11)" value={numChildren5to11} onChange={setNumChildren5to11} />
          <View style={styles.divider} />
          <Stepper label="Children (below 5)" value={numChildrenBelow5} onChange={setNumChildrenBelow5} />
        </View>

        {/* ── Room Allocations ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Room Allocations</Text>
            <Pressable style={styles.addBtn} onPress={addRoom}>
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add Room</Text>
            </Pressable>
          </View>

          {roomAllocations.length === 0 && (
            <Text style={styles.emptyHint}>No rooms added yet. Tap "Add Room" to add.</Text>
          )}

          {roomAllocations.map((room, idx) => (
            <View key={idx} style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <Text style={styles.subCardTitle}>Room {idx + 1}</Text>
                <Pressable onPress={() => removeRoom(idx)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Room Type *</Text>
                <InlineSelect
                  label="Room Type"
                  value={room.roomTypeId}
                  options={roomTypes}
                  onSelect={(v) => updateRoom(idx, "roomTypeId", v)}
                  placeholder="Select room type"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Occupancy Type *</Text>
                <InlineSelect
                  label="Occupancy"
                  value={room.occupancyTypeId}
                  options={occupancyTypes}
                  onSelect={(v) => updateRoom(idx, "occupancyTypeId", v)}
                  placeholder="Select occupancy"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Meal Plan</Text>
                <InlineSelect
                  label="Meal Plan"
                  value={room.mealPlanId}
                  options={mealPlans}
                  onSelect={(v) => updateRoom(idx, "mealPlanId", v)}
                  placeholder="Select meal plan"
                />
              </View>

              <Stepper
                label="Quantity"
                value={room.quantity}
                onChange={(v) => updateRoom(idx, "quantity", v)}
              />

              <View style={styles.field}>
                <Text style={styles.labelSm}>Guest Names</Text>
                <TextInput
                  style={styles.textArea}
                  value={room.guestNames}
                  onChangeText={(v) => updateRoom(idx, "guestNames", v)}
                  placeholder="Names of guests (optional)"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Notes</Text>
                <TextInput
                  style={styles.textArea}
                  value={room.notes}
                  onChangeText={(v) => updateRoom(idx, "notes", v)}
                  placeholder="Special requirements (optional)"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          ))}
        </View>

        {/* ── Transport Details ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Transport</Text>
            <Pressable style={styles.addBtn} onPress={addTransport}>
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add Vehicle</Text>
            </Pressable>
          </View>

          {transportDetails.length === 0 && (
            <Text style={styles.emptyHint}>No vehicles added yet. Tap "Add Vehicle" to add.</Text>
          )}

          {transportDetails.map((transport, idx) => (
            <View key={idx} style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <Text style={styles.subCardTitle}>Vehicle {idx + 1}</Text>
                <Pressable onPress={() => removeTransport(idx)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Vehicle Type *</Text>
                <InlineSelect
                  label="Vehicle Type"
                  value={transport.vehicleTypeId}
                  options={vehicleTypes}
                  onSelect={(v) => updateTransport(idx, "vehicleTypeId", v)}
                  placeholder="Select vehicle type"
                />
              </View>

              <Stepper
                label="Quantity"
                value={transport.quantity}
                onChange={(v) => updateTransport(idx, "quantity", v)}
              />

              <View style={styles.field}>
                <Text style={styles.labelSm}>Requirement Date * (YYYY-MM-DD)</Text>
                <DateField
                  value={transport.requirementDate}
                  onChange={(v) => updateTransport(idx, "requirementDate", v)}
                  placeholder="e.g. 2025-12-25"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.labelSm}>Airport Pickup Required</Text>
                <Switch
                  value={transport.isAirportPickupRequired}
                  onValueChange={(v) => updateTransport(idx, "isAirportPickupRequired", v)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={transport.isAirportPickupRequired ? Colors.primary : Colors.textTertiary}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.labelSm}>Airport Drop Required</Text>
                <Switch
                  value={transport.isAirportDropRequired}
                  onValueChange={(v) => updateTransport(idx, "isAirportDropRequired", v)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={transport.isAirportDropRequired ? Colors.primary : Colors.textTertiary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Pickup Location</Text>
                <TextInput
                  style={styles.inputPlain}
                  value={transport.pickupLocation}
                  onChangeText={(v) => updateTransport(idx, "pickupLocation", v)}
                  placeholder="Pickup address (optional)"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Drop Location</Text>
                <TextInput
                  style={styles.inputPlain}
                  value={transport.dropLocation}
                  onChangeText={(v) => updateTransport(idx, "dropLocation", v)}
                  placeholder="Drop address (optional)"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.labelSm}>Notes</Text>
                <TextInput
                  style={styles.textArea}
                  value={transport.notes}
                  onChangeText={(v) => updateTransport(idx, "notes", v)}
                  placeholder="Any special requests (optional)"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          ))}
        </View>

        {/* ── Remarks ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Remarks</Text>
          <TextInput
            style={styles.textAreaLg}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional notes or special requirements..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* ── Submit ── */}
        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Inquiry</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },

  // Section
  section: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.light,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  // Fields
  field: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  labelSm: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  inputPlain: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 64,
    textAlignVertical: "top",
  },
  textAreaLg: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },

  // Sub cards (rooms, transport)
  subCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subCardTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },

  emptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },

  // Submit button
  submitBtn: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg + 4,
  },
  submitBtnText: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
  },
});
