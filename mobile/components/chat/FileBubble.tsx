import { Linking, TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

interface Props {
  fileUrl: string | null | undefined;
  fileName: string | null | undefined;
  fileSize: number | null | undefined;
  isPdf?: boolean;
  isMine?: boolean;
  uploading?: boolean;
}

function formatBytes(size: number | null | undefined): string {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FileBubble({ fileUrl, fileName, fileSize, isPdf, isMine, uploading }: Props) {
  const onOpen = () => {
    if (fileUrl) Linking.openURL(fileUrl).catch(() => {});
  };

  const iconName = isPdf ? "document-text" : "document-attach";
  const displayName = fileName ?? "Attachment";
  const sizeLabel = formatBytes(fileSize ?? null);

  return (
    <TouchableOpacity
      onPress={onOpen}
      disabled={!fileUrl || uploading}
      activeOpacity={0.7}
      style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${displayName}`}
    >
      <View style={[styles.iconWrap, isPdf ? styles.iconPdf : styles.iconFile]}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name={iconName} size={24} color="#fff" />
        )}
      </View>
      <View style={styles.text}>
        <Text
          style={[styles.name, isMine ? styles.nameMine : styles.nameOther]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {sizeLabel ? (
          <Text style={[styles.size, isMine ? styles.sizeMine : styles.sizeOther]}>
            {sizeLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 200,
    paddingVertical: 4,
  },
  rowMine: {},
  rowOther: {},
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPdf: { backgroundColor: "#EF4444" },
  iconFile: { backgroundColor: "#6366F1" },
  text: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600" },
  nameMine: { color: "#fff" },
  nameOther: { color: Colors.text },
  size: { fontSize: 11, marginTop: 2 },
  sizeMine: { color: "rgba(255,255,255,0.7)" },
  sizeOther: { color: Colors.textTertiary },
});
