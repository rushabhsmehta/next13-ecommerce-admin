import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection, AdminPickerSheet } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type {
  PackagePricingComponentRow,
  VariantPackageComponentsResponse,
  VariantPricingQueryContext,
} from "@/lib/tour-query-pricing";
import {
  applySelectedPackageComponents,
  formatINR,
  getOccupancyMultiplier,
} from "@/lib/variant-pricing-utils";
import type { LocalPricingRow } from "./types";
import { makePricingRow } from "./types";

type MealPlanOption = { id: string; name: string };

type Props = {
  queryContext: VariantPricingQueryContext | null | undefined;
  mealPlans: MealPlanOption[];
  mealPlanId: string;
  onMealPlanIdChange: (id: string) => void;
  roomCount: number;
  onRoomCountChange: (count: number) => void;
  fetching: boolean;
  fetchResult: VariantPackageComponentsResponse | null;
  selectedComponentIds: string[];
  onToggleComponent: (componentId: string) => void;
  componentQuantities: Record<string, number>;
  onComponentQuantityChange: (componentId: string, quantity: number) => void;
  onFetch: () => void;
  onApplySelected: (rows: LocalPricingRow[], totalCost: number) => void;
  onApplyAll: (rows: LocalPricingRow[], totalCost: number) => void;
};

function buildRowsFromComponents(
  components: PackagePricingComponentRow[],
  selectedIds: string[],
  quantities: Record<string, number>
): { rows: LocalPricingRow[]; totalCost: number } {
  const mapped = components.map((comp) => ({
    id: comp.id,
    price: comp.price,
    pricingAttributeName: comp.pricingAttributeName,
    pricingAttribute: comp.pricingAttribute,
  }));
  const { items, totalPrice } = applySelectedPackageComponents(
    mapped,
    selectedIds,
    quantities
  );
  return {
    rows: items.map((item, index) => makeRow(item, index)),
    totalCost: totalPrice,
  };
}

function makeRow(
  item: { name: string; price: string; description: string },
  index: number
): LocalPricingRow {
  return makePricingRow(item, index);
}

export function VariantPackagePricingSection({
  queryContext,
  mealPlans,
  mealPlanId,
  onMealPlanIdChange,
  roomCount,
  onRoomCountChange,
  fetching,
  fetchResult,
  selectedComponentIds,
  onToggleComponent,
  componentQuantities,
  onComponentQuantityChange,
  onFetch,
  onApplySelected,
  onApplyAll,
}: Props) {
  const [mealPlanPickerOpen, setMealPlanPickerOpen] = useState(false);
  const mealPlanLabel = useMemo(
    () => mealPlans.find((plan) => plan.id === mealPlanId)?.name ?? "Select meal plan",
    [mealPlanId, mealPlans]
  );

  const canFetch = !!mealPlanId && roomCount > 0 && !!queryContext?.selectedTemplateId;

  const previewTotal = useMemo(() => {
    if (!fetchResult?.components.length || !selectedComponentIds.length) return 0;
    return buildRowsFromComponents(
      fetchResult.components,
      selectedComponentIds,
      componentQuantities
    ).totalCost;
  }, [componentQuantities, fetchResult, selectedComponentIds]);

  return (
    <AdminFormSection title="Package Pricing" testID="variant-pricing-package-section">
      {queryContext?.tourPackageTemplateName ? (
        <View style={styles.templateBanner}>
          <Text style={styles.templateLabel}>Selected tour package</Text>
          <Text style={styles.templateName}>{queryContext.tourPackageTemplateName}</Text>
        </View>
      ) : (
        <Text style={styles.warning}>
          Link a tour package template on the Basic tab before fetching package pricing.
        </Text>
      )}

      <Text style={styles.hint}>
        Fetch pre-defined pricing based on template, number of rooms, and meal plan. Applying
        overwrites the breakdown and total below.
      </Text>

      <Pressable
        testID="variant-pricing-meal-plan-picker"
        accessibilityRole="button"
        accessibilityLabel="Select meal plan"
        style={styles.pickerButton}
        onPress={() => setMealPlanPickerOpen(true)}
      >
        <Text style={styles.pickerLabel}>Meal plan</Text>
        <Text style={styles.pickerValue}>{mealPlanLabel}</Text>
      </Pressable>

      <View style={styles.roomRow}>
        <Text style={styles.roomLabel}>Number of rooms</Text>
        <View style={styles.roomControls}>
          <Pressable
            testID="variant-pricing-room-minus"
            accessibilityRole="button"
            accessibilityLabel="Decrease room count"
            style={styles.stepButton}
            onPress={() => onRoomCountChange(Math.max(1, roomCount - 1))}
          >
            <Ionicons name="remove" size={18} color={Colors.text} />
          </Pressable>
          <Text style={styles.roomValue}>{roomCount}</Text>
          <Pressable
            testID="variant-pricing-room-plus"
            accessibilityRole="button"
            accessibilityLabel="Increase room count"
            style={styles.stepButton}
            onPress={() => onRoomCountChange(roomCount + 1)}
          >
            <Ionicons name="add" size={18} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      <Pressable
        testID="variant-pricing-fetch-components"
        accessibilityRole="button"
        accessibilityLabel="Fetch available pricing components"
        disabled={!canFetch || fetching}
        style={({ pressed }) => [
          styles.primaryButton,
          (!canFetch || fetching) && styles.primaryButtonDisabled,
          pressed && canFetch && !fetching ? styles.pressed : null,
        ]}
        onPress={onFetch}
      >
        {fetching ? (
          <ActivityIndicator size="small" color={Colors.textInverse} />
        ) : (
          <Ionicons name="search-outline" size={16} color={Colors.textInverse} />
        )}
        <Text style={styles.primaryButtonText}>
          {fetching ? "Fetching..." : "Fetch pricing components"}
        </Text>
      </Pressable>

      {fetchResult ? (
        <View style={styles.componentsCard}>
          <Text style={styles.componentsTitle}>
            {fetchResult.components.length} component
            {fetchResult.components.length === 1 ? "" : "s"} found
          </Text>
          {fetchResult.components.map((component) => {
            const selected = selectedComponentIds.includes(component.id);
            const qty = componentQuantities[component.id] || 1;
            const multiplier = getOccupancyMultiplier(component.pricingAttributeName);
            return (
              <View key={component.id} style={styles.componentRow}>
                <Pressable
                  testID={`variant-pricing-component-${component.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Select ${component.pricingAttributeName}`}
                  style={styles.componentHeader}
                  onPress={() => onToggleComponent(component.id)}
                >
                  <Ionicons
                    name={selected ? "checkbox" : "square-outline"}
                    size={20}
                    color={selected ? Colors.primary : Colors.textTertiary}
                  />
                  <View style={styles.componentBody}>
                    <Text style={styles.componentName}>{component.pricingAttributeName}</Text>
                    <Text style={styles.componentMeta}>
                      Base {formatINR(component.price)} · x{multiplier} occupancy
                    </Text>
                  </View>
                </Pressable>
                {selected ? (
                  <View style={styles.qtyRow}>
                    <Text style={styles.qtyLabel}>Rooms</Text>
                    <TextInput
                      testID={`variant-pricing-component-qty-${component.id}`}
                      accessibilityLabel={`Room quantity for ${component.pricingAttributeName}`}
                      value={String(qty)}
                      onChangeText={(text) => {
                        const parsed = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
                        onComponentQuantityChange(
                          component.id,
                          Number.isFinite(parsed) && parsed > 0 ? parsed : 1
                        );
                      }}
                      keyboardType="numeric"
                      style={styles.qtyInput}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          <Text style={styles.previewTotal}>Preview total: {formatINR(previewTotal)}</Text>
          <Pressable
            testID="variant-pricing-apply-selected"
            accessibilityRole="button"
            accessibilityLabel="Apply selected pricing components"
            disabled={!selectedComponentIds.length}
            style={({ pressed }) => [
              styles.applyButton,
              !selectedComponentIds.length && styles.applyButtonDisabled,
              pressed && selectedComponentIds.length ? styles.pressed : null,
            ]}
            onPress={() => {
              if (!fetchResult) return;
              const { rows, totalCost } = buildRowsFromComponents(
                fetchResult.components,
                selectedComponentIds,
                componentQuantities
              );
              onApplySelected(rows, totalCost);
            }}
          >
            <Text style={styles.applyButtonText}>Apply selected components</Text>
          </Pressable>
          <Pressable
            testID="variant-pricing-apply-all"
            accessibilityRole="button"
            accessibilityLabel="Apply all pricing components"
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
            onPress={() => {
              if (!fetchResult) return;
              const allIds = fetchResult.components.map((comp) => comp.id);
              const { rows, totalCost } = buildRowsFromComponents(
                fetchResult.components,
                allIds,
                componentQuantities
              );
              onApplyAll(rows, totalCost);
            }}
          >
            <Text style={styles.secondaryButtonText}>Apply all (legacy)</Text>
          </Pressable>
        </View>
      ) : null}

      <AdminPickerSheet
        visible={mealPlanPickerOpen}
        title="Meal plan"
        options={mealPlans.map((plan) => ({ id: plan.id, label: plan.name }))}
        selectedId={mealPlanId}
        onSelect={(option) => {
          onMealPlanIdChange(option.id);
          setMealPlanPickerOpen(false);
        }}
        onClose={() => setMealPlanPickerOpen(false)}
        testID="variant-pricing-meal-plan-sheet"
      />
    </AdminFormSection>
  );
}

const styles = StyleSheet.create({
  templateBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  templateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  templateName: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  warning: {
    fontSize: FontSize.sm,
    color: Colors.warning,
    lineHeight: 20,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pickerButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  pickerValue: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  roomLabel: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  roomControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  roomValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: FontSize.md,
    fontWeight: "900",
    color: Colors.text,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.textInverse,
  },
  componentsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  componentsTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  componentRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  componentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  componentBody: { flex: 1, minWidth: 0, gap: 2 },
  componentName: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  componentMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  qtyLabel: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textTertiary,
  },
  qtyInput: {
    minWidth: 56,
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  previewTotal: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  applyButton: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  applyButtonDisabled: { opacity: 0.55 },
  applyButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.textInverse,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  pressed: { opacity: 0.88 },
});
