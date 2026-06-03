import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
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
import { OfflineGate } from "@/components/auth/PermissionGate";
import { createFinanceClient } from "@/lib/finance";
import { downloadAndSharePdf } from "@/lib/pdf-download";
import { isFinanceApp } from "@/lib/app-variant";

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
const FINANCE_TYPES = new Set<string>(TABS.map((t) => t.id));

function parseInitialType(raw: string | string[] | undefined): FinanceType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return FINANCE_TYPES.has(v ?? "") ? (v as FinanceType) : "sales";
}

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatAmountHeadline(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export default function FinanceBrowseScreen() {
  return (
    <OfflineGate policy="online_only">
      <FinanceBrowseScreenInner />
    </OfflineGate>
  );
}

function FinanceBrowseScreenInner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const insets = useSafeAreaInsets();
  const { getToken, isSignedIn } = useAuth();
  const { canUseFinance, isLoading: authLoading } = useCurrentUser();

  const initialType = useMemo(() => parseInitialType(params.type), [params.type]);
  const [tab, setTab] = useState<FinanceType>(initialType);

  useEffect(() => {
    setTab(parseInitialType(params.type));
  }, [params.type]);

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
          err instanceof ApiError ? err.message : "Could not generate the voucher PDF."
        );
      } finally {
        setVoucherBusyId(null);
      }
    },
    [financeClient]
  );

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
      if (!canUseFinance) {
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
    [canUseFinance, request, offset]
  );

  useEffect(() => {
    if (!authLoading) void load("initial", tab, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, tab, debouncedSearch]);

  if (authLoading) {
    return <AdminLoadingState label="Loading…" testID="finance-browse-loading" />;
  }

  if (!isSignedIn || !canUseFinance) {
    router.replace("/admin/finance" as never);
    return null;
  }

  const currentTab = TABS.find((t) => t.id === tab)!;
  const financeSegments = TABS.map((t) => ({ id: t.id, label: t.label }));

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.summaryRow} testID="finance-browse-summary">
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Entries</Text>
          <Text style={styles.summaryValue}>{loading ? "…" : total}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>90-day total</Text>
          <Text style={styles.summaryValue}>
            {loading ? "…" : formatAmountHeadline(totalAmount)}
          </Text>
        </View>
      </View>
      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", tab, debouncedSearch)}
          testID="finance-browse-error"
        />
      ) : null}
    </View>
  );

  return (
    <AdminScreen scroll={false} testID="finance-browse-screen">
      <Stack.Screen options={{ title: currentTab.label, headerShown: false }} />

      <AdminTopBar
        title={currentTab.label}
        subtitle="Last 90 days"
        onBackPress={() =>
          isFinanceApp()
            ? router.replace("/admin/finance" as never)
            : router.back()
        }
        testID="finance-browse-header"
      />

      <AdminSegmentedControl
        options={financeSegments}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setSearch("");
          setDebouncedSearch("");
          router.setParams({ type: next });
        }}
        testIDPrefix="finance-tab"
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${currentTab.label.toLowerCase()}…`}
        searchTestID="finance-search-input"
        testID="finance-command-bar"
      />

      <FlatList
        style={styles.list}
        data={items}
        ListHeaderComponent={listHeader}
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
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon={currentTab.icon}
              title={debouncedSearch ? "No results" : `No ${currentTab.label.toLowerCase()} yet`}
              body={
                debouncedSearch
                  ? "Try a different search term."
                  : "Record from the Accounts home screen."
              }
              testID="finance-browse-empty"
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
                  <Ionicons name={currentTab.icon} size={18} color={currentTab.tint} />
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
                </View>
              </View>
              <Text style={[styles.amount, { color: currentTab.tint }]}>
                {formatINR(item.amount)}
              </Text>
            </RowTag>
          );
        }}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.lg },
  listHeader: { gap: Spacing.sm, marginBottom: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: 2, flexGrow: 1 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  summaryCell: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Colors.borderSubtle,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text,
  },
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
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  statusPillText: { fontSize: 10, color: Colors.textSecondary, fontWeight: "700" },
  amount: { fontSize: FontSize.md, fontWeight: "900" },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
