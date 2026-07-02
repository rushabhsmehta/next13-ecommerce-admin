import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  pricingGroupSubtitle,
  type PricingGroupRow,
  type PricingSeasonGroup as PricingSeasonGroupData,
} from "@/lib/pricing-season-groups";

export interface PricingSeasonGroupProps<T extends PricingGroupRow> {
  group: PricingSeasonGroupData<T>;
  renderItem: (item: T) => ReactNode;
  defaultExpanded?: boolean;
  testID?: string;
}

export function PricingSeasonGroup<T extends PricingGroupRow>({
  group,
  renderItem,
  defaultExpanded = false,
  testID,
}: PricingSeasonGroupProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tid = testID ?? `pricing-season-group-${group.key}`;
  const subtitle = pricingGroupSubtitle(group);

  return (
    <View style={styles.wrap} testID={tid}>
      <Pressable
        testID={`${tid}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={`${group.title}, ${subtitle}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {group.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.textTertiary}
          accessibilityElementsHidden
        />
      </Pressable>
      {expanded ? (
        <View style={styles.list}>{group.items.map((item) => renderItem(item))}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  headerPressed: { opacity: 0.85 },
  headerText: { flex: 1, gap: Spacing.xs },
  title: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
});
