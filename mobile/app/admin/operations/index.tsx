import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { AdminHeader } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type ResourceType = "hotels" | "locations" | "destinations" | "suppliers" | "itineraries";

interface OpsItem {
  id: string;
  name: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string | null;
}

interface OpsListResponse {
  type: ResourceType;
  items: OpsItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

const TABS: {
  id: ResourceType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "hotels", label: "Hotels", icon: "bed-outline" },
  { id: "locations", label: "Locations", icon: "earth-outline" },
  { id: "destinations", label: "Destinations", icon: "compass-outline" },
  { id: "suppliers", label: "Suppliers", icon: "business-outline" },
  { id: "itineraries", label: "Itineraries", icon: "list-outline" },
];

const PAGE_SIZE = 30;

export default function OperationsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { canUseAdmin, isLoading: authLoading } = useCurrentUser();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [tab, setTab] = useState<ResourceType>("hotels");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<OpsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", type: ResourceType, term: string) => {
      if (!canUseAdmin) {
        setLoading(false);
        return;
      }
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const nextOffset = mode === "more" ? offset : 0;
        const qs = new URLSearchParams();
        qs.set("type", type);
        qs.set("limit", String(PAGE_SIZE));
        qs.set("offset", String(nextOffset));
        if (term) qs.set("search", term);
        const data = await request<OpsListResponse>(
          `/api/mobile/operations/list?${qs.toString()}`,
          { retries: 1 }
        );
        setHasMore(data.hasMore);
        setOffset(data.nextOffset);
        setTotal(data.total);
        setItems((prev) => (mode === "more" ? [...prev, ...data.items] : data.items));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [canUseAdmin, request, offset]
  );

  useEffect(() => {
    if (!authLoading) void load("initial", tab, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, tab, debouncedSearch]);

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Admin access required</Text>
        <Text style={styles.emptyText}>
          Operations data is only visible to authorized staff.
        </Text>
      </View>
    );
  }

  const currentTab = TABS.find((t) => t.id === tab)!;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Operations", headerShown: false }} />

      <AdminHeader
        title="Operations"
        subtitle={loading ? "…" : `${total} · ${currentTab.label}`}
        onBackPress={() => router.back()}
        showAccent
        testID="operations-admin-header"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`operations-tab-${t.id}`}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              style={[styles.segment, active ? styles.segmentActive : null]}
              onPress={() => {
                setTab(t.id);
                setSearch("");
                setDebouncedSearch("");
              }}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? Colors.textInverse : Colors.textSecondary}
              />
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="operations-search-input"
          accessibilityLabel="Search operations"
          style={styles.searchInput}
          placeholder={`Search ${currentTab.label.toLowerCase()}…`}
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

      {tab === "suppliers" ? (
        <Pressable
          testID="operations-manage-suppliers"
          accessibilityRole="button"
          accessibilityLabel="Manage suppliers — add, edit, delete"
          style={styles.manageBanner}
          onPress={() => router.push("/admin/operations/suppliers" as never)}
        >
          <Ionicons name="construct-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageText}>Manage suppliers (add / edit / delete)</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      ) : tab === "locations" ? (
        <Pressable
          testID="operations-manage-locations"
          accessibilityRole="button"
          accessibilityLabel="Manage locations — add, edit, delete"
          style={styles.manageBanner}
          onPress={() => router.push("/admin/operations/locations" as never)}
        >
          <Ionicons name="earth-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageText}>Manage locations (add / edit / delete)</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      ) : tab === "destinations" ? (
        <Pressable
          testID="operations-manage-destinations"
          accessibilityRole="button"
          accessibilityLabel="Manage destinations — add, edit, delete"
          style={styles.manageBanner}
          onPress={() => router.push("/admin/operations/destinations" as never)}
        >
          <Ionicons name="compass-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageText}>Manage destinations (add / edit / delete)</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      ) : tab === "hotels" ? (
        <Pressable
          testID="operations-manage-hotels"
          accessibilityRole="button"
          accessibilityLabel="Manage hotels — add, edit, delete"
          style={styles.manageBanner}
          onPress={() => router.push("/admin/operations/hotels" as never)}
        >
          <Ionicons name="bed-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageText}>Manage hotels (add / edit / delete)</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      ) : tab === "itineraries" ? (
        <>
          <Pressable
            testID="operations-manage-itineraries"
            accessibilityRole="button"
            accessibilityLabel="Manage itinerary masters"
            style={styles.manageBanner}
            onPress={() => router.push("/admin/operations/itineraries" as never)}
          >
            <Ionicons name="list-outline" size={16} color={Colors.primary} />
            <Text style={styles.manageText}>Manage itinerary masters</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </Pressable>
          <Pressable
            testID="operations-manage-activities"
            accessibilityRole="button"
            accessibilityLabel="Manage activity masters"
            style={styles.manageBanner}
            onPress={() => router.push("/admin/operations/activities" as never)}
          >
            <Ionicons name="walk-outline" size={16} color={Colors.primary} />
            <Text style={styles.manageText}>Manage activity masters</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </Pressable>
        </>
      ) : (
        <Pressable
          testID="operations-manage-staff"
          accessibilityRole="button"
          accessibilityLabel="Manage operational staff — add, edit, deactivate"
          style={styles.manageBanner}
          onPress={() => router.push("/admin/operations/staff" as never)}
        >
          <Ionicons name="people-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageText}>Manage operational staff</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </Pressable>
      )}

      <Pressable
        testID="operations-manage-transport-pricing"
        accessibilityRole="button"
        accessibilityLabel="Manage transport pricing and vehicle types"
        style={styles.manageBanner}
        onPress={() =>
          router.push("/admin/operations/transport-pricing" as never)
        }
      >
        <Ionicons name="car-outline" size={16} color={Colors.primary} />
        <Text style={styles.manageText}>
          Manage transport pricing & vehicle types
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </Pressable>

      <Pressable
        testID="operations-manage-location-suppliers"
        accessibilityRole="button"
        accessibilityLabel="Manage location supplier relationships"
        style={styles.manageBanner}
        onPress={() => router.push("/admin/operations/location-suppliers" as never)}
      >
        <Ionicons name="git-network-outline" size={16} color={Colors.primary} />
        <Text style={styles.manageText}>Manage location-supplier links</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </Pressable>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(it) => `${tab}-${it.id}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", tab, debouncedSearch)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", tab, debouncedSearch);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centeredInList}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centeredInList}>
              <Text style={styles.emptyBody}>
                {debouncedSearch
                  ? `No results for "${debouncedSearch}".`
                  : `No ${currentTab.label.toLowerCase()} found.`}
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
        renderItem={({ item }) => {
          const sub =
            item.subtitle && item.meta
              ? `${item.subtitle} · ${item.meta}`
              : item.subtitle ?? item.meta ?? null;
          return (
            <View testID={`operations-row-${item.id}`} style={styles.row}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} accessibilityElementsHidden>
                  <Ionicons name={currentTab.icon} size={20} color={Colors.textTertiary} />
                </View>
              )}
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                {sub ? (
                  <Text style={styles.rowSubtitle} numberOfLines={2}>
                    {sub}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  centeredInList: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  tabRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  segmentText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
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
  manageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  manageText: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
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
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rowTextCol: { flex: 1, gap: 2 },
  rowTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  rowSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  emptyBody: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
