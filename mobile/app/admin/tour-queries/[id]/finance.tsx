import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { API_BASE_URL } from "@/constants/api";
import {
  absoluteAdminUrl,
  tourQueryFinancialSummaryPath,
} from "@/lib/tour-queries-web-urls";
import {
  createTourQueryFinanceClient,
  type TourQueryFinanceResponse,
  type TourQueryFinanceSectionRow,
} from "@/lib/tour-query-finance";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SectionKey = keyof TourQueryFinanceResponse["sections"];

const SECTION_META: { key: SectionKey; title: string; tone: string }[] = [
  { key: "sales", title: "Sales", tone: "#16a34a" },
  { key: "saleReturns", title: "Sale returns", tone: "#d97706" },
  { key: "purchases", title: "Purchases", tone: "#2563eb" },
  { key: "purchaseReturns", title: "Purchase returns", tone: "#0891b2" },
  { key: "receipts", title: "Receipts", tone: "#059669" },
  { key: "payments", title: "Payments", tone: "#4f46e5" },
  { key: "expenses", title: "Expenses", tone: "#dc2626" },
  { key: "incomes", title: "Other income", tone: "#7c3aed" },
];

export default function TourQueryFinanceScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourQueryFinanceScreenInner />
    </PermissionGate>
  );
}

function TourQueryFinanceScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const client = useMemo(
    () => createTourQueryFinanceClient(authRequest),
    [authRequest]
  );

  const webFinanceUrl = useMemo(() => {
    if (!id) return "";
    const base = API_BASE_URL.replace(/\/$/, "");
    return absoluteAdminUrl(base, tourQueryFinancialSummaryPath(id));
  }, [id]);

  const [data, setData] = useState<TourQueryFinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>("sales");

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.get(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load finance summary.");
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openWebFallback = () => {
    if (!webFinanceUrl) return;
    Linking.openURL(webFinanceUrl).catch(() => {
      /* ignore */
    });
  };

  if (loading) {
    return (
      <View style={styles.centered} testID="tour-query-finance-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered} testID="tour-query-finance-error">
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText} accessibilityRole="alert">
          {error ?? "Finance summary not found"}
        </Text>
        <Pressable
          style={styles.retry}
          onPress={() => void load()}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          testID="tour-query-finance-retry"
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        {webFinanceUrl ? (
          <Pressable
            style={styles.webFallbackBtn}
            onPress={openWebFallback}
            accessibilityRole="button"
            accessibilityLabel="Open finance summary on web"
            accessibilityHint="Opens the admin website in your browser."
            testID="tour-query-finance-open-web"
          >
            <Text style={styles.webFallbackText}>Open on web</Text>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  const { query, totals, sections } = data;
  const title =
    query.tourPackageQueryName ||
    query.tourPackageQueryNumber ||
    "Trip finance";
  const hasAnyRows = SECTION_META.some((m) => sections[m.key].length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: "Finance", headerShown: false }} />
      <AdminHeader
        title="Finance"
        subtitle={title}
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 24,
          gap: Spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        testID="tour-query-finance-scroll"
      >
        <View style={styles.summaryCard} testID="tour-query-finance-totals">
          <Text style={styles.summaryHeading} accessibilityRole="header">
            Summary
          </Text>
          <View style={styles.totalsGrid}>
            <TotalCell label="Sales" value={totals.sales} testID="finance-total-sales" />
            <TotalCell label="Purchases" value={totals.purchases} testID="finance-total-purchases" />
            <TotalCell label="Receipts" value={totals.receipts} testID="finance-total-receipts" />
            <TotalCell label="Payments" value={totals.payments} testID="finance-total-payments" />
            <TotalCell label="Expenses" value={totals.expenses} testID="finance-total-expenses" />
            <TotalCell label="Income" value={totals.incomes} testID="finance-total-incomes" />
            <TotalCell label="Sale returns" value={totals.saleReturns} testID="finance-total-sale-returns" />
            <TotalCell
              label="Purchase returns"
              value={totals.purchaseReturns}
              testID="finance-total-purchase-returns"
            />
          </View>
          <View style={styles.highlightRow}>
            <Text style={styles.highlightLabel}>Gross profit</Text>
            <Text
              style={[
                styles.highlightValue,
                totals.grossProfit >= 0 ? styles.positive : styles.negative,
              ]}
              testID="finance-gross-profit"
            >
              {formatINR(totals.grossProfit)}
            </Text>
          </View>
          <View style={styles.highlightRow}>
            <Text style={styles.highlightLabel}>Net profit</Text>
            <Text
              style={[
                styles.highlightValue,
                totals.netProfit >= 0 ? styles.positive : styles.negative,
              ]}
              testID="finance-net-profit"
            >
              {formatINR(totals.netProfit)}
            </Text>
          </View>
          <View style={styles.outstandingBlock}>
            <View style={styles.highlightRow}>
              <Text style={styles.outstandingLabel}>Customer outstanding</Text>
              <Text style={styles.outstandingValue} testID="finance-customer-outstanding">
                {formatINR(totals.customerOutstanding)}
              </Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.outstandingLabel}>Supplier outstanding</Text>
              <Text style={styles.outstandingValue} testID="finance-supplier-outstanding">
                {formatINR(totals.supplierOutstanding)}
              </Text>
            </View>
          </View>
          {query.customerName ? (
            <Text style={styles.customerHint}>Customer: {query.customerName}</Text>
          ) : null}
        </View>

        {!hasAnyRows ? (
          <View style={styles.emptyBlock} testID="tour-query-finance-empty">
            <Ionicons name="wallet-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No transactions linked to this trip yet.</Text>
          </View>
        ) : (
          SECTION_META.map((meta) => (
            <FinanceSection
              key={meta.key}
              title={meta.title}
              tone={meta.tone}
              rows={sections[meta.key]}
              expanded={expandedSection === meta.key}
              onToggle={() =>
                setExpandedSection((prev) => (prev === meta.key ? null : meta.key))
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TotalCell({
  label,
  value,
  testID,
}: {
  label: string;
  value: number;
  testID: string;
}) {
  return (
    <View style={styles.totalCell} testID={testID}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{formatINR(value)}</Text>
    </View>
  );
}

function FinanceSection({
  title,
  tone,
  rows,
  expanded,
  onToggle,
}: {
  title: string;
  tone: string;
  rows: TourQueryFinanceSectionRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const sectionId = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <View style={styles.sectionCard} testID={`finance-section-${sectionId}`}>
      <Pressable
        style={styles.sectionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
        accessibilityHint={`${rows.length} records`}
        testID={`finance-section-toggle-${sectionId}`}
      >
        <View style={[styles.sectionDot, { backgroundColor: tone }]} accessibilityElementsHidden />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{rows.length}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.textSecondary}
        />
      </Pressable>
      {expanded && rows.length > 0 ? (
        <View style={styles.sectionBody}>
          {rows.map((row) => (
            <View
              key={row.id}
              style={styles.row}
              testID={`finance-row-${sectionId}-${row.id}`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.rowParty} numberOfLines={1}>
                  {row.counterpartyName || "—"}
                </Text>
                <Text style={styles.rowAmount}>{formatINR(row.amount)}</Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowMetaText}>{formatDate(row.date)}</Text>
                {row.reference ? (
                  <Text style={styles.rowMetaText} numberOfLines={1}>
                    Ref: {row.reference}
                  </Text>
                ) : null}
                {row.status ? (
                  <Text style={styles.rowStatus}>{row.status}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : expanded && rows.length === 0 ? (
        <Text style={styles.sectionEmpty}>No {title.toLowerCase()} yet.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  errText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: "center",
  },
  retry: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  webFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  webFallbackText: { color: Colors.primary, fontWeight: "600" },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeading: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  totalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  totalCell: {
    width: "47%",
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  totalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  totalValue: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  highlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  highlightLabel: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  highlightValue: { fontSize: FontSize.lg, fontWeight: "700" },
  positive: { color: "#16a34a" },
  negative: { color: "#dc2626" },
  outstandingBlock: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  outstandingLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  outstandingValue: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  customerHint: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  emptyBlock: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  sectionBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  sectionEmpty: {
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  row: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  rowParty: { flex: 1, fontSize: FontSize.md, fontWeight: "500", color: Colors.text },
  rowAmount: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  rowMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: 4,
  },
  rowMetaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rowStatus: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    textTransform: "capitalize",
  },
});
