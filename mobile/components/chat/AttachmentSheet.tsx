import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

export type AttachmentKind = "camera" | "photo" | "file" | "location";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: AttachmentKind) => void;
}

const OPTIONS: {
  kind: AttachmentKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { kind: "camera", label: "Camera", icon: "camera-outline", color: "#0EA5E9" },
  { kind: "photo", label: "Photo", icon: "image-outline", color: "#10B981" },
  { kind: "file", label: "File / PDF", icon: "document-attach-outline", color: "#F59E0B" },
  { kind: "location", label: "Location", icon: "location-outline", color: "#EF4444" },
];

export function AttachmentSheet({ visible, onClose, onPick }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Share</Text>
          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.kind}
                style={styles.option}
                onPress={() => {
                  onClose();
                  onPick(opt.kind);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Share ${opt.label}`}
              >
                <View style={[styles.iconCircle, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  option: {
    width: "22%",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
});
