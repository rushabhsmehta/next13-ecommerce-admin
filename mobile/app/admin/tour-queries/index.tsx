import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type StatusFilter = "all" | "confirmed" | "draft" | "archived";

interface TourQueryListItem {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  tourPackageQueryType: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numDaysNight: string | null;
  numAdults: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  totalPrice: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  confirmedVariantId: string | null;
  updatedAt: string;
  createdAt: string;
  location: { id: string; label: string } | null;
  associatePartner: { id: string; name: string } | null;
}

interface TourQueryListResponse {
  queries: TourQueryListItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

const PAGE_SIZE = 25;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

function formatINR(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function TourQueriesListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { canUseAdmin, isLoading: authLoading } = useCurrentUser();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [items, setItems] = useState<TourQueryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", searchTerm: string, statusKey: StatusFilter) => {
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
        qs.set("limit", String(PAGE_SIZE));
        qs.set("offset", String(nextOffset));
        qs.set("status", statusKey);
        if (searchTerm) qs.set("search", searchTerm);
        const data = await request<TourQueryListResponse>(
          `/api/mobile/tour-queries?${qs.toString()}`,
          { retries: 1 }
        );
        setHasMore(data.hasMore);
        setOffset(data.nextOffset);
        setTotal(data.total);
        setItems((prev) =>
          mode === "more" ? [...prev, ...data.queries] : data.queries
        );
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load tour queries.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [canUseAdmin, request, offset]
  );

  useEffect(() => {
    if (!authLoading) void load("initial", debouncedSearch, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, debouncedSearch, status]);

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
        <Text style={styles.emptyText}>This list is only visible to authorized staff.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Tour Queries", headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Tour Queries</Text>
          <Text style={styles.headerSubtitle}>{loading ? "…" : `${total} total`}</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="tour-queries-search-input"
          accessibilityLabel="Search tour queries"
          style={styles.searchInput}
          placeholder="Search by query #, name, customer"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusRow}
      >
        {STATUS_FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <Pressable
              key={f.id}
              testID={`tour-queries-filter-${f.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f.label}`}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setStatus(f.id)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(q) => q.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debouncedSearch, status)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", debouncedSearch, status);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centeredInList}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centeredInList}>
              <Ionicons name="map-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No tour queries</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch
                  ? "Try a different search term."
                  : "Queries created from inquiries will appear here."}
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
          const confirmed = item.isFeatured && !item.isArchived;
          const displayName =
            item.tourPackageQueryName ??
            item.tourPackageQueryNumber ??
            "Untitled query";
          return (
            <Pressable
              testID={`tour-query-row-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${displayName}`}
              style={styles.row}
              onPress={() =>
                router.push(`/admin/tour-queries/${item.id}` as never)
              }
            >
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {displayName}
                </Text>
                <View
                  style={[
                    styles.badge,
                    confirmed ? styles.badgeConfirmed : styles.badgeDraft,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.isArchived
                      ? "Archived"
                      : confirmed
                      ? "Confirmed"
                      : "Draft"}
                  </Text>
                </View>
              </View>
              {item.tourPackageQueryNumber ? (
                <Text style={styles.rowNumber}>
                  {item.tourPackageQueryNumber}
                </Text>
              ) : null}
              <View style={styles.rowMetaRow}>
                {item.location?.label ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaPillText}>{item.location.label}</Text>
                  </View>
                ) : null}
                {item.numDaysNight ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaPillText}>{item.numDaysNight}</Text>
                  </View>
                ) : null}
                {item.numAdults ? (
                  <View style={styles.metaPill}>
                    <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.metaPillText}>{item.numAdults} adults</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.rowFootRow}>
                <Text style={styles.rowFootText} numberOfLines={1}>
                  {item.customerName ?? "—"}
                </Text>
                <Text style={styles.rowFootDate}>
                  {formatDate(item.tourStartsFrom ?? item.updatedAt)}
                </Text>
              </View>
              {item.totalPrice ? (
                <Text style={styles.rowPrice}>{formatINR(item.totalPrice)}</Text>
              ) : null}
            </Pressable>
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
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
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
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  statusRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  chipTextActive: { color: "#fff" },
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  rowNumber: { fontSize: FontSize.xs, color: Colors.textTertiary },
  rowMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
  },
  metaPillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  rowFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  rowFootText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  rowFootDate: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  rowPrice: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeConfirmed: { backgroundColor: "#dcfce7" },
  badgeDraft: { backgroundColor: Colors.primaryBg },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.text,
    textTransform: "uppercase",
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
