import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

export type MessageAction = "reply" | "copy" | "edit" | "delete";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAction: (action: MessageAction) => void;
  canEdit: boolean;
  canDelete: boolean;
  hasContent: boolean;
}

export function MessageActions({
  visible,
  onClose,
  onAction,
  canEdit,
  canDelete,
  hasContent,
}: Props) {
  type Item = {
    kind: MessageAction;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    danger?: boolean;
    show: boolean;
  };
  const items: Item[] = (
    [
      { kind: "reply", label: "Reply", icon: "arrow-undo-outline", show: true },
      { kind: "copy", label: "Copy", icon: "copy-outline", show: hasContent },
      { kind: "edit", label: "Edit", icon: "create-outline", show: canEdit },
      { kind: "delete", label: "Delete", icon: "trash-outline", show: canDelete, danger: true },
    ] satisfies Item[]
  ).filter((i) => i.show);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.kind}
              onPress={() => {
                onClose();
                onAction(item.kind);
              }}
              style={[styles.row, i === items.length - 1 && styles.rowLast]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? Colors.error : Colors.text}
              />
              <Text
                style={[styles.rowText, item.danger ? styles.rowTextDanger : null]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { fontSize: 16, color: Colors.text, fontWeight: "500" },
  rowTextDanger: { color: Colors.error },
});
