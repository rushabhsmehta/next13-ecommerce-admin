import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { LocalPricingRow } from "./types";

type Props = {
  rows: LocalPricingRow[];
  calculatingFromRooms: boolean;
  onLoadDefault: () => void;
  onCalculateFromRooms: () => void;
  onAddRow: () => void;
  onRemoveRow: (localId: string) => void;
  onUpdateRow: (
    localId: string,
    field: "name" | "price" | "description",
    value: string
  ) => void;
};

export function VariantPricingBreakdown({
  rows,
  calculatingFromRooms,
  onLoadDefault,
  onCalculateFromRooms,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: Props) {
  return (
    <AdminFormSection title="Pricing Breakdown" testID="variant-pricing-breakdown-section">
      <View style={styles.actionRow}>
        <Pressable
          testID="variant-pricing-load-default"
          accessibilityRole="button"
          accessibilityLabel="Load default pricing rows"
          style={styles.actionButton}
          onPress={onLoadDefault}
        >
          <Text style={styles.actionButtonText}>Load default</Text>
        </Pressable>
        <Pressable
          testID="variant-pricing-calc-from-rooms"
          accessibilityRole="button"
          accessibilityLabel="Calculate pricing breakdown from rooms"
          disabled={calculatingFromRooms}
          style={[styles.actionButton, calculatingFromRooms && styles.actionButtonDisabled]}
          onPress={onCalculateFromRooms}
        >
          {calculatingFromRooms ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.actionButtonText}>From rooms</Text>
          )}
        </Pressable>
      </View>

      {rows.map((row, index) => (
        <View key={row.localId} style={styles.rowCard}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowIndex}>Item {index + 1}</Text>
            <Pressable
              testID={`variant-pricing-remove-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove pricing item ${index + 1}`}
              style={styles.removeButton}
              onPress={() => onRemoveRow(row.localId)}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </Pressable>
          </View>
          <TextInput
            testID={`variant-pricing-name-${index}`}
            accessibilityLabel={`Pricing item ${index + 1} name`}
            value={String(row.name ?? "")}
            onChangeText={(value) => onUpdateRow(row.localId, "name", value)}
            placeholder="Item name"
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
          />
          <TextInput
            testID={`variant-pricing-price-${index}`}
            accessibilityLabel={`Pricing item ${index + 1} price`}
            value={String(row.price ?? "")}
            onChangeText={(value) => onUpdateRow(row.localId, "price", value)}
            placeholder="Price"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            testID={`variant-pricing-description-${index}`}
            accessibilityLabel={`Pricing item ${index + 1} description`}
            value={String(row.description ?? "")}
            onChangeText={(value) => onUpdateRow(row.localId, "description", value)}
            placeholder="Auto-calculated description"
            placeholderTextColor={Colors.textTertiary}
            multiline
            style={[styles.input, styles.multiline]}
          />
        </View>
      ))}

      <Pressable
        testID="variant-pricing-add-item"
        accessibilityRole="button"
        accessibilityLabel="Add pricing item"
        style={styles.addButton}
        onPress={onAddRow}
      >
        <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
        <Text style={styles.addButtonText}>Add item</Text>
      </Pressable>
    </AdminFormSection>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  actionButtonDisabled: { opacity: 0.55 },
  actionButtonText: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
  },
  rowCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowIndex: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  removeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  multiline: {
    minHeight: 78,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  addButton: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.primary,
  },
});
