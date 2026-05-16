import { Pressable, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
  testID?: string;
  /** Uppercase tertiary eyebrow suited to dense dashboards */
  uppercaseEyebrow?: boolean;
  /** Reduce vertical rhythm for dense dashboards */
  dense?: boolean;
}

export function AdminSection({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
  testID,
  uppercaseEyebrow,
  dense,
}: AdminSectionProps) {
  return (
    <View
      style={[styles.section, dense && styles.sectionDense]}
      testID={testID}
      accessibilityRole="none"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text
            style={[styles.title, uppercaseEyebrow ? styles.titleMuted : null]}
            accessibilityRole="header"
            allowFontScaling={false}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} allowFontScaling={false}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            hitSlop={8}
            style={styles.actionGhost}
            testID={testID ? `${testID}-action` : undefined}
          >
            <Text style={styles.actionGhostText} allowFontScaling={false}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionDense: {
    marginTop: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: 2,
  },
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.2,
  },
  titleMuted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.72,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
  actionGhost: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  actionGhostText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
});
