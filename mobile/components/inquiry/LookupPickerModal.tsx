import { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

interface Props {
  visible: boolean;
  title: string;
  options: InquiryLookupOption[];
  onClose: () => void;
  onSelect: (id: string) => void;
  testID?: string;
}

export function LookupPickerModal({ visible, title, options, onClose, onSelect, testID }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity
              testID={testID ? `${testID}-close` : undefined}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
              onPress={() => {
                setQ("");
                onClose();
              }}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            testID={testID ? `${testID}-search` : undefined}
            accessibilityLabel={`Search ${title}`}
            style={styles.search}
            placeholder="Search…"
            placeholderTextColor={Colors.textTertiary}
            value={q}
            onChangeText={setQ}
          />
          <FlatList
            style={styles.list}
            testID={testID ? `${testID}-list` : undefined}
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={testID ? `${testID}-item-${item.id}` : undefined}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={styles.row}
                onPress={() => {
                  setQ("");
                  onSelect(item.id);
                  onClose();
                }}
              >
                <Text style={styles.rowText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No matches</Text>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  search: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowText: { flex: 1, fontSize: FontSize.md, color: Colors.text, paddingRight: 8 },
  empty: { textAlign: "center", color: Colors.textTertiary, marginTop: Spacing.xl },
  list: { flex: 1 },
});
