import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface Props {
  senderName: string;
  preview: string;
  onCancel: () => void;
}

export function ReplyPreview({ senderName, preview, onCancel }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          Replying to {senderName}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel reply"
        hitSlop={10}
      >
        <Ionicons name="close" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: "#F8FAFC",
  },
  bar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  text: { flex: 1 },
  name: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  preview: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
});
