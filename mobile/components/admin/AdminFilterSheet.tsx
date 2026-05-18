import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminFilterSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onApply?: () => void;
  onReset?: () => void;
  children: ReactNode;
  testID?: string;
}

export function AdminFilterSheet({
  visible,
  title = "Filters",
  onClose,
  onApply,
  onReset,
  children,
  testID = "admin-filter-sheet",
}: AdminFilterSheetProps) {
  const insets = useSafeAreaInsets();

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
            accessibilityLabel="Close filters"
            onPress={onClose}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={Colors.text} accessibilityElementsHidden />
          </Pressable>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          {onReset ? (
            <Pressable
              testID={`${testID}-reset`}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              onPress={onReset}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText} allowFontScaling={false}>
                Reset
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            testID={`${testID}-apply`}
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
            onPress={() => {
              onApply?.();
              onClose();
            }}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText} allowFontScaling={false}>
              Apply
            </Text>
          </Pressable>
        </View>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  title: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  primaryText: { color: Colors.textInverse, fontWeight: "800", fontSize: FontSize.md },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "800", fontSize: FontSize.md, color: Colors.text },
  pressed: { opacity: 0.88 },
});
