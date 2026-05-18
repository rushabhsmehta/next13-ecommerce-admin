import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import { lookupLabel, type InquiryFormLookups } from "@/lib/inquiry-lookups";

export interface RoomAllocationDraftRow {
  localId: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  quantity: number;
  guestNames: string;
  notes: string;
}

function newLocalId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  lookups: InquiryFormLookups;
  rows: RoomAllocationDraftRow[];
  onChangeRows: (rows: RoomAllocationDraftRow[]) => void;
}

type PickKind = "roomType" | "occupancy" | "meal" | null;

export function RoomAllocationsEditor({ lookups, rows, onChangeRows }: Props) {
  const [pickKind, setPickKind] = useState<PickKind>(null);
  const [draftRoomTypeId, setDraftRoomTypeId] = useState("");
  const [draftOccupancyId, setDraftOccupancyId] = useState("");
  const [draftMealPlanId, setDraftMealPlanId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState("1");
  const [draftGuests, setDraftGuests] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  function resetDraft() {
    setDraftRoomTypeId("");
    setDraftOccupancyId("");
    setDraftMealPlanId(null);
    setDraftQty("1");
    setDraftGuests("");
    setDraftNotes("");
  }

  function addRow() {
    if (!draftRoomTypeId || !draftOccupancyId) {
      return false;
    }
    const qty = Math.max(1, parseInt(draftQty, 10) || 1);
    onChangeRows([
      ...rows,
      {
        localId: newLocalId(),
        roomTypeId: draftRoomTypeId,
        occupancyTypeId: draftOccupancyId,
        mealPlanId: draftMealPlanId?.trim() ? draftMealPlanId : null,
        quantity: qty,
        guestNames: draftGuests.trim(),
        notes: draftNotes.trim(),
      },
    ]);
    resetDraft();
    return true;
  }

  function removeRow(localId: string) {
    onChangeRows(rows.filter((r) => r.localId !== localId));
  }

  const pickerOptions =
    pickKind === "roomType"
      ? lookups.roomTypes
      : pickKind === "occupancy"
        ? lookups.occupancyTypes
        : pickKind === "meal"
          ? lookups.mealPlans
          : [];

  const pickerTitle =
    pickKind === "roomType"
      ? "Room type"
      : pickKind === "occupancy"
        ? "Occupancy"
        : pickKind === "meal"
          ? "Meal plan"
          : "";

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Room allocations</Text>
      <Text style={styles.hint}>Optional — matches admin inquiry (room type, occupancy, meal plan).</Text>

      {rows.map((row) => (
        <View key={row.localId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {lookupLabel(lookups.roomTypes, row.roomTypeId)} ·{" "}
              {lookupLabel(lookups.occupancyTypes, row.occupancyTypeId)}
            </Text>
            <TouchableOpacity
              testID={`room-alloc-remove-${row.localId}`}
              accessibilityRole="button"
              accessibilityLabel="Remove room allocation"
              onPress={() => removeRow(row.localId)}
              hitSlop={10}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardMeta}>
            Meal:{" "}
            {row.mealPlanId ? lookupLabel(lookups.mealPlans, row.mealPlanId) : "—"} · Qty: {row.quantity}
          </Text>
          {row.guestNames ? <Text style={styles.cardMeta}>Guests: {row.guestNames}</Text> : null}
          {row.notes ? <Text style={styles.cardMeta}>Notes: {row.notes}</Text> : null}
        </View>
      ))}

      <Text style={styles.subLabel}>Add room allocation</Text>
      <TouchableOpacity
        style={styles.pickBtn}
        testID="pick-room-type"
        accessibilityRole="button"
        accessibilityLabel="Choose room type"
        accessibilityHint="Opens searchable list of room types"
        onPress={() => setPickKind("roomType")}
      >
        <Text style={draftRoomTypeId ? styles.pickBtnText : styles.pickBtnPlaceholder}>
          {draftRoomTypeId
            ? lookupLabel(lookups.roomTypes, draftRoomTypeId)
            : "Room type — tap to choose"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.pickBtn}
        testID="pick-occupancy-type"
        accessibilityRole="button"
        accessibilityLabel="Choose occupancy type"
        onPress={() => setPickKind("occupancy")}
      >
        <Text style={draftOccupancyId ? styles.pickBtnText : styles.pickBtnPlaceholder}>
          {draftOccupancyId
            ? lookupLabel(lookups.occupancyTypes, draftOccupancyId)
            : "Occupancy — tap to choose"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.pickBtn}
        testID="pick-meal-plan"
        accessibilityRole="button"
        accessibilityLabel="Choose meal plan optional"
        onPress={() => setPickKind("meal")}
      >
        <Text style={draftMealPlanId ? styles.pickBtnText : styles.pickBtnPlaceholder}>
          {draftMealPlanId ? lookupLabel(lookups.mealPlans, draftMealPlanId) : "Meal plan — optional"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>
      {draftMealPlanId ? (
        <TouchableOpacity onPress={() => setDraftMealPlanId(null)} style={styles.clearMeal}>
          <Text style={styles.clearMealText}>Clear meal plan</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.miniLabel}>Quantity</Text>
      <TextInput
        style={styles.input}
        value={draftQty}
        onChangeText={(t) => setDraftQty(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        testID="room-draft-qty"
      />
      <Text style={styles.miniLabel}>Guest names (optional)</Text>
      <TextInput
        style={styles.input}
        value={draftGuests}
        onChangeText={setDraftGuests}
        testID="room-draft-guests"
      />
      <Text style={styles.miniLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={draftNotes}
        onChangeText={setDraftNotes}
        multiline
        testID="room-draft-notes"
      />
      <TouchableOpacity
        style={[
          styles.addSaved,
          !draftRoomTypeId || !draftOccupancyId ? styles.addSavedDisabled : null,
        ]}
        disabled={!draftRoomTypeId || !draftOccupancyId}
        testID="room-add-save"
        accessibilityRole="button"
        accessibilityLabel="Save room allocation to list"
        onPress={() => {
          addRow();
        }}
      >
        <Text style={styles.addSavedText}>Add to list</Text>
      </TouchableOpacity>

      <LookupPickerModal
        visible={pickKind !== null}
        title={pickerTitle}
        options={pickerOptions}
        onClose={() => setPickKind(null)}
        testID="room-lookup-picker"
        onSelect={(id) => {
          if (pickKind === "roomType") setDraftRoomTypeId(id);
          if (pickKind === "occupancy") setDraftOccupancyId(id);
          if (pickKind === "meal") setDraftMealPlanId(id);
        }}
      />
    </View>
  );
}

export default function RoomAllocationsEditorRoutePlaceholder() {
  return null;
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.md, gap: 4 },
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
  clearMeal: { alignSelf: "flex-start", marginTop: 6 },
  clearMealText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600" },
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
  addSaved: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
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
