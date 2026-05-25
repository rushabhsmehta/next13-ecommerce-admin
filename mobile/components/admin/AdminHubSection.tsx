import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { AdminNavCard } from "./AdminNavCard";

export type AdminHubNavItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
};

export interface AdminHubSectionProps {
  id: string;
  title: string;
  items: AdminHubNavItem[];
  onPressItem: (item: AdminHubNavItem) => void;
  testID?: string;
}

export function AdminHubSection({
  id,
  title,
  items,
  onPressItem,
  testID,
}: AdminHubSectionProps) {
  const tid = testID ?? `admin-hub-section-${id}`;
  if (!items.length) return null;

  return (
    <View style={styles.wrap} testID={tid}>
      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <AdminNavCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            accent={item.accent}
            testID={`${tid}-item-${item.id}`}
            onPress={() => onPressItem(item)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  heading: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.md,
  },
});
