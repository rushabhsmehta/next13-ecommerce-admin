import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createWhatsAppMediaLibraryClient,
  type WhatsAppMediaAsset,
} from "@/lib/whatsapp-media-library";

export default function WhatsAppMediaLibraryScreen() {
  return (
    <PermissionGate permission="communications.read">
      <OfflineGate policy="online_only">
        <MediaLibraryInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaLibraryInner() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createWhatsAppMediaLibraryClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<WhatsAppMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await client.list();
        setItems(data.files);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load media library.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ headerTitle: "Media library", headerBackTitle: "Back" });
  }, [navigation]);

  async function uploadFromPicker(picker: "image" | "document") {
    try {
      let fileUri: string;
      let fileName: string;
      let mimeType: string;
      if (picker === "image") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.9,
        });
        if (result.canceled || !result.assets?.[0]) return;
        fileUri = result.assets[0].uri;
        fileName = result.assets[0].fileName ?? `image-${Date.now()}.jpg`;
        mimeType = result.assets[0].mimeType ?? "image/jpeg";
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        fileUri = result.assets[0].uri;
        fileName = result.assets[0].name ?? `document-${Date.now()}.pdf`;
        mimeType = result.assets[0].mimeType ?? "application/pdf";
      }

      setUploading(true);
      const res = await client.upload({
        fileUri,
        fileName,
        mimeType,
        getToken: () => getTokenRef.current(),
      });
      setItems((prev) => [res.file, ...prev]);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload media."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCopy(asset: WhatsAppMediaAsset) {
    await Clipboard.setStringAsync(asset.secureUrl);
    Alert.alert("Copied", "Public URL copied to clipboard.");
  }

  async function handleShare(asset: WhatsAppMediaAsset) {
    try {
      await Share.share({
        title: asset.filename,
        message: asset.secureUrl,
        url: asset.secureUrl,
      });
    } catch {
      /* dismissed */
    }
  }

  function handleOpen(asset: WhatsAppMediaAsset) {
    Linking.openURL(asset.secureUrl).catch(() => {
      Alert.alert("Could not open", "This URL cannot be opened on the device.");
    });
  }

  async function handleDelete(asset: WhatsAppMediaAsset) {
    Alert.alert("Delete asset?", `Remove ${asset.filename} from the library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(asset.id);
          try {
            await client.delete(asset.id);
            setItems((prev) => prev.filter((i) => i.id !== asset.id));
          } catch (err) {
            Alert.alert(
              "Delete failed",
              err instanceof ApiError ? err.message : "Could not delete media."
            );
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
      }
      testID="wa-media-library"
    >
      <Stack.Screen options={{ title: "Media library", headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          testID="wa-media-back"
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Media library</Text>
          <Text style={styles.subtitle}>
            {items.length === 0 ? "No assets yet" : `${items.length} asset(s)`}
          </Text>
        </View>
      </View>

      <View style={styles.uploadRow}>
        <Pressable
          testID="wa-media-upload-image"
          accessibilityRole="button"
          accessibilityLabel="Upload image"
          disabled={uploading}
          style={[styles.uploadBtn, uploading ? styles.disabled : null]}
          onPress={() => void uploadFromPicker("image")}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Ionicons name="image-outline" size={18} color={Colors.primary} />
          )}
          <Text style={styles.uploadBtnText}>Image</Text>
        </Pressable>
        <Pressable
          testID="wa-media-upload-document"
          accessibilityRole="button"
          accessibilityLabel="Upload PDF"
          disabled={uploading}
          style={[styles.uploadBtn, uploading ? styles.disabled : null]}
          onPress={() => void uploadFromPicker("document")}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Ionicons name="document-outline" size={18} color={Colors.primary} />
          )}
          <Text style={styles.uploadBtnText}>PDF</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading && items.length === 0 ? (
        <View style={styles.centerStatus}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerStatus}>
          <Ionicons name="images-outline" size={40} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>
            Upload your first asset to start the library.
          </Text>
        </View>
      ) : (
        items.map((asset) => (
          <View key={asset.id} style={styles.card} testID={`wa-media-${asset.id}`}>
            {asset.resourceType === "image" ? (
              <Image
                source={{ uri: asset.secureUrl }}
                style={styles.thumb}
                accessibilityLabel={asset.filename}
              />
            ) : (
              <View style={styles.docThumb}>
                <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={2}>
                {asset.filename}
              </Text>
              <Text style={styles.meta}>
                {asset.resourceType} · {formatBytes(asset.size)} ·{" "}
                {new Date(asset.uploadedAt).toLocaleDateString("en-IN")}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  testID={`wa-media-${asset.id}-copy`}
                  accessibilityRole="button"
                  accessibilityLabel="Copy URL"
                  style={styles.actionBtn}
                  onPress={() => void handleCopy(asset)}
                >
                  <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Copy URL</Text>
                </Pressable>
                <Pressable
                  testID={`wa-media-${asset.id}-share`}
                  accessibilityRole="button"
                  accessibilityLabel="Share"
                  style={styles.actionBtn}
                  onPress={() => void handleShare(asset)}
                >
                  <Ionicons name="share-outline" size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Share</Text>
                </Pressable>
                <Pressable
                  testID={`wa-media-${asset.id}-open`}
                  accessibilityRole="button"
                  accessibilityLabel="Open in browser"
                  style={styles.actionBtn}
                  onPress={() => handleOpen(asset)}
                >
                  <Ionicons name="open-outline" size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Open</Text>
                </Pressable>
                <Pressable
                  testID={`wa-media-${asset.id}-delete`}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  disabled={busy !== null}
                  style={[styles.actionBtn, busy !== null ? styles.disabled : null]}
                  onPress={() => void handleDelete(asset)}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  uploadRow: { flexDirection: "row", gap: Spacing.sm },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  uploadBtnText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.primary },
  disabled: { opacity: 0.5 },
  centerStatus: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: "center" },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    padding: Spacing.md,
    backgroundColor: "#fff1f2",
    borderRadius: BorderRadius.md,
  },
  card: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  docThumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  actionText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
});
