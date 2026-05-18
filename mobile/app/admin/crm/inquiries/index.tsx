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
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminStatusPill,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import type { AdminStatusPillVariant } from "@/components/admin/AdminStatusPill";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import AssociateInquiriesScreen from "@/app/associate/inquiries";

/**
 * Admin CRM inquiries screen.
 *
 * The associate-only build of this screen lives in app/associate/inquiries/.
 * When an associate opens the admin tab we want them to fall back to that
 * one (same scope, just rebranded). Admins get the full filterable list with
 * delete capability driven by /api/inquiries (which already supports mobile
 * bearer auth via getRequestClerkUserId).
 */
export default function AdminCrmInquiriesScreen() {
  return (
    <PermissionGate permission="crm.read">
      <AdminCrmInquiriesScreenInner />
    </PermissionGate>
  );
}

interface InquiryRow {
  id: string;
  status: string;
  customerName: string;
  customerMobileNumber: string;
  numAdults: number;
  numChildren5to11: number;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
  location?: { id: string; label: string } | null;
  associatePartner?: { id: string; name: string } | null;
  tourPackageQueries?: Array<{ id: string }> | null;
}

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "negotiation", label: "Negotiation" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "CANCELLED", label: "Cancelled" },
];

const PERIOD_FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "Any period" },
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This week" },
  { id: "THIS_MONTH", label: "This month" },
  { id: "LAST_MONTH", label: "Last month" },
];

function AdminCrmInquiriesScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const {
    isAssociate,
    isLoading: authLoading,
    permissions,
  } = useCurrentUser();

  // Associates still use the inquiry workflow but with their narrower scope.
  // The associate screen handles their RBAC; we just delegate to it.
  if (!authLoading && isAssociate) {
    return <AssociateInquiriesScreen />;
  }

  return (
    <AdminInquiriesList
      router={router}
      insets={insets}
      getToken={getToken}
      authLoading={authLoading}
      canWrite={permissions.includes("crm.write")}
    />
  );
}

function AdminInquiriesList({
  router,
  insets,
  getToken,
  authLoading,
  canWrite,
}: {
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  getToken: () => Promise<string | null>;
  authLoading: boolean;
  canWrite: boolean;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const hasAdvancedFilters = periodFilter !== "ALL" || followUpsOnly;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (statusFilter !== "ALL") qs.set("status", statusFilter);
        if (periodFilter !== "ALL") qs.set("period", periodFilter);
        if (followUpsOnly) qs.set("followUpsOnly", "1");
        const q = qs.toString();
        const list = await authRequest<InquiryRow[]>(
          `/api/inquiries${q ? `?${q}` : ""}`,
          { retries: 1 }
        );
        setItems(Array.isArray(list) ? list : []);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load inquiries.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authRequest, statusFilter, periodFilter, followUpsOnly]
  );

  useEffect(() => {
    if (!authLoading) void load("initial");
  }, [authLoading, load]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter((row) => {
      const haystack = [
        row.customerName,
        row.customerMobileNumber,
        row.location?.label ?? "",
        row.associatePartner?.name ?? "",
        row.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [items, debouncedSearch]);

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
        subtitle={loading ? "Loading…" : `${filtered.length} shown`}
        onBackPress={() => router.back()}
        testID="crm-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="crm-new-inquiry"
              onPress={() => router.push("/admin/crm/inquiries/new" as never)}
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
        data={filtered}
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
            deleting={deletingId === item.id}
            onOpen={() =>
              router.push(`/admin/crm/inquiries/${item.id}` as never)
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
      />

      <AdminFilterSheet
        visible={filterSheetOpen}
        title="Inquiry filters"
        onClose={() => setFilterSheetOpen(false)}
        onReset={() => {
          setPeriodFilter("ALL");
          setFollowUpsOnly(false);
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

const STATUS_PILL: Record<string, { variant: AdminStatusPillVariant; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  contacted: { variant: "info", label: "Contacted" },
  quoted: { variant: "primary", label: "Quoted" },
  negotiation: { variant: "primary", label: "Negotiation" },
  confirmed: { variant: "success", label: "Confirmed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

function statusPill(status: string): { variant: AdminStatusPillVariant; label: string } {
  return (
    STATUS_PILL[status?.toLowerCase()] ?? {
      variant: "neutral",
      label: status || "—",
    }
  );
}

function InquiryCard({
  row,
  canWrite,
  deleting,
  onOpen,
  onCall,
  onWhatsApp,
  onDelete,
}: {
  row: InquiryRow;
  canWrite: boolean;
  deleting: boolean;
  onOpen: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
}) {
  const pill = statusPill(row.status);
  const hasPhone = !!row.customerMobileNumber;

  function openMenu() {
    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [];
    if (hasPhone) options.push({ text: "Call", onPress: onCall });
    if (canWrite) options.push({ text: "Delete inquiry", style: "destructive", onPress: onDelete });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(row.customerName, undefined, options);
  }

  return (
    <Pressable
      testID={`inquiry-row-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open inquiry for ${row.customerName}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onOpen}
      accessibilityHint="Opens inquiry details."
    >
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {row.customerName}
          </Text>
          <AdminStatusPill label={pill.label} variant={pill.variant} compact />
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {row.location?.label ?? "Unknown location"}
          {hasPhone ? ` · ${row.customerMobileNumber}` : ""}
        </Text>
        {row.nextFollowUpDate ? (
          <View style={styles.followRow}>
            <Ionicons name="alarm-outline" size={12} color={Colors.warning} />
            <Text style={styles.cardFollowUp} numberOfLines={1}>
              Follow-up {new Date(row.nextFollowUpDate).toLocaleDateString("en-IN")}
            </Text>
          </View>
        ) : null}
      </View>

      {deleting ? (
        <ActivityIndicator size="small" color={Colors.error} style={styles.cardTrailing} />
      ) : (
        <View style={styles.cardTrailing}>
          {hasPhone ? (
            <Pressable
              testID={`inquiry-whatsapp-${row.id}`}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp customer"
              onPress={(e) => {
                e.stopPropagation();
                onWhatsApp();
              }}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="logo-whatsapp" size={20} color={Colors.whatsapp} />
            </Pressable>
          ) : null}
          {hasPhone || canWrite ? (
            <Pressable
              testID={`inquiry-menu-${row.id}`}
              accessibilityRole="button"
              accessibilityLabel="More actions"
              onPress={(e) => {
                e.stopPropagation();
                openMenu();
              }}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, flexGrow: 1 },
  listLoader: { marginTop: Spacing.xxl },
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 64,
  },
  cardPressed: { backgroundColor: Colors.surfaceAlt },
  cardBody: { flex: 1, gap: 3 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardName: { flex: 1, fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  followRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardFollowUp: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: "700" },
  cardTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
