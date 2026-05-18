import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminCommandBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchTestID?: string;
  /** Filter / sort / quick-action slot on the right */
  trailing?: ReactNode;
  onFilterPress?: () => void;
  filterAccessibilityLabel?: string;
  filterActive?: boolean;
  testID?: string;
}

export function AdminCommandBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  searchTestID = "admin-command-search",
  trailing,
  onFilterPress,
  filterAccessibilityLabel = "Open filters",
  filterActive = false,
  testID = "admin-command-bar",
}: AdminCommandBarProps) {
  const showSearch = onSearchChange !== undefined;

  return (
    <View style={styles.wrap} testID={testID}>
      {showSearch ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} accessibilityElementsHidden />
          <TextInput
            testID={searchTestID}
            accessibilityLabel={searchPlaceholder}
            accessibilityHint="Filters the list as you type."
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchValue ? (
            <Pressable
              testID={`${searchTestID}-clear`}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onSearchChange?.("")}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {onFilterPress ? (
        <Pressable
          testID={`${testID}-filter`}
          accessibilityRole="button"
          accessibilityLabel={filterAccessibilityLabel}
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.filterBtn,
            filterActive && styles.filterBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filterActive ? Colors.primary : Colors.textSecondary}
            accessibilityElementsHidden
          />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  pressed: { opacity: 0.85 },
});
