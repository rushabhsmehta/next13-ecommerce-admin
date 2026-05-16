import { StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize } from "@/constants/theme";

export interface TripStatusPillProps {
  isArchived: boolean;
  /** Matches list/detail: confirmed when featured flag and not archived */
  isConfirmed: boolean;
  compact?: boolean;
  testID?: string;
}

/**
 * Visible status only: Confirmed, Draft, or Archived.
 */
export function TripStatusPill({
  isArchived,
  isConfirmed,
  compact,
  testID,
}: TripStatusPillProps) {
  const label = isArchived ? "Archived" : isConfirmed ? "Confirmed" : "Draft";
  const tone = isArchived ? "archived" : isConfirmed ? "confirmed" : "draft";
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Trip status ${label}`}
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        tone === "confirmed"
          ? styles.confirmed
          : tone === "archived"
            ? styles.archived
            : styles.draft,
      ]}
    >
      <Text style={[styles.text, compact ? styles.textCompact : null]} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  confirmed: { backgroundColor: "#dcfce7" },
  draft: { backgroundColor: Colors.primaryBg },
  archived: { backgroundColor: Colors.surfaceAlt },
  text: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.text,
    textTransform: "uppercase",
  },
  textCompact: { fontSize: 10 },
});
