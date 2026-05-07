import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface MetaChipProps {
  label: string;
  icon?: IoniconName;
  variant?: "soft" | "outline" | "solid";
  style?: ViewStyle;
}

export function MetaChip({ label, icon, variant = "soft", style }: MetaChipProps) {
  const wrapStyle =
    variant === "outline"
      ? styles.outline
      : variant === "solid"
      ? styles.solid
      : styles.soft;
  const textStyle =
    variant === "solid" ? styles.textOnSolid : styles.textOnSoft;
  const iconColor = variant === "solid" ? "#fff" : Colors.primary;
  return (
    <View style={[styles.base, wrapStyle, style]}>
      {icon && <Ionicons name={icon} size={12} color={iconColor} />}
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  soft: { backgroundColor: Colors.primarySoft },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  solid: { backgroundColor: Colors.primary },
  text: { fontSize: FontSize.xs, fontWeight: "600" },
  textOnSoft: { color: Colors.primary },
  textOnSolid: { color: "#fff" },
});
