import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  AdminActionRail,
  AdminHeader,
  AdminHeaderIconButton,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OfflineGate } from "@/components/auth/PermissionGate";
import { createFinanceClient } from "@/lib/finance";
import { downloadAndSharePdf } from "@/lib/pdf-download";

type FinanceType =
  | "sales"
  | "purchases"
  | "receipts"
  | "payments"
  | "expenses"
  | "incomes";

interface FinanceItem {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  date: string;
  status?: string | null;
  reference?: string | null;
}

interface FinanceListResponse {
  type: FinanceType;
  items: FinanceItem[];
  total: number;
  totalAmount: number;
  hasMore: boolean;
  nextOffset: number;
}

const TABS: { id: FinanceType; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { id: "sales", label: "Sales", icon: "receipt-outline", tint: "#16a34a" },
  { id: "purchases", label: "Purchases", icon: "cart-outline", tint: "#0284c7" },
  { id: "receipts", label: "Receipts", icon: "arrow-down-circle-outline", tint: "#16a34a" },
  { id: "payments", label: "Payments", icon: "arrow-up-circle-outline", tint: "#dc2626" },
  { id: "expenses", label: "Expenses", icon: "wallet-outline", tint: "#dc2626" },
  { id: "incomes", label: "Income", icon: "trending-up-outline", tint: "#16a34a" },
];

const PAGE_SIZE = 25;

const FINANCE_QUICK_PAGES: {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}[] = [
  {
    id: "collect",
    title: "Collect",
    icon: "swap-vertical-outline",
    route: "/admin/finance/collect",
  },
  {
    id: "record",
    title: "Record",
    icon: "add-circle-outline",
    route: "/admin/finance/record",
  },
  {
    id: "invoice",
    title: "Invoice",
    icon: "receipt-outline",
    route: "/admin/finance/invoice",
  },
  {
    id: "return",
    title: "Return",
    icon: "return-down-back-outline",
    route: "/admin/finance/return",
  },
  {
    id: "tds",
    title: "TDS",
    icon: "document-text-outline",
    route: "/admin/finance/tds",
  },
];

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function formatAmountHeadline(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10_000_000) return `Rs. ${(n / 10_000_000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100_000) return `Rs. ${(n / 100_000).toFixed(2)}L`;
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export default function FinanceHubScreen() {
  return (
    <OfflineGate policy="online_only">
      <FinanceHubScreenInner />
    </OfflineGate>
  );
}

function FinanceHubScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { canUseAdmin, canUseFinance, isLoading: authLoading } = useCurrentUser();

  const allowed = canUseAdmin || canUseFinance;

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const financeClient = useMemo(() => createFinanceClient(request), [request]);
  const [voucherBusyId, setVoucherBusyId] = useState<string | null>(null);

  const downloadVoucher = useCallback(
    async (kind: "sale" | "purchase", id: string, label: string) => {
      setVoucherBusyId(id);
      try {
        await downloadAndSharePdf({
          endpoint: financeClient.voucherEndpoint(kind, id),
          fileName: `${kind}-${label}`,
          getToken: () => getTokenRef.current(),
          dialogTitle: `Share ${kind} voucher`,
        });
      } catch (err) {
        Alert.alert(
          "Voucher unavailable",
          err instanceof ApiError
            ? err.message
            : "Could not generate the voucher PDF."
        );
      } finally {
        setVoucherBusyId(null);
      }
    },
    [financeClient]
  );

  const [tab, setTab] = useState<FinanceType>("sales");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", type: FinanceType, term: string) => {
      if (!allowed) {
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
        const data = await request<FinanceListResponse>(
          `/api/mobile/finance/list?${qs.toString()}`,
          { retries: 1 }
        );
        setHasMore(data.hasMore);
        setOffset(data.nextOffset);
        setTotal(data.total);
        setTotalAmount(data.totalAmount);
        setItems((prev) => (mode === "more" ? [...prev, ...data.items] : data.items));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load transactions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [allowed, request, offset]
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

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Finance access required</Text>
        <Text style={styles.emptyText}>This view is restricted to finance staff.</Text>
      </View>
    );
  }

  const currentTab = TABS.find((t) => t.id === tab)!;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Finance", headerShown: false }} />

      <AdminHeader
        title="Finance"
        subtitle="Last 90 days"
        onBackPress={() => router.back()}
        rightSlot={
          <AdminHeaderIconButton
            testID="finance-accounts-link"
            icon="card-outline"
            label="Accounts and balances"
            hint="Shows bank and cash accounts with balances."
            onPress={() => router.push("/admin/finance/accounts" as never)}
          />
        }
        showAccent
        testID="finance-admin-header"
      />

      {canUseFinance || canUseAdmin ? (
        <AdminActionRail
          testIDPrefix="finance-action"
          compact
          singleRow
          actions={FINANCE_QUICK_PAGES.map((p) => ({
            id: p.id,
            title: p.title,
            icon: p.icon,
            onPress: () => router.push(p.route as never),
          }))}
        />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`finance-tab-${t.id}`}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              accessibilityHint={`Shows ${t.label} activity for the last 90 days.`}
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
              <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTabName}>{currentTab.label}</Text>
        <Text style={styles.summaryEntries}>{loading ? "…" : `${total} ${total === 1 ? "entry" : "entries"}`}</Text>
        <Text style={styles.summaryAmount}>{loading ? "…" : formatAmountHeadline(totalAmount)}</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="finance-search-input"
          accessibilityLabel={`Search ${currentTab.label}`}
          style={styles.searchInput}
          placeholder={`Search ${currentTab.label.toLowerCase()}…`}
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length ? (
          <Pressable
            testID="finance-search-clear"
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint="Removes search text."
            onPress={() => setSearch("")}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} accessibilityElementsHidden />
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
              <Text style={styles.emptyText}>
                {debouncedSearch ? "No results for this search." : `No ${currentTab.label.toLowerCase()} yet.`}
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
          const voucherKind =
            tab === "sales" ? "sale" : tab === "purchases" ? "purchase" : null;
          const busy = voucherBusyId === item.id;
          const RowTag = voucherKind ? Pressable : View;
          return (
            <RowTag
              testID={`finance-row-${item.id}`}
              style={styles.row}
              {...(voucherKind
                ? {
                    accessibilityRole: "button" as const,
                    accessibilityLabel: `Download ${voucherKind} voucher for ${item.title}`,
                    accessibilityHint:
                      "Generates a branded PDF voucher and opens the share sheet.",
                    disabled: busy,
                    onPress: () =>
                      downloadVoucher(
                        voucherKind,
                        item.id,
                        item.reference || item.id.slice(0, 8)
                      ),
                  }
                : {})}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${currentTab.tint}15` },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={currentTab.tint} />
                ) : (
                  <Ionicons
                    name={currentTab.icon}
                    size={18}
                    color={currentTab.tint}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
                <View style={styles.rowMetaRow}>
                  <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                  {item.status ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  ) : null}
                  {item.reference ? (
                    <Text style={styles.rowReference} numberOfLines={1}>
                      {item.reference}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.amount, { color: currentTab.tint }]}>
                  {formatINR(item.amount)}
                </Text>
                {voucherKind ? (
                  <Ionicons
                    name="download-outline"
                    size={14}
                    color={Colors.textTertiary}
                  />
                ) : null}
              </View>
            </RowTag>
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
  tabRail: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  segmentLabel: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  segmentLabelActive: { color: Colors.textInverse },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    gap: 4,
    minHeight: 88,
  },
  summaryTabName: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  summaryEntries: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  summaryAmount: { fontSize: 26, fontWeight: "800", color: Colors.text, marginTop: 2 },
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
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  rowDate: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  rowReference: { fontSize: FontSize.xs, color: Colors.textTertiary, flex: 1 },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  statusPillText: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700" },
  amount: { fontSize: FontSize.md, fontWeight: "900" },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
  },
});
