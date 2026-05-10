import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { travelApi } from "@/lib/api";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";

type Destination = {
  id: string;
  label: string;
  imageUrl?: string | null;
  slug?: string | null;
  _count?: { tourPackages?: number };
};

export default function AllDestinationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await travelApi.getDestinations();
      setItems(res.destinations || []);
    } catch {
      setItems([]);
      setError("Could not load destinations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(d) => d.id}
      contentContainerStyle={items.length ? styles.list : styles.centered}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
          tintColor={Colors.primary}
        />
      }
      ListHeaderComponent={
        error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
            <Pressable onPress={() => void load()} accessibilityRole="button">
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <Text style={styles.muted}>No destinations with packages yet.</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          testID={`all-dest-${item.id}`}
          style={styles.card}
          onPress={() => router.push(`/destinations/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.label}`}
        >
          <View style={styles.thumbWrap}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.thumb} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.meta}>
              {item._count?.tourPackages ?? 0}{" "}
              {(item._count?.tourPackages ?? 0) === 1 ? "package" : "packages"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, paddingBottom: 32 },
  centered: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  thumbWrap: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  label: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  meta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  muted: { color: Colors.textSecondary, textAlign: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerText: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  retry: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
});
