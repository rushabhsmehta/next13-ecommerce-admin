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
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "CRM Inquiries", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="crm-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Inquiries</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Loading…" : `${filtered.length} shown`}
          </Text>
        </View>
        {canWrite ? (
          <Pressable
            testID="crm-new-inquiry"
            accessibilityRole="button"
            accessibilityLabel="Create new inquiry"
            style={styles.newBtn}
            onPress={() => router.push("/admin/crm/inquiries/new" as never)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="crm-search-input"
          accessibilityLabel="Search inquiries"
          style={styles.searchInput}
          placeholder="Name, phone, location, associate…"
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

      <FilterChips
        testIdPrefix="crm-status"
        active={statusFilter}
        options={STATUS_FILTERS}
        onChange={setStatusFilter}
      />
      <FilterChips
        testIdPrefix="crm-period"
        active={periodFilter}
        options={PERIOD_FILTERS}
        onChange={setPeriodFilter}
      />

      <View style={styles.toggleRow}>
        <Pressable
          testID="crm-follow-ups-only"
          accessibilityRole="button"
          accessibilityLabel="Toggle follow-ups due filter"
          onPress={() => setFollowUpsOnly((v) => !v)}
          style={[styles.toggle, followUpsOnly ? styles.toggleOn : null]}
        >
          <Ionicons
            name={followUpsOnly ? "alarm" : "alarm-outline"}
            size={14}
            color={followUpsOnly ? "#fff" : Colors.textSecondary}
          />
          <Text style={[styles.toggleText, followUpsOnly ? styles.toggleTextOn : null]}>
            Follow-ups due only
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
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
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No inquiries match</Text>
              <Text style={styles.emptyText}>
                Adjust filters or clear the search box to see more results.
              </Text>
            </View>
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
    </View>
  );
}

function FilterChips({
  testIdPrefix,
  active,
  options,
  onChange,
}: {
  testIdPrefix: string;
  active: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.chipsRow}>
      {options.map((opt) => {
        const isActive = active === opt.id;
        return (
          <Pressable
            key={opt.id}
            testID={`${testIdPrefix}-${opt.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${opt.label}`}
            onPress={() => onChange(opt.id)}
            style={[styles.chip, isActive ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  return (
    <Pressable
      testID={`inquiry-row-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open inquiry for ${row.customerName}`}
      style={styles.card}
      onPress={onOpen}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {row.customerName}
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{row.status}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {row.location?.label ?? "Unknown location"} · {row.customerMobileNumber}
      </Text>
      {row.nextFollowUpDate ? (
        <Text style={styles.cardFollowUp}>
          Next follow-up: {new Date(row.nextFollowUpDate).toLocaleDateString("en-IN")}
        </Text>
      ) : null}
      {row.associatePartner ? (
        <Text style={styles.cardAssociate}>Via {row.associatePartner.name}</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
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
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  newBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
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
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  chipText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "700" },
  toggleTextOn: { color: "#fff" },
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
  emptyWrap: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text, marginTop: 6 },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
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
  cardFollowUp: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: "700", marginTop: 2 },
  cardAssociate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
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
