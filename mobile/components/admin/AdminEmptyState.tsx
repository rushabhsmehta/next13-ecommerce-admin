import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  testID?: string;
}

export function AdminEmptyState({
  icon = "file-tray-outline",
  title,
  body,
  actionLabel,
  onActionPress,
  testID = "admin-empty-state",
}: AdminEmptyStateProps) {
  return (
    <View
      style={styles.root}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={[title, body].filter(Boolean).join(". ")}
    >
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={28} color={Colors.textTertiary} accessibilityElementsHidden />
      </View>
      <Text style={styles.title} allowFontScaling={false}>
        {title}
      </Text>
      {body ? (
        <Text style={styles.body} allowFontScaling={false}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint="Runs the suggested next step."
          style={styles.actionBtn}
          onPress={onActionPress}
          testID={`${testID}-action`}
        >
          <Text style={styles.actionText} allowFontScaling={false}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  actionText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: FontSize.sm,
  },
});
