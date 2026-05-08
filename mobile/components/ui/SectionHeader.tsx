import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing } from "@/constants/theme";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress?: () => void; testID?: string };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <Pressable
          testID={action.testID}
          onPress={action.onPress}
          accessibilityRole="link"
          accessibilityLabel={`${action.label} ${title}`}
          hitSlop={8}
          style={styles.action}
          disabled={!action.onPress}
        >
          <Text style={[styles.actionLabel, !action.onPress && styles.actionLabelDisabled]}>
            {action.label}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={action.onPress ? Colors.primary : Colors.textTertiary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  titleBlock: { flex: 1, gap: 2 },
  title: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  action: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionLabel: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "600" },
  actionLabelDisabled: { color: Colors.textTertiary },
});
