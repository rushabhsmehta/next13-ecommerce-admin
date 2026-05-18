import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminDangerAction {
  id: string;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export interface AdminDangerZoneProps {
  title?: string;
  actions: AdminDangerAction[];
  testID?: string;
}

export function AdminDangerZone({
  title = "Danger zone",
  actions,
  testID = "admin-danger-zone",
}: AdminDangerZoneProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>
        {title}
      </Text>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          testID={action.testID ?? `${testID}-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.hint}
          accessibilityState={{ disabled: !!action.disabled }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            action.disabled && styles.actionDisabled,
            pressed && !action.disabled && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} accessibilityElementsHidden />
          <Text style={styles.actionText} allowFontScaling={false}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.error,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionDisabled: { opacity: 0.45 },
  actionText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.error,
  },
  pressed: { opacity: 0.85 },
});
