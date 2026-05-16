import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** When set, renders a back affordance next to title block */
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
  /** Right slot — icon buttons etc. */
  rightSlot?: React.ReactNode;
  /** Thin brand accent instead of bulky hero gradient */
  showAccent?: boolean;
  testID?: string;
}

export function AdminHeader({
  title,
  subtitle,
  onBackPress,
  backAccessibilityLabel = "Go back",
  rightSlot,
  showAccent = true,
  testID,
}: AdminHeaderProps) {
  return (
    <View style={styles.wrapper} testID={testID} accessibilityRole="header">
      {showAccent ? (
        <LinearGradient
          colors={[Colors.gradient1, Colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
          accessibilityElementsHidden
        />
      ) : null}
      <View style={styles.row}>
        {onBackPress ? (
          <Pressable
            testID={testID ? `${testID}-back` : "admin-header-back"}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            accessibilityHint="Returns to the previous screen."
            onPress={onBackPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} accessibilityElementsHidden />
          </Pressable>
        ) : null}
        <View style={[styles.titleBlock, !onBackPress && styles.titleBlockInset]}>
          <Text style={styles.title} allowFontScaling={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} allowFontScaling={false}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : <View style={styles.rightSpacer} />}
      </View>
    </View>
  );
}

export function AdminHeaderIconButton(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  testID?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      onPress={props.onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Ionicons name={props.icon} size={18} color={Colors.text} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  accentLine: {
    height: 3,
    borderRadius: BorderRadius.full,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 40,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.78,
    backgroundColor: Colors.surfaceAlt,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  titleBlockInset: {
    paddingLeft: 2,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "700",
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rightSpacer: {
    width: 0,
    height: 38,
  },
});
