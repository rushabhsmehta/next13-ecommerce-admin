import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
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
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function ReportsHubScreen() {
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

  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSubtitle}>
            {data ? `Last ${data.windowDays} days` : "…"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", days)}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.windowRow}>
          {WINDOWS.map((w) => {
            const active = days === w.id;
            return (
              <Pressable
                key={w.id}
                testID={`reports-window-${w.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Window ${w.label}`}
                style={[styles.windowChip, active ? styles.windowChipActive : null]}
                onPress={() => setDays(w.id)}
              >
                <Text
                  style={[styles.windowChipText, active ? styles.windowChipTextActive : null]}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorCard}>
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
            <Section title="Balances">
              <View style={styles.bigKpi}>
                <Text style={styles.bigKpiLabel}>Total available</Text>
                <Text style={styles.bigKpiAmount}>{formatINR(data.balances.total)}</Text>
                <View style={styles.kpiSubRow}>
                  <View style={styles.kpiSubCol}>
                    <Text style={styles.kpiSubLabel}>Bank ({data.balances.bankCount})</Text>
                    <Text style={styles.kpiSubValue}>
                      {formatINR(data.balances.bank)}
                    </Text>
                  </View>
                  <View style={styles.kpiSubCol}>
                    <Text style={styles.kpiSubLabel}>Cash ({data.balances.cashCount})</Text>
                    <Text style={styles.kpiSubValue}>
                      {formatINR(data.balances.cash)}
                    </Text>
                  </View>
                </View>
              </View>
            </Section>

            <Section title="Outstanding (all-time)">
              <View style={styles.dualCard}>
                <View style={styles.dualCardSide}>
                  <Ionicons name="arrow-down-circle" size={18} color="#16a34a" />
                  <Text style={styles.dualCardLabel}>Receivables</Text>
                  <Text style={[styles.dualCardAmount, { color: "#16a34a" }]}>
                    {formatINR(data.outstanding.receivables)}
                  </Text>
                </View>
                <View style={styles.dualDivider} />
                <View style={styles.dualCardSide}>
                  <Ionicons name="arrow-up-circle" size={18} color="#dc2626" />
                  <Text style={styles.dualCardLabel}>Payables</Text>
                  <Text style={[styles.dualCardAmount, { color: "#dc2626" }]}>
                    {formatINR(data.outstanding.payables)}
                  </Text>
                </View>
              </View>
            </Section>

            <Section title="Pipeline">
              <View style={styles.gridRow}>
                <KpiCard
                  icon="document-text-outline"
                  label="Inquiries"
                  amount={String(data.inquiries.total)}
                  sub={Object.entries(data.inquiries.byStatus)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" · ")}
                  onPress={() => router.push("/admin/crm/inquiries" as never)}
                />
                <KpiCard
                  icon="map-outline"
                  label="Tour Queries"
                  amount={String(data.tourQueries.total)}
                  sub={`${data.tourQueries.confirmed} confirmed`}
                  onPress={() => router.push("/admin/tour-queries" as never)}
                />
              </View>
            </Section>

            <Section title="Revenue">
              <View style={styles.gridRow}>
                <KpiCard
                  icon="receipt-outline"
                  label="Sales"
                  amount={formatINR(data.sales.amount)}
                  sub={`${data.sales.count} invoices`}
                  tint="#16a34a"
                  onPress={() => router.push("/admin/finance" as never)}
                />
                <KpiCard
                  icon="arrow-down-circle-outline"
                  label="Receipts"
                  amount={formatINR(data.receipts.amount)}
                  sub={`${data.receipts.count} entries`}
                  tint="#16a34a"
                  onPress={() => router.push("/admin/finance" as never)}
                />
              </View>
              <View style={styles.gridRow}>
                <KpiCard
                  icon="trending-up-outline"
                  label="Other income"
                  amount={formatINR(data.incomes.amount)}
                  sub={`${data.incomes.count} entries`}
                  tint="#16a34a"
                  onPress={() => router.push("/admin/finance" as never)}
                />
                <KpiCard
                  icon="cart-outline"
                  label="Purchases"
                  amount={formatINR(data.purchases.amount)}
                  sub={`${data.purchases.count} bills`}
                  tint="#dc2626"
                  onPress={() => router.push("/admin/finance" as never)}
                />
              </View>
              <View style={styles.gridRow}>
                <KpiCard
                  icon="arrow-up-circle-outline"
                  label="Payments"
                  amount={formatINR(data.payments.amount)}
                  sub={`${data.payments.count} entries`}
                  tint="#dc2626"
                  onPress={() => router.push("/admin/finance" as never)}
                />
                <KpiCard
                  icon="wallet-outline"
                  label="Expenses"
                  amount={formatINR(data.expenses.amount)}
                  sub={`${data.expenses.count} entries`}
                  tint="#dc2626"
                  onPress={() => router.push("/admin/finance" as never)}
                />
              </View>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KpiCard({
  icon,
  label,
  amount,
  sub,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
  sub?: string;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.kpiCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${amount}`}
    >
      <View style={[styles.kpiIcon, tint ? { backgroundColor: `${tint}15` } : null]}>
        <Ionicons name={icon} size={18} color={tint ?? Colors.primary} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiAmount, tint ? { color: tint } : null]} numberOfLines={1}>
        {amount}
      </Text>
      {sub ? (
        <Text style={styles.kpiSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 2 },
  windowRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  windowChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  windowChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  windowChipText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.textSecondary },
  windowChipTextActive: { color: "#fff" },
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
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  bigKpi: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  bigKpiLabel: { color: "#fff", fontSize: FontSize.xs, fontWeight: "800", opacity: 0.85 },
  bigKpiAmount: { color: "#fff", fontSize: 28, fontWeight: "900" },
  kpiSubRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  kpiSubCol: { flex: 1 },
  kpiSubLabel: { color: "#fff", fontSize: 10, fontWeight: "700", opacity: 0.85 },
  kpiSubValue: { color: "#fff", fontSize: FontSize.md, fontWeight: "900", marginTop: 2 },
  dualCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  dualCardSide: { flex: 1, alignItems: "center", gap: 4 },
  dualDivider: { width: 1, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.sm },
  dualCardLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "700" },
  dualCardAmount: { fontSize: FontSize.lg, fontWeight: "900" },
  gridRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: 4,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "800" },
  kpiAmount: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  kpiSub: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "600" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
