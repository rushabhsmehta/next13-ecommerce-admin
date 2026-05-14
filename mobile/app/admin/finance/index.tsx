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

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

export default function FinanceHubScreen() {
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

      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Finance</Text>
          <Text style={styles.headerSubtitle}>Last 90 days</Text>
        </View>
      </View>

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
              testID={`finance-tab-${t.id}`}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              style={[styles.tabChip, active ? styles.tabChipActive : null]}
              onPress={() => {
                setTab(t.id);
                setSearch("");
                setDebouncedSearch("");
              }}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? "#fff" : Colors.textSecondary}
              />
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>{currentTab.label} (90d)</Text>
          <Text style={styles.summaryAmount}>
            {loading ? "…" : formatINR(totalAmount)}
          </Text>
        </View>
        <View style={styles.summaryRightCol}>
          <Text style={styles.summarySubLabel}>Records</Text>
          <Text style={styles.summarySubValue}>{loading ? "…" : total}</Text>
        </View>
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
          <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
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
              <Ionicons name={currentTab.icon} size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch
                  ? "No matches in the last 90 days."
                  : `No ${currentTab.label.toLowerCase()} in the last 90 days.`}
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
        renderItem={({ item }) => (
          <View testID={`finance-row-${item.id}`} style={styles.row}>
            <View
              style={[styles.iconCircle, { backgroundColor: `${currentTab.tint}15` }]}
            >
              <Ionicons name={currentTab.icon} size={18} color={currentTab.tint} />
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
            <Text style={[styles.amount, { color: currentTab.tint }]}>
              {formatINR(item.amount)}
            </Text>
          </View>
        )}
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  tabRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.lg,
  },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  summaryAmount: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  summaryRightCol: { alignItems: "flex-end" },
  summarySubLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  summarySubValue: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
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
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
