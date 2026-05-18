import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import { DateField } from "@/components/ui/DateField";
import { lookupLabel, type InquiryFormLookups } from "@/lib/inquiry-lookups";

export interface TransportDraftRow {
  localId: string;
  vehicleTypeId: string;
  quantity: number;
  isAirportPickupRequired: boolean;
  isAirportDropRequired: boolean;
  pickupLocation: string;
  dropLocation: string;
  requirementDate: string;
  notes: string;
}

function newLocalId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  lookups: InquiryFormLookups;
  rows: TransportDraftRow[];
  onChangeRows: (rows: TransportDraftRow[]) => void;
}

export function TransportDetailsEditor({ lookups, rows, onChangeRows }: Props) {
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [draftVehicleId, setDraftVehicleId] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftPickup, setDraftPickup] = useState("");
  const [draftDrop, setDraftDrop] = useState("");
  const [draftReqDate, setDraftReqDate] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftPickupAirport, setDraftPickupAirport] = useState(false);
  const [draftDropAirport, setDraftDropAirport] = useState(false);

  function resetDraft() {
    setDraftVehicleId("");
    setDraftQty("1");
    setDraftPickup("");
    setDraftDrop("");
    setDraftReqDate("");
    setDraftNotes("");
    setDraftPickupAirport(false);
    setDraftDropAirport(false);
  }

  function addRow() {
    if (!draftVehicleId) return;
    const qty = Math.max(1, parseInt(draftQty, 10) || 1);
    onChangeRows([
      ...rows,
      {
        localId: newLocalId(),
        vehicleTypeId: draftVehicleId,
        quantity: qty,
        isAirportPickupRequired: draftPickupAirport,
        isAirportDropRequired: draftDropAirport,
        pickupLocation: draftPickup.trim(),
        dropLocation: draftDrop.trim(),
        requirementDate: draftReqDate.trim(),
        notes: draftNotes.trim(),
      },
    ]);
    resetDraft();
  }

  function removeRow(localId: string) {
    onChangeRows(rows.filter((r) => r.localId !== localId));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Transport</Text>
      <Text style={styles.hint}>Optional — vehicle, pickup/drop, requirement date.</Text>

      {rows.map((row) => (
        <View key={row.localId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {lookupLabel(lookups.vehicleTypes, row.vehicleTypeId)} × {row.quantity}
            </Text>
            <TouchableOpacity
              testID={`transport-remove-${row.localId}`}
              accessibilityRole="button"
              accessibilityLabel="Remove transport row"
              onPress={() => removeRow(row.localId)}
              hitSlop={10}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardMeta}>
            Airport pickup: {row.isAirportPickupRequired ? "Yes" : "No"} · Drop:{" "}
            {row.isAirportDropRequired ? "Yes" : "No"}
          </Text>
          {row.pickupLocation ? (
            <Text style={styles.cardMeta}>Pickup: {row.pickupLocation}</Text>
          ) : null}
          {row.dropLocation ? <Text style={styles.cardMeta}>Drop: {row.dropLocation}</Text> : null}
          {row.requirementDate ? (
            <Text style={styles.cardMeta}>Date: {row.requirementDate}</Text>
          ) : null}
          {row.notes ? <Text style={styles.cardMeta}>Notes: {row.notes}</Text> : null}
        </View>
      ))}

      <Text style={styles.subLabel}>Add transport requirement</Text>
      <TouchableOpacity
        style={styles.pickBtn}
        testID="pick-vehicle-type"
        accessibilityRole="button"
        accessibilityLabel="Choose vehicle type"
        onPress={() => setVehiclePickerOpen(true)}
      >
        <Text style={draftVehicleId ? styles.pickBtnText : styles.pickBtnPlaceholder}>
          {draftVehicleId
            ? lookupLabel(lookups.vehicleTypes, draftVehicleId)
            : "Vehicle type — tap to choose"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.miniLabel}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={draftQty}
        onChangeText={(t) => setDraftQty(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        testID="transport-draft-qty"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Airport pickup</Text>
        <Switch
          value={draftPickupAirport}
          onValueChange={setDraftPickupAirport}
          trackColor={{ false: Colors.border, true: Colors.primaryBg }}
          thumbColor={draftPickupAirport ? Colors.primary : Colors.textTertiary}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Airport drop</Text>
        <Switch
          value={draftDropAirport}
          onValueChange={setDraftDropAirport}
          trackColor={{ false: Colors.border, true: Colors.primaryBg }}
          thumbColor={draftDropAirport ? Colors.primary : Colors.textTertiary}
        />
      </View>

      <Text style={styles.miniLabel}>Pickup location (optional)</Text>
      <TextInput style={styles.input} value={draftPickup} onChangeText={setDraftPickup} />
      <Text style={styles.miniLabel}>Drop location (optional)</Text>
      <TextInput style={styles.input} value={draftDrop} onChangeText={setDraftDrop} />

      <Text style={styles.miniLabel}>Requirement date (optional)</Text>
      <DateField
        style={styles.input}
        value={draftReqDate}
        onChange={setDraftReqDate}
        placeholder="Choose requirement date"
        testID="transport-draft-requirement-date"
        accessibilityLabel="Transport requirement date"
      />

      <Text style={styles.miniLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={draftNotes}
        onChangeText={setDraftNotes}
        multiline
      />

      <TouchableOpacity
        style={[styles.addSaved, !draftVehicleId ? styles.addSavedDisabled : null]}
        disabled={!draftVehicleId}
        testID="transport-add-save"
        accessibilityRole="button"
        accessibilityLabel="Save transport row to list"
        onPress={addRow}
      >
        <Text style={styles.addSavedText}>Add to list</Text>
      </TouchableOpacity>

      <LookupPickerModal
        visible={vehiclePickerOpen}
        title="Vehicle type"
        options={lookups.vehicleTypes}
        onClose={() => setVehiclePickerOpen(false)}
        testID="transport-vehicle-picker"
        onSelect={(id) => {
          setDraftVehicleId(id);
          setVehiclePickerOpen(false);
        }}
      />
    </View>
  );
}

export default function TransportDetailsEditorRoutePlaceholder() {
  return null;
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.lg, gap: 4 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  hint: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.sm },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontWeight: "700", color: Colors.text, fontSize: FontSize.sm },
  cardMeta: { marginTop: 4, fontSize: FontSize.xs, color: Colors.textSecondary },
  subLabel: { marginTop: Spacing.md, fontWeight: "600", color: Colors.textSecondary, fontSize: FontSize.sm },
  miniLabel: { marginTop: 8, fontWeight: "600", color: Colors.textTertiary, fontSize: FontSize.xs },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: Colors.background,
  },
  pickBtnText: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  pickBtnPlaceholder: { flex: 1, fontSize: FontSize.sm, color: Colors.textTertiary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginTop: 4,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: { minHeight: 64, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  addSaved: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addSavedDisabled: { opacity: 0.45 },
  addSavedText: { fontWeight: "700", color: Colors.text, fontSize: FontSize.sm },
});
