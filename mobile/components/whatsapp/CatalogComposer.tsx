import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { travelApi } from "@/lib/api";
import { whatsappApi } from "@/lib/whatsapp-api";

interface TourPackage {
  id: string;
  tourPackageName: string;
  locationId?: string;
  images?: { url: string }[];
  tourPackageType?: string;
  numDaysNight?: string;
  price?: number;
}

interface Props {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onSent: () => void;
}

export function CatalogComposer({ visible, phone, onClose, onSent }: Props) {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TourPackage | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    travelApi
      .getPackages({ limit: 50 })
      .then((data: any) => setPackages(Array.isArray(data) ? data : data?.packages ?? []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const message = [
        `📦 *${selected.tourPackageName}*`,
        selected.numDaysNight ? `🗓 ${selected.numDaysNight}` : null,
        selected.price ? `💰 ₹${selected.price.toLocaleString("en-IN")}` : null,
        "",
        "Contact us to book this package!",
      ]
        .filter(Boolean)
        .join("\n");

      await whatsappApi.sendText(phone, message);
      onSent();
      onClose();
      setSelected(null);
    } catch (err: any) {
      Alert.alert("Send Failed", err.message || "Could not send package.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Send Tour Package</Text>
          <Pressable onPress={() => { setSelected(null); onClose(); }}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No packages available</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={packages}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => {
                const imageUrl = item.images?.[0]?.url;
                const isSelected = selected?.id === item.id;
                return (
                  <Pressable
                    style={[styles.packageRow, isSelected && styles.packageRowSelected]}
                    onPress={() => setSelected(isSelected ? null : item)}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Ionicons name="image-outline" size={24} color={Colors.textTertiary} />
                      </View>
                    )}
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName} numberOfLines={2}>
                        {item.tourPackageName}
                      </Text>
                      <View style={styles.packageMeta}>
                        {item.numDaysNight && (
                          <Text style={styles.metaText}>{item.numDaysNight}</Text>
                        )}
                        {item.price && (
                          <Text style={styles.priceText}>
                            ₹{item.price.toLocaleString("en-IN")}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#25D366" />
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              style={styles.list}
            />

            {selected && (
              <View style={styles.footer}>
                <Pressable
                  style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.sendBtnText}>
                        Send {selected.tourPackageName.slice(0, 20)}
                        {selected.tourPackageName.length > 20 ? "…" : ""}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    minHeight: 300,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textTertiary },
  list: { flex: 1 },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  packageRowSelected: { backgroundColor: "#f0fdf4" },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  packageInfo: { flex: 1, gap: 4 },
  packageName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 20,
  },
  packageMeta: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  priceText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  sep: { height: 1, backgroundColor: Colors.borderLight },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#25D366",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
});
