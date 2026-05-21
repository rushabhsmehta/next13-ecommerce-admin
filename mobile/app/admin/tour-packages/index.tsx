import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface PackageRow {
  id: string;
  tourPackageName: string | null;
  tourPackageType: string | null;
  numDaysNight: string | null;
  price: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  updatedAt: string;
  location: { id: string; label: string } | null;
}

interface ListResponse {
  packages: PackageRow[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

const STATUS_SEGMENTS: { id: "active" | "featured" | "archived"; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "featured", label: "Featured" },
  { id: "archived", label: "Archived" },
];

export default function TourPackagesScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourPackagesInner />
    </PermissionGate>
  );
}

function TourPackagesInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [items, setItems] = useState<PackageRow[]>([]);
  const [status, setStatus] = useState<"active" | "featured" | "archived">("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchPage = useCallback(
    async (
      from: number,
      opts: { append?: boolean; silent?: boolean } = {}
    ) => {
      if (!opts.silent) {
        if (opts.append) setLoadingMore(true);
        else setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("offset", String(from));
        qs.set("limit", String(PAGE_LIMIT));
        if (debouncedSearch) qs.set("search", debouncedSearch);
        if (status === "featured") qs.set("featuredOnly", "1");
        if (status === "archived") qs.set("includeArchived", "1");

        const data = await api<ListResponse>(`/api/mobile/tour-packages?${qs.toString()}`);
        const next =
          status === "archived" ? data.packages.filter((p) => p.isArchived) : data.packages;
        setItems((prev) => (opts.append ? [...prev, ...next] : next));
        setHasMore(data.hasMore);
        setOffset(data.nextOffset);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load tour packages.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [api, debouncedSearch, status]
  );

  useEffect(() => {
    void fetchPage(0, { silent: false });
  }, [fetchPage]);

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    await fetchPage(offset, { append: true });
  }

  const subtitle = useMemo(() => {
    if (loading) return "Loading…";
    if (items.length === 0) return "No tour packages";
    return `${items.length} package${items.length === 1 ? "" : "s"}`;
  }, [loading, items.length]);

  if (loading && items.length === 0) {
    return <AdminLoadingState label="Loading tour packages…" testID="tour-packages-loading" />;
  }
  if (error && items.length === 0) {
    return (
      <AdminScreen testID="tour-packages-error">
        <AdminErrorState message={error} onRetry={() => void fetchPage(0)} />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen scroll={false} testID="tour-packages-screen">
      <Stack.Screen options={{ title: "Tour packages", headerShown: false }} />

      <AdminTopBar
        title="Tour packages"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="tour-packages-header"
      />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Search tour packages"
          testID="tour-packages-search"
        />
      </View>

      <AdminSegmentedControl
        options={STATUS_SEGMENTS}
        value={status}
        onChange={setStatus}
        testIDPrefix="tour-packages-status"
      />

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void fetchPage(0, { silent: true });
            }}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMore()}
        ListEmptyComponent={
          <AdminEmptyState
            title="No tour packages"
            body="Create tour packages on the web. Once published, they appear here."
            testID="tour-packages-empty"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`tour-package-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Tour package ${item.tourPackageName ?? item.id}`}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
            onPress={() => router.push(`/admin/tour-packages/${item.id}` as never)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {item.tourPackageName ?? "Untitled package"}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {[item.location?.label, item.numDaysNight, item.tourPackageType]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
              <View style={styles.badges}>
                {item.isFeatured ? (
                  <View style={[styles.badge, styles.badgeFeatured]}>
                    <Text style={styles.badgeText}>Featured</Text>
                  </View>
                ) : null}
                {item.isArchived ? (
                  <View style={[styles.badge, styles.badgeArchived]}>
                    <Text style={styles.badgeText}>Archived</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm },
  card: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
  },
  cardPressed: { opacity: 0.6 },
  title: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, marginTop: Spacing.sm, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeFeatured: { backgroundColor: "rgba(37,211,102,0.15)" },
  badgeArchived: { backgroundColor: "rgba(156,163,175,0.2)" },
  badgeText: { fontSize: 10, fontWeight: "900", color: Colors.text },
  footer: { padding: Spacing.md },
});
