import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminHeader,
  AdminMetricCard,
  AdminSection,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface DashboardData {
  windowDays: number;
  since: string;
  inquiries: { total: number; byStatus: Record<string, number> };
  tourQueries: { total: number; confirmed: number };
  sales: { count: number; amount: number };
  purchases: { count: number; amount: number };
  receipts: { count: number; amount: number };
  payments: { count: number; amount: number };
  expenses: { count: number; amount: number };
  incomes: { count: number; amount: number };
  outstanding: { receivables: number; payables: number };
  balances: { bank: number; cash: number; total: number; bankCount: number; cashCount: number };
}

const WINDOWS: { id: number; label: string }[] = [
  { id: 7, label: "7d" },
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
  { id: 365, label: "1y" },
];

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10_000_000) return `Rs. ${(n / 10_000_000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100_000) return `Rs. ${(n / 100_000).toFixed(2)}L`;
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

export default function ReportsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const { getToken } = useAuth();
  const { canUseAdmin, canUseFinance, isLoading: authLoading } = useCurrentUser();
  const allowed = canUseAdmin || canUseFinance;

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreMetricsOpen, setMoreMetricsOpen] = useState(false);

  const gutter = Spacing.sm;
  const horizontalPad = Spacing.lg * 2;
  const usableWidth = Math.max(280, layout.width - horizontalPad);
  const col2 = Math.floor((usableWidth - gutter) / 2);

  const load = useCallback(
    async (mode: "initial" | "refresh", windowDays: number) => {
      if (!allowed) {
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await request<DashboardData>(
          `/api/mobile/reports/dashboard?days=${windowDays}`,
          { retries: 1 }
        );
        setData(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load reports.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, request]
  );

  useEffect(() => {
    if (!authLoading) void load("initial", days);
  }, [authLoading, days, load]);

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
        <Text style={styles.emptyTitle}>Reports access required</Text>
        <Text style={styles.emptyText}>This view is restricted to admin/finance staff.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Reports", headerShown: false }} />

      <AdminHeader
        title="Reports"
        subtitle={data ? `Last ${data.windowDays} days` : "…"}
        onBackPress={() => router.back()}
        showAccent
        testID="reports-admin-header"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh", days)} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.segmentRail, { marginHorizontal: Spacing.lg }]}>
          {WINDOWS.map((w) => {
            const active = days === w.id;
            return (
              <Pressable
                key={w.id}
                testID={`reports-window-${w.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Reporting window ${w.label}`}
                accessibilityHint="Changes KPI window for this dashboard."
                style={[styles.segment, active ? styles.segmentActive : null]}
                onPress={() => setDays(w.id)}
              >
                <Text
                  style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}
                  allowFontScaling={false}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={[styles.errorCard, { marginHorizontal: Spacing.lg }]}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : data ? (
          <>
            <AdminSection title="Liquidity" testID="reports-balances-section">
              <View
                style={styles.balanceAnchor}
                testID="reports-balance-anchor"
                accessibilityRole="summary"
                accessibilityLabel={`Total liquidity ${formatINR(data.balances.total)}`}
              >
                <Text style={styles.anchorEyebrow} allowFontScaling={false}>
                  Total balance
                </Text>
                <Text style={styles.anchorHero} allowFontScaling={false}>
                  {formatINR(data.balances.total)}
                </Text>
                <View style={styles.anchorSplit}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anchorSplitLabel}>Bank ({data.balances.bankCount})</Text>
                    <Text style={styles.anchorSplitValue}>{formatINR(data.balances.bank)}</Text>
                  </View>
                  <View style={styles.anchorDivider} accessibilityElementsHidden />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anchorSplitLabel}>Cash ({data.balances.cashCount})</Text>
                    <Text style={styles.anchorSplitValue}>{formatINR(data.balances.cash)}</Text>
                  </View>
                </View>
              </View>
            </AdminSection>

            <AdminSection title="Outstanding">
              <View style={[styles.metricRow, { gap: gutter }]}>
                <View style={{ width: col2 }}>
                  <AdminMetricCard
                    id="reports-receivables"
                    label="Receivables"
                    category="Receivables"
                    value={formatINR(data.outstanding.receivables)}
                    accentValueColor="#16a34a"
                    testID="reports-outstanding-receivables"
                    onPress={() => router.push("/admin/finance" as never)}
                  />
                </View>
                <View style={{ width: col2 }}>
                  <AdminMetricCard
                    id="reports-payables"
                    label="Payables"
                    category="Payables"
                    value={formatINR(data.outstanding.payables)}
                    accentValueColor="#dc2626"
                    testID="reports-outstanding-payables"
                    onPress={() => router.push("/admin/finance" as never)}
                  />
                </View>
              </View>
            </AdminSection>

            <AdminSection title="Pipeline">
              <View style={[styles.metricRow, { gap: gutter }]}>
                <View style={{ width: col2 }}>
                  <AdminMetricCard
                    id="reports-inquiries"
                    label="Inquiries"
                    category="Inquiries"
                    value={String(data.inquiries.total)}
                    detail={Object.entries(data.inquiries.byStatus)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                    testID="reports-kpi-inquiries"
                    onPress={() => router.push("/admin/crm/inquiries" as never)}
                  />
                </View>
                <View style={{ width: col2 }}>
                  <AdminMetricCard
                    id="reports-tour-queries"
                    label="Tour queries"
                    category="Tour queries"
                    value={String(data.tourQueries.total)}
                    detail={`${data.tourQueries.confirmed} confirmed`}
                    testID="reports-kpi-queries"
                    onPress={() => router.push("/admin/tour-queries" as never)}
                  />
                </View>
              </View>
            </AdminSection>

            <AdminSection title={`Window (${data.windowDays}d)`}>
              <Pressable
                testID="reports-more-metrics-toggle"
                accessibilityRole="button"
                accessibilityLabel={moreMetricsOpen ? "Hide more metrics" : "Show more metrics"}
                style={styles.moreToggle}
                onPress={() => setMoreMetricsOpen((v) => !v)}
              >
                <Text style={styles.moreToggleText}>{moreMetricsOpen ? "Hide" : "More"} metrics</Text>
                <Ionicons
                  name={moreMetricsOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textSecondary}
                  accessibilityElementsHidden
                />
              </Pressable>
              {moreMetricsOpen ? (
                <View style={[styles.metricRow, { gap: gutter }]}>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-sales-amt"
                      label="Sales"
                      category="Sales"
                      value={formatINR(data.sales.amount)}
                      detail={`${data.sales.count} invoices`}
                      accentValueColor="#16a34a"
                      testID="reports-kpi-sales"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-receipts-amt"
                      label="Receipts"
                      category="Receipts"
                      value={formatINR(data.receipts.amount)}
                      detail={`${data.receipts.count} entries`}
                      accentValueColor="#16a34a"
                      testID="reports-kpi-receipts"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-income-other"
                      label="Income"
                      category="Income"
                      value={formatINR(data.incomes.amount)}
                      detail={`${data.incomes.count} postings`}
                      accentValueColor="#16a34a"
                      testID="reports-kpi-income"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-purchases"
                      label="Purchases"
                      category="Purchases"
                      value={formatINR(data.purchases.amount)}
                      detail={`${data.purchases.count} bills`}
                      accentValueColor="#0284c7"
                      testID="reports-kpi-purchases"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-payments"
                      label="Payments"
                      category="Payments"
                      value={formatINR(data.payments.amount)}
                      detail={`${data.payments.count} entries`}
                      accentValueColor="#dc2626"
                      testID="reports-kpi-payments"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                  <View style={{ width: col2 }}>
                    <AdminMetricCard
                      id="reports-expenses"
                      label="Expenses"
                      category="Expenses"
                      value={formatINR(data.expenses.amount)}
                      detail={`${data.expenses.count} postings`}
                      accentValueColor="#dc2626"
                      testID="reports-kpi-expenses"
                      onPress={() => router.push("/admin/finance" as never)}
                    />
                  </View>
                </View>
              ) : null}
            </AdminSection>
          </>
        ) : null}
      </ScrollView>
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
  scroll: { paddingHorizontal: 0, paddingTop: Spacing.sm, gap: Spacing.sm },
  segmentRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    justifyContent: "space-between",
  },
  segment: {
    flexGrow: 1,
    alignItems: "center",
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
  segmentLabel: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.textSecondary },
  segmentLabelActive: { color: Colors.textInverse },
  errorCard: {
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
  loadingBox: { paddingVertical: Spacing.xxl, alignItems: "center" },
  anchorEyebrow: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  balanceAnchor: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  anchorHero: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.35,
  },
  anchorSplit: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  anchorSplitLabel: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "700" },
  anchorSplitValue: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text, marginTop: 4 },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
  },
  moreToggleText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  anchorDivider: { width: 1, backgroundColor: Colors.borderSubtle, opacity: 0.8 },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
