import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type OpsDestination } from "@/lib/operations";

const PAGE_SIZE = 30;

export default function DestinationsListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationId: filterLocationId } = useLocalSearchParams<{
    locationId?: string;
  }>();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("operations.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<OpsDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const locationFilter =
    typeof filterLocationId === "string" ? filterLocationId : undefined;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", term: string) => {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.listDestinations({
          search: term || undefined,
          locationId: locationFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load destinations."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset, locationFilter]
  );

  useEffect(() => {
    void load("initial", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, locationFilter]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Destinations", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Destinations</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "…" : `${total} total`}
          </Text>
        </View>
        {canWrite ? (
          <Pressable
            testID="destinations-new"
            accessibilityRole="button"
            accessibilityLabel="New destination"
            onPress={() =>
              router.push(
                locationFilter
                  ? (`/admin/operations/destinations/new?locationId=${locationFilter}` as never)
                  : ("/admin/operations/destinations/new" as never)
              )
            }
            style={styles.newBtn}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {locationFilter ? (
        <Pressable
          testID="destinations-clear-location-filter"
          accessibilityRole="button"
          accessibilityLabel="Clear location filter"
          style={styles.filterChip}
          onPress={() => router.replace("/admin/operations/destinations" as never)}
        >
          <Text style={styles.filterChipText}>Filtered by location · Clear</Text>
          <Ionicons name="close" size={14} color={Colors.primary} />
        </Pressable>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="destinations-search"
          accessibilityLabel="Search destinations"
          style={styles.searchInput}
          placeholder="Search by name or location"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length ? (
          <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debounced)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", debounced);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="compass-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No destinations</Text>
              <Text style={styles.emptyText}>
                {debounced ? "Try a different search." : "Tap + to add one."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`destination-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            style={styles.row}
            onPress={() =>
              router.push(`/admin/operations/destinations/${item.id}` as never)
            }
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="compass" size={18} color={Colors.textTertiary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.locationLabel}
                {item.hotelCount != null ? ` · ${item.hotelCount} hotels` : ""}
              </Text>
            </View>
            {!item.isActive ? (
              <Text style={styles.inactiveBadge}>Inactive</Text>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  inactiveBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.error,
    textTransform: "uppercase",
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
