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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminHeader, AdminHeaderIconButton } from "@/components/admin/AdminHeader";
import { TripFocusCard, TripMiniMetric, TripStatusPill } from "@/components/admin/trips";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/** API-backed filter keeps `status=all`; "Active" is copy-only (non-archived focus). */
type ApiStatusFilter = "all" | "confirmed" | "draft" | "archived";

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

const STATUS_SEGMENTS: { api: ApiStatusFilter; label: string; testSuffix: string; hint?: string }[] =
  [
    {
      api: "all",
      label: "Active",
      testSuffix: "active",
      hint: "Shows non-archived work by default. Archived stays in its own tab.",
    },
    { api: "confirmed", label: "Confirmed", testSuffix: "confirmed" },
    { api: "draft", label: "Draft", testSuffix: "draft" },
    { api: "archived", label: "Archived", testSuffix: "archived" },
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

function hasPositivePrice(totalPrice: string | null | undefined): boolean {
  if (!totalPrice) return false;
  const n = Number.parseFloat(totalPrice);
  return Number.isFinite(n) && n > 0;
}

function rowReadinessDotClass(item: TourQueryListItem): "confirmed" | "draft_gap" | "draft_ok" | "archived" {
  if (item.isArchived) return "archived";
  const confirmed = item.isFeatured && !item.isArchived;
  if (confirmed) return "confirmed";
  const missing =
    !hasPositivePrice(item.totalPrice) || !item.tourStartsFrom || !(item.customerNumber && item.customerNumber.trim());
  return missing ? "draft_gap" : "draft_ok";
}

function rowNextHint(item: TourQueryListItem): string {
  if (item.isArchived) return "Restore from detail";
  if (item.isFeatured && !item.isArchived) return "Open trip";
  /* draft */
  if (!hasPositivePrice(item.totalPrice)) return "Review pricing";
  if (!item.confirmedVariantId) return "Compare variants";
  return "Open trip";
}

export default function TourQueriesListScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourQueriesListScreenInner />
    </PermissionGate>
  );
}

function TourQueriesListScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const { permissions } = useCurrentUser();
  const canWriteSales = permissions.includes("salesTrips.write");

  const [items, setItems] = useState<TourQueryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ApiStatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (
      mode: "initial" | "refresh" | "more",
      searchTerm: string,
      statusKey: ApiStatusFilter
    ) => {
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
        setItems((prev) => (mode === "more" ? [...prev, ...data.queries] : data.queries));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load trips.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [request, offset]
  );

  useEffect(() => {
    void load("initial", debouncedSearch, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  const draftsInLoaded = items.some((q) => !q.isArchived && !q.isFeatured);

  const focusProps = debouncedSearch
    ? ({
        variant: "strip" as const,
        title: `Search results for "${debouncedSearch}"`,
        detail: `${total} match${total === 1 ? "" : "es"}`,
      })
    : status === "confirmed"
      ? ({
          variant: "strip" as const,
          title: "Confirmed trips ready for ops and finance",
          detail: "Use share and PDF when communicating with travelers.",
        })
      : status === "archived"
        ? ({
            variant: "strip" as const,
            title: "Archived trips are hidden from active work",
            detail: "Open any trip and restore when you want it visible again.",
          })
        : status === "all" && draftsInLoaded
          ? ({
              variant: "strip" as const,
              title: "Draft trips need review",
              detail: "Check pricing and dates before you share or confirm.",
            })
          : null;

  const subtitle = loading ? "Loading..." : `${total} trip${total === 1 ? "" : "s"}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Trips", headerShown: false }} />

      <AdminHeader
        title="Trips"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        showAccent
        rightSlot={
          canWriteSales ? (
            <AdminHeaderIconButton
              testID="tour-queries-new"
              icon="add"
              label="Create new trip"
              hint="Opens the screen to choose inquiry, package, or copy."
              onPress={() => router.push("/admin/tour-queries/create" as never)}
            />
          ) : null
        }
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="tour-queries-search-input"
          accessibilityRole="search"
          accessibilityLabel="Search trips by query number, name, or customer"
          style={styles.searchInput}
          placeholder="Customer, query # or trip name"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length ? (
          <Pressable
            onPress={() => setSearch("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint="Clears the search field."
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmentWrap}>
        {STATUS_SEGMENTS.map((seg) => {
          const active = status === seg.api;
          return (
            <Pressable
              key={seg.api}
              testID={`trips-status-filter-${seg.testSuffix}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${seg.label} trips`}
              accessibilityHint={seg.hint}
              style={[styles.segment, active ? styles.segmentActive : null]}
              onPress={() => setStatus(seg.api)}
            >
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                {seg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {focusProps ? (
        <View style={styles.focusInset}>
          <TripFocusCard
            {...focusProps}
            testID="trips-focus-card"
          />
        </View>
      ) : null}

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
              <Ionicons name="map-outline" size={36} color={Colors.textTertiary} accessibilityElementsHidden />
              <Text style={styles.emptyTitle}>No trips</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch
                  ? "Try customer name or mobile number."
                  : "Converted inquiries will show up here under Active."}
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
          const displayName = item.tourPackageQueryName?.trim()
            ? item.tourPackageQueryName
            : item.tourPackageQueryNumber ?? "Untitled trip";
          const dot = rowReadinessDotClass(item);
          const dotColor =
            dot === "confirmed"
              ? "#16a34a"
              : dot === "draft_gap"
                ? "#d97706"
                : dot === "draft_ok"
                  ? Colors.textTertiary
                  : "#94a3b8";
          const dateLine =
            item.tourStartsFrom || item.tourEndsOn
              ? `${formatDate(item.tourStartsFrom)} to ${formatDate(item.tourEndsOn)}`
              : `Updated ${formatDate(item.updatedAt)}`;
          const paxLine = item.numAdults ? `${item.numAdults} pax` : "Pax TBD";
          const priceLine = hasPositivePrice(item.totalPrice)
            ? formatINR(item.totalPrice)
            : "No price";

          return (
            <Pressable
              testID={`tour-query-row-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open trip ${displayName}`}
              style={styles.row}
              onPress={() => router.push(`/admin/tour-queries/${item.id}` as never)}
            >
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {displayName}
                </Text>
                <TripStatusPill
                  compact
                  isArchived={item.isArchived}
                  isConfirmed={confirmed}
                />
              </View>
              <Text style={styles.rowCust} numberOfLines={1}>
                {item.customerName ?? "Customer TBD"}
                {item.location?.label ? ` · ${item.location.label}` : ""}
              </Text>
              {!item.tourPackageQueryName?.trim() && item.tourPackageQueryNumber ? (
                <Text style={styles.rowSubNum} numberOfLines={1}>
                  {item.tourPackageQueryNumber}
                </Text>
              ) : null}
              <View style={styles.metricsRow}>
                <TripMiniMetric label="Travel" value={dateLine} />
                <TripMiniMetric label="Pax" value={paxLine} />
                <TripMiniMetric label="Price" value={priceLine} />
              </View>
              <View
                style={styles.hintRow}
                testID={`trip-row-readiness-${item.id}`}
                accessibilityLabel={`Attention ${dot}. Next: ${rowNextHint(item)}`}
              >
                <View style={[styles.readinessDot, { backgroundColor: dotColor }]} accessibilityElementsHidden />
                <Text style={styles.hintText}>{rowNextHint(item)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centeredInList: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
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
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.borderSubtle,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  segmentTextActive: { color: Colors.text },
  focusInset: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
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
    shadowOpacity: 0,
    elevation: 0,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  rowCust: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  rowSubNum: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  metricsRow: { flexDirection: "row", gap: Spacing.xs, marginTop: 4 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  readinessDot: { width: 8, height: 8, borderRadius: 4 },
  hintText: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "600", flex: 1 },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
