import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { fetchCrmInquiriesList, type CrmInquiryListRow, type CrmInquiryTourPackageQuerySummary } from "@/lib/crm-inquiries-list";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
/**
 * Staff CRM inquiries list — filterable, paginated, scoped per RBAC
 * (associates only see their own leads via /api/mobile/crm/inquiries).
 */
export default function AdminCrmInquiriesScreen() {
  return (
    <PermissionGate permission="crm.read">
      <AdminCrmInquiriesScreenInner />
    </PermissionGate>
  );
}

type InquiryRow = CrmInquiryListRow;

function queryLabel(q: CrmInquiryTourPackageQuerySummary): string {
  return (
    q.tourPackageQueryName?.trim() ||
    q.tourPackageQueryNumber?.trim() ||
    `Query ${q.id.slice(0, 8)}`
  );
}

function formatTravelDate(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "negotiation", label: "Negotiation" },
  { id: "completed", label: "Completed" },
];

const PERIOD_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "Any period" },
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This week" },
  { id: "THIS_MONTH", label: "This month" },
  { id: "LAST_MONTH", label: "Last month" },
];

const PAGE_SIZE = 30;

function AdminCrmInquiriesScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { isAssociate, isLoading: authLoading, permissions } = useCurrentUser();

  return (
    <AdminInquiriesList
      router={router}
      insets={insets}
      getToken={getToken}
      authLoading={authLoading}
      canWrite={permissions.includes("crm.write")}
      isAssociate={isAssociate}
    />
  );
}

function AdminInquiriesList({
  router,
  insets,
  getToken,
  authLoading,
  canWrite,
  isAssociate,
}: {
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  getToken: () => Promise<string | null>;
  authLoading: boolean;
  canWrite: boolean;
  isAssociate: boolean;
}) {
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );

  const [items, setItems] = useState<InquiryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const pagingRef = useRef({ nextOffset: 0, hasMore: true });

  const hasAdvancedFilters = periodFilter !== "ALL" || followUpsOnly;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      const nextOffset = mode === "more" ? pagingRef.current.nextOffset : 0;
      if (mode === "more") {
        if (!pagingRef.current.hasMore) return;
        setLoadingMore(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(PAGE_SIZE));
        qs.set("offset", String(nextOffset));
        if (statusFilter !== "ALL") qs.set("status", statusFilter);
        if (periodFilter !== "ALL") qs.set("period", periodFilter);
        if (followUpsOnly) qs.set("followUpsOnly", "1");
        if (debouncedSearch) qs.set("search", debouncedSearch);
        const q = qs.toString();
        const {
          items: list,
          total: responseTotal,
          nextOffset: responseNextOffset,
          hasMore: responseHasMore,
        } = await fetchCrmInquiriesList(authRequest, q, {
          retries: 1,
          cacheTtlSeconds: mode === "more" ? 0 : 20,
          dedupe: true,
          staleOnError: mode !== "more",
        });

        setItems((prev) => (mode === "more" ? [...prev, ...list] : list));
        setTotal(responseTotal);
        setHasMore(responseHasMore);
        pagingRef.current = {
          nextOffset: responseNextOffset,
          hasMore: responseHasMore,
        };
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load inquiries.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [authRequest, statusFilter, periodFilter, followUpsOnly, debouncedSearch]
  );

  useEffect(() => {
    if (!authLoading) void load("initial");
  }, [authLoading, load]);

  const subtitle =
    loading && items.length === 0
      ? "Loading..."
      : total > 0
        ? `${items.length} of ${total}`
        : "0 shown";

  const detailRoute = (id: string) =>
    isAssociate
      ? (`/associate/inquiries/${id}` as const)
      : (`/admin/crm/inquiries/${id}` as const);
  const newRoute = isAssociate
    ? ("/associate/inquiries/new" as const)
    : ("/admin/crm/inquiries/new" as const);

  function confirmDelete(row: InquiryRow) {
    if (!canWrite) return;
    Alert.alert(
      "Delete inquiry",
      `Delete "${row.customerName}"? Linked actions will be removed and tour queries will be detached.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(row.id);
            try {
              await authRequest(
                `/api/inquiries?id=${encodeURIComponent(row.id)}`,
                { method: "DELETE" }
              );
              setItems((prev) => prev.filter((i) => i.id !== row.id));
              setTotal((prev) => Math.max(0, prev - 1));
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : "Delete failed.";
              Alert.alert("Delete failed", message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <AdminScreen scroll={false} testID="crm-inquiries-screen">
      <Stack.Screen options={{ title: "CRM Inquiries", headerShown: false }} />

      <AdminTopBar
        title="Inquiries"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="crm-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="crm-new-inquiry"
              onPress={() => router.push(newRoute as never)}
            />
          ) : null
        }
      />

      <AdminSegmentedControl
        options={STATUS_FILTERS}
        value={statusFilter}
        onChange={setStatusFilter}
        testIDPrefix="crm-status"
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name, phone, location, associate…"
        searchTestID="crm-search-input"
        onFilterPress={() => setFilterSheetOpen(true)}
        filterActive={hasAdvancedFilters}
        filterAccessibilityLabel="Inquiry filters"
        testID="crm-command-bar"
      />

      {error ? (
        <AdminErrorState message={error} onRetry={() => void load("refresh")} testID="crm-error" />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(row) => row.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="people-outline"
              title="No inquiries match"
              body="Adjust filters or clear the search box to see more results."
              actionLabel={hasAdvancedFilters || search.trim() ? "Reset filters" : undefined}
              onActionPress={
                hasAdvancedFilters || search.trim()
                  ? () => {
                      setStatusFilter("pending");
                      setPeriodFilter("ALL");
                      setFollowUpsOnly(false);
                      setSearch("");
                    }
                  : undefined
              }
              testID="crm-empty"
            />
          )
        }
        renderItem={({ item }) => (
          <InquiryCard
            row={item}
            canWrite={canWrite}
            isAssociate={isAssociate}
            deleting={deletingId === item.id}
            onOpen={() => router.push(detailRoute(item.id) as never)}
            onOpenQuery={(queryId) =>
              router.push(`/admin/tour-queries/${queryId}` as never)
            }
            onCall={() =>
              item.customerMobileNumber
                ? Linking.openURL(`tel:${item.customerMobileNumber}`)
                : undefined
            }
            onWhatsApp={() => {
              const digits = (item.customerMobileNumber ?? "").replace(/[^0-9]/g, "");
              if (digits) Linking.openURL(`https://wa.me/${digits}`);
            }}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={Colors.primary} />
          ) : null
        }
        onEndReached={() => {
          if (!loading && !refreshing && !loadingMore && hasMore) {
            void load("more");
          }
        }}
        onEndReachedThreshold={0.6}
      />

      <AdminFilterSheet
        visible={filterSheetOpen}
        title="Inquiry filters"
        onClose={() => setFilterSheetOpen(false)}
        onReset={() => {
          setStatusFilter("pending");
          setPeriodFilter("ALL");
          setFollowUpsOnly(false);
          setSearch("");
        }}
        testID="crm-filter-sheet"
      >
        <Text style={styles.filterLabel}>Period</Text>
        <View style={styles.chipRow}>
          {PERIOD_FILTERS.map((opt) => {
            const active = periodFilter === opt.id;
            return (
              <Pressable
                key={opt.id}
                testID={`crm-period-${opt.id}`}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPeriodFilter(opt.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          testID="crm-follow-ups-only"
          accessibilityRole="button"
          accessibilityLabel="Follow-ups due only"
          accessibilityState={{ selected: followUpsOnly }}
          onPress={() => setFollowUpsOnly((v) => !v)}
          style={[styles.followToggle, followUpsOnly && styles.followToggleOn]}
        >
          <Ionicons
            name={followUpsOnly ? "alarm" : "alarm-outline"}
            size={16}
            color={followUpsOnly ? Colors.textInverse : Colors.textSecondary}
          />
          <Text style={[styles.followToggleText, followUpsOnly && styles.followToggleTextOn]}>
            Follow-ups due only
          </Text>
        </Pressable>
      </AdminFilterSheet>
    </AdminScreen>
  );
}

function InquiryCard({
  row,
  canWrite,
  isAssociate,
  deleting,
  onOpen,
  onOpenQuery,
  onCall,
  onWhatsApp,
  onDelete,
}: {
  row: InquiryRow;
  canWrite: boolean;
  isAssociate: boolean;
  deleting: boolean;
  onOpen: () => void;
  onOpenQuery: (queryId: string) => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
}) {
  const queries = row.tourPackageQueries ?? [];
  const travelDate = formatTravelDate(row.journeyDate);

  return (
    <Pressable
      testID={`inquiry-row-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open inquiry for ${row.customerName}`}
      style={styles.card}
      onPress={onOpen}
      accessibilityHint="Opens inquiry details."
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {row.customerName}
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{row.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {row.location?.label ?? "Unknown location"} · {row.customerMobileNumber}
      </Text>
      {travelDate ? (
        <Text style={styles.cardTravelDate}>Travel: {travelDate}</Text>
      ) : null}
      {row.createdAt ? (
        <Text style={styles.cardCreated}>
          Created:{" "}
          {new Date(row.createdAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      ) : null}
      {row.nextFollowUpDate ? (
        <Text style={styles.cardFollowUp}>
          Next follow-up: {new Date(row.nextFollowUpDate).toLocaleDateString("en-IN")}
        </Text>
      ) : null}
      {row.associatePartner ? (
        <Text style={styles.cardAssociate}>Via {row.associatePartner.name}</Text>
      ) : null}
      {queries.length > 0 ? (
        <View style={styles.queriesSection}>
          <Text style={styles.queriesSectionTitle}>Tour queries</Text>
          {queries.map((q) => {
            const label = queryLabel(q);
            const rowContent = (
              <>
                <View style={styles.queryRowText}>
                  <Text style={styles.queryRowLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  {q.tourPackageQueryType ? (
                    <Text style={styles.queryRowType} numberOfLines={1}>
                      {q.tourPackageQueryType}
                    </Text>
                  ) : null}
                </View>
                {q.isFeatured ? (
                  <View style={styles.confirmedPill}>
                    <Text style={styles.confirmedPillText}>Confirmed</Text>
                  </View>
                ) : null}
                {!isAssociate ? (
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                ) : null}
              </>
            );

            if (isAssociate) {
              return (
                <View
                  key={q.id}
                  testID={`inquiry-query-${row.id}-${q.id}`}
                  style={styles.queryRow}
                >
                  {rowContent}
                </View>
              );
            }

            return (
              <Pressable
                key={q.id}
                testID={`inquiry-query-${row.id}-${q.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Open tour query ${label}`}
                accessibilityHint="Opens tour query details."
                style={styles.queryRow}
                onPress={(e) => {
                  e.stopPropagation();
                  onOpenQuery(q.id);
                }}
              >
                {rowContent}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.cardActions}>
        {row.customerMobileNumber ? (
          <Pressable
            testID={`inquiry-call-${row.id}`}
            accessibilityRole="button"
            accessibilityLabel="Call customer"
            onPress={(e) => {
              e.stopPropagation();
              onCall();
            }}
            style={styles.actionBtn}
            hitSlop={8}
          >
            <Ionicons name="call" size={14} color={Colors.primary} />
            <Text style={styles.actionText}>Call</Text>
          </Pressable>
        ) : null}
        {row.customerMobileNumber ? (
          <Pressable
            testID={`inquiry-whatsapp-${row.id}`}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp customer"
            onPress={(e) => {
              e.stopPropagation();
              onWhatsApp();
            }}
            style={styles.actionBtn}
            hitSlop={8}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
            <Text style={styles.actionText}>WhatsApp</Text>
          </Pressable>
        ) : null}
        {canWrite ? (
          <Pressable
            testID={`inquiry-delete-${row.id}`}
            accessibilityRole="button"
            accessibilityLabel="Delete inquiry"
            disabled={deleting}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={[styles.actionBtn, styles.actionDelete]}
            hitSlop={8}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={14} color={Colors.error} />
                <Text style={[styles.actionText, styles.actionTextDelete]}>Delete</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, flexGrow: 1 },
  listLoader: { marginTop: Spacing.xxl },
  footerLoader: { paddingVertical: Spacing.lg },
  filterLabel: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  chipText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark },
  followToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  followToggleOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  followToggleText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  followToggleTextOn: { color: Colors.textInverse },
  card: {
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardName: { flex: 1, fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardTravelDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    marginTop: 2,
  },
  cardCreated: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  cardFollowUp: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: "700", marginTop: 2 },
  cardAssociate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  queriesSection: { marginTop: Spacing.sm, gap: 4 },
  queriesSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  queryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  queryRowText: { flex: 1, minWidth: 0 },
  queryRowLabel: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
  queryRowType: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  confirmedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: "#dcfce7",
  },
  confirmedPillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: "#166534",
    textTransform: "uppercase",
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
  },
  actionDelete: { backgroundColor: "#fff1f2" },
  actionText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.primary },
  actionTextDelete: { color: Colors.error },
});
