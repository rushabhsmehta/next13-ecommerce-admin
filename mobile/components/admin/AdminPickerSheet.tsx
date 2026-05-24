import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

const OPTION_ROW_HEIGHT = 57;

export interface AdminPickerOption {
  id: string;
  label: string;
  subtitle?: string;
}

export interface AdminPickerSheetProps {
  visible: boolean;
  title: string;
  options: AdminPickerOption[];
  selectedId?: string | null;
  onSelect: (option: AdminPickerOption) => void;
  onClose: () => void;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  testID?: string;
}

export function AdminPickerSheet({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  loading,
  searchable = true,
  searchPlaceholder = "Search",
  emptyLabel = "No matches",
  testID = "admin-picker-sheet",
}: AdminPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>
            {title}
          </Text>
          <Pressable
            testID={`${testID}-close`}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={Colors.text} accessibilityElementsHidden />
          </Pressable>
        </View>
        {searchable ? (
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={Colors.textTertiary} accessibilityElementsHidden />
            <TextInput
              testID={`${testID}-search`}
              accessibilityLabel={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {query ? (
              <Pressable
                testID={`${testID}-search-clear`}
                accessibilityRole="button"
                accessibilityLabel="Clear picker search"
                onPress={() => setQuery("")}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={14}
            maxToRenderPerBatch={16}
            windowSize={8}
            removeClippedSubviews
            getItemLayout={(_, index) => ({
              length: OPTION_ROW_HEIGHT,
              offset: OPTION_ROW_HEIGHT * index,
              index,
            })}
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
            ListHeaderComponent={
              selectedOption ? (
                <View style={styles.selectedSummary}>
                  <Text style={styles.selectedEyebrow} allowFontScaling={false}>
                    Selected
                  </Text>
                  <Text style={styles.selectedLabel} allowFontScaling={false} numberOfLines={1}>
                    {selectedOption.label}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.empty} allowFontScaling={false}>
                {emptyLabel}
              </Text>
            }
            renderItem={({ item, index }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  testID={`${testID}-option-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed, selected && styles.optionSelected]}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel} allowFontScaling={false}>
                      {item.label}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.optionSubtitle} allowFontScaling={false}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} accessibilityElementsHidden />
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    textAlign: "center",
    padding: Spacing.xl,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  selectedSummary: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  selectedEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  selectedLabel: {
    marginTop: 2,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: OPTION_ROW_HEIGHT,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  optionSelected: { backgroundColor: Colors.primaryBg },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  optionSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary },
  pressed: { backgroundColor: Colors.surfaceAlt },
});
