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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarIconButton,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
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

const STATUS_SEGMENTS: { id: ApiStatusFilter; label: string }[] = [
  { id: "all", label: "Active" },
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
  if (item.isFeatured && !item.isArchived) return "Open query";
  /* draft */
  if (!hasPositivePrice(item.totalPrice)) return "Review pricing";
  if (!item.confirmedVariantId) return "Compare variants";
  return "Open query";
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
  const canAiWizard = permissions.includes("aiWizards.write");

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
          err instanceof ApiError ? err.message : "Could not load tour package queries.";
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
          title: "Confirmed queries ready for ops and finance",
          detail: "Use share and PDF when communicating with travelers.",
        })
      : status === "archived"
        ? ({
            variant: "strip" as const,
            title: "Archived queries are hidden from active work",
            detail: "Open any query and restore when you want it visible again.",
          })
        : status === "all" && draftsInLoaded
          ? ({
              variant: "strip" as const,
              title: "Draft queries need review",
              detail: "Check pricing and dates before you share or confirm.",
            })
          : null;

  const subtitle = loading ? "Loading..." : `${total} quer${total === 1 ? "y" : "ies"}`;

  return (
    <AdminScreen scroll={false} testID="tour-queries-screen">
      <Stack.Screen options={{ title: "Tour Package Queries", headerShown: false }} />

      <AdminTopBar
        title="Tour Package Queries"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="tour-queries-header"
        rightSlot={
          canWriteSales || canAiWizard ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
              {canAiWizard ? (
                <AdminTopBarIconButton
                  icon="sparkles-outline"
                  accessibilityLabel="AI generate query"
                  testID="tour-queries-ai-wizard"
                  onPress={() =>
                    router.push("/admin/ai-wizards?target=tourPackageQuery" as never)
                  }
                />
              ) : null}
              {canWriteSales ? (
                <AdminTopBarPrimaryButton
                  label="New"
                  icon="add"
                  testID="tour-queries-new"
                  onPress={() => router.push("/admin/tour-queries/create" as never)}
                />
              ) : null}
            </View>
          ) : null
        }
      />

      <AdminSegmentedControl
        options={STATUS_SEGMENTS}
        value={status}
        onChange={setStatus}
        testIDPrefix="trips-status-filter"
        scrollable={false}
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Customer, query # or query name"
        searchTestID="tour-queries-search-input"
        testID="tour-queries-command-bar"
      />

      {focusProps ? (
        <View style={styles.focusInset}>
          <TripFocusCard {...focusProps} testID="trips-focus-card" />
        </View>
      ) : null}

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debouncedSearch, status)}
          testID="tour-queries-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
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
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="map-outline"
              title="No tour package queries"
              body={
                debouncedSearch
                  ? "Try customer name or mobile number."
                  : "Converted inquiries will show up here under Active."
              }
              testID="tour-queries-empty"
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
          const confirmed = item.isFeatured && !item.isArchived;
          const displayName = item.tourPackageQueryName?.trim()
            ? item.tourPackageQueryName
            : item.tourPackageQueryNumber ?? "Untitled query";
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
              accessibilityLabel={`Open query ${displayName}`}
              accessibilityHint={`Next step: ${rowNextHint(item)}`}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/admin/tour-queries/[id]",
                  params: { id: item.id },
                } as never)
              }
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
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xxl },
  focusInset: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: 2, flexGrow: 1 },
  row: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: 6,
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
});
