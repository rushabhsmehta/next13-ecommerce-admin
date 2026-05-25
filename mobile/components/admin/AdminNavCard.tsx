import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
export interface AdminNavCardProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  accent?: boolean;
}

export function AdminNavCard({
  title,
  subtitle,
  icon,
  onPress,
  testID,
  accent = false,
}: AdminNavCardProps) {
  const tid = testID ?? `admin-nav-card-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const iconColor = accent ? Colors.textInverse : Colors.primary;
  const iconBg = accent ? Colors.primary : Colors.primaryBg;

  return (
    <Pressable
      testID={tid}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        accent && styles.cardAccent,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} accessibilityElementsHidden />
      </View>
      <Text style={[styles.title, accent && styles.titleAccent]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.subtitle, accent && styles.subtitleAccent]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    minHeight: 108,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  cardAccent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 18,
  },
  titleAccent: {
    color: Colors.textInverse,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 14,
    marginTop: -2,
  },
  subtitleAccent: {
    color: "rgba(255,255,255,0.85)",
  },
});
