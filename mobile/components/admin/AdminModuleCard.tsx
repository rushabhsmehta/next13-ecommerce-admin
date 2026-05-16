import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileAdminModule } from "@/hooks/useCurrentUser";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { AdminStatusPill } from "./AdminStatusPill";

/** Badges only when they change behavior expectations (not plain “Ready”). */
function toolBadge(
  module: MobileAdminModule
): { label: string; variant: "offline" | "warning" | "muted" } | null {
  if (module.offlinePolicy === "online_only") {
    return { label: "Online only", variant: "offline" };
  }
  if (module.status === "in-development") {
    return { label: "In progress", variant: "warning" };
  }
  if (module.status === "planned") {
    return { label: "Planned", variant: "muted" };
  }
  if (module.status === "restricted") {
    return { label: "Restricted", variant: "muted" };
  }
  return null;
}

export interface AdminModuleCardProps {
  module: MobileAdminModule;
  onPress: () => void;
  testID?: string;
  /** Tools list: short row, minimal chrome */
  variant?: "default" | "tool";
}

export function AdminModuleCard({
  module,
  onPress,
  testID,
  variant = "default",
}: AdminModuleCardProps) {
  const tid = testID ?? `admin-module-${module.id}`;
  const isTool = variant === "tool";
  const badge = toolBadge(module);

  return (
    <Pressable
      testID={tid}
      accessibilityRole="button"
      accessibilityLabel={`Open ${module.title}`}
      accessibilityHint={module.acceptanceTarget}
      onPress={onPress}
      style={({ pressed }) => [styles.card, isTool && styles.cardTool, pressed && styles.pressed]}
    >
      <View style={[styles.icon, isTool && styles.iconTool]}>
        <Ionicons
          name={module.icon as never}
          size={isTool ? 20 : 22}
          color={Colors.primary}
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isTool && styles.titleTool]} numberOfLines={1} allowFontScaling={false}>
            {module.title}
          </Text>
          {badge ? (
            <AdminStatusPill variant={badge.variant} label={badge.label} compact testID={`${tid}-badge`} />
          ) : null}
        </View>
        {(!isTool || module.description.trim().length > 0) && (
          <Text
            style={[styles.description, isTool && styles.descriptionTool]}
            numberOfLines={isTool ? 1 : 2}
            allowFontScaling={false}
          >
            {module.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 56,
  },
  cardTool: {
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.xs,
    minHeight: 48,
    alignItems: "center",
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTool: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  body: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    flexWrap: "nowrap",
  },
  title: {
    flexShrink: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "800",
  },
  titleTool: {
    fontSize: FontSize.sm,
    fontWeight: "800",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  descriptionTool: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
});
