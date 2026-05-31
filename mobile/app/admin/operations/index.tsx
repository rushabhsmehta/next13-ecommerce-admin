import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
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
    return <AdminLoadingState label="Loading operations…" />;
  }

  if (!canUseAdmin) {
    return (
      <AdminScreen scroll={false} testID="operations-access-denied">
        <AdminEmptyState
          icon="shield-outline"
          title="Admin access required"
          body="Operations data is only visible to authorized staff."
          testID="operations-access-empty"
        />
      </AdminScreen>
    );
  }

  const currentTab = TABS.find((t) => t.id === tab)!;
  const segmentOptions = TABS.map((t) => ({ id: t.id, label: t.label }));

  const listHeader = (
    <View style={styles.listHeader}>
      {tab === "suppliers" ? (
        <OpsManageLink
          testID="operations-manage-suppliers"
          label="Manage suppliers"
          icon="construct-outline"
          onPress={() => router.push("/admin/operations/suppliers" as never)}
        />
      ) : tab === "locations" ? (
        <OpsManageLink
          testID="operations-manage-locations"
          label="Manage locations"
          icon="earth-outline"
          onPress={() => router.push("/admin/operations/locations" as never)}
        />
      ) : tab === "destinations" ? (
        <OpsManageLink
          testID="operations-manage-destinations"
          label="Manage destinations"
          icon="compass-outline"
          onPress={() => router.push("/admin/operations/destinations" as never)}
        />
      ) : tab === "hotels" ? (
        <OpsManageLink
          testID="operations-manage-hotels"
          label="Manage hotels"
          icon="bed-outline"
          onPress={() => router.push("/admin/operations/hotels" as never)}
        />
      ) : null}
      <OpsManageLink
        testID="operations-manage-tour-packages"
        label="Manage tour packages"
        icon="map-outline"
        onPress={() => router.push("/admin/operations/tour-packages" as never)}
      />
      {tab === "itineraries" ? (
        <>
          <OpsManageLink
            testID="operations-manage-itineraries"
            label="Manage itinerary masters"
            icon="list-outline"
            onPress={() => router.push("/admin/operations/itineraries" as never)}
          />
          <OpsManageLink
            testID="operations-manage-activities"
            label="Manage activity masters"
            icon="walk-outline"
            onPress={() => router.push("/admin/operations/activities" as never)}
          />
        </>
      ) : null}
      <OpsManageLink
        testID="operations-manage-transport-pricing"
        label="Transport pricing & vehicles"
        icon="car-outline"
        onPress={() => router.push("/admin/operations/transport-pricing" as never)}
      />
      <OpsManageLink
        testID="operations-manage-location-suppliers"
        label="Location-supplier links"
        icon="git-network-outline"
        onPress={() => router.push("/admin/operations/location-suppliers" as never)}
      />
      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", tab, debouncedSearch)}
          testID="operations-error"
        />
      ) : null}
    </View>
  );

  return (
    <AdminScreen scroll={false} testID="operations-hub-screen">
      <Stack.Screen options={{ title: "Operations", headerShown: false }} />

      <AdminTopBar
        title="Operations"
        subtitle={loading ? "…" : `${total} · ${currentTab.label}`}
        onBackPress={() => router.back()}
        testID="operations-admin-header"
      />

      <AdminSegmentedControl
        options={segmentOptions}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setSearch("");
          setDebouncedSearch("");
        }}
        testIDPrefix="operations-tab"
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${currentTab.label.toLowerCase()}…`}
        searchTestID="operations-search-input"
        testID="operations-command-bar"
      />

      <FlatList
        style={styles.list}
        data={items}
        ListHeaderComponent={listHeader}
        keyExtractor={(it) => `${tab}-${it.id}`}
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
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
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon={currentTab.icon}
              title={`No ${currentTab.label.toLowerCase()}`}
              body={
                debouncedSearch
                  ? `No results for "${debouncedSearch}".`
                  : `No ${currentTab.label.toLowerCase()} found.`
              }
              testID="operations-empty"
            />
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
              {item.imageUrl?.trim() ? (
                <RemoteImage uri={item.imageUrl} style={styles.thumb} />
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
    </AdminScreen>
  );
}

function OpsManageLink({
  testID,
  label,
  icon,
  onPress,
}: {
  testID: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.manageLink, pressed && styles.manageLinkPressed]}
    >
      <Ionicons name={icon} size={16} color={Colors.primary} accessibilityElementsHidden />
      <Text style={styles.manageLinkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} accessibilityElementsHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.lg },
  listHeader: { gap: Spacing.xs, marginBottom: Spacing.sm },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  manageLinkPressed: { backgroundColor: Colors.surfaceAlt },
  manageLinkText: { flex: 1, fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: 2, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
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
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
