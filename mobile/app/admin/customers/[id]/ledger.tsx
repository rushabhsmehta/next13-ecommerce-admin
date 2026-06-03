import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  createCustomerLedgerClient,
  type CustomerLedgerResponse,
  type LedgerEntry,
} from "@/lib/customer-ledger";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "₹0";
  const abs = Math.abs(Math.round(n));
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function CustomerLedgerScreen() {
  return (
    <PermissionGate permission="crm.read">
      <CustomerLedgerScreenInner />
    </PermissionGate>
  );
}

function CustomerLedgerScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createCustomerLedgerClient(authRequest), [authRequest]);

  const [data, setData] = useState<CustomerLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.get(id);
        setData(res);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load ledger.";
        setError(message);
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

  if (loading) {
    return <AdminLoadingState label="Loading ledger…" testID="customer-ledger-loading" />;
  }
  if (error || !data) {
    return (
      <AdminScreen testID="customer-ledger-error">
        <Stack.Screen options={{ title: "Ledger", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Ledger not found"}
          onRetry={() => void load()}
          testID="customer-ledger-error-state"
        />
      </AdminScreen>
    );
  }

  const { customer, transactions, summary } = data;

  return (
    <AdminScreen
      testID="customer-ledger-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: `${customer.name} – Ledger`, headerShown: false }} />

      <AdminTopBar
        title={customer.name}
        subtitle="Ledger"
        onBackPress={() => router.back()}
        testID="customer-ledger-header"
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Sales</Text>
          <Text style={styles.summaryValue}>{formatINR(summary.totalSales)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Returns</Text>
          <Text style={styles.summaryValue}>{formatINR(summary.totalReturns)}</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Receipts</Text>
          <Text style={styles.summaryValue}>{formatINR(summary.totalReceipts)}</Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            summary.currentBalance > 0 ? styles.summaryCardAttention : null,
          ]}
        >
          <Text style={styles.summaryLabel}>Current balance</Text>
          <Text style={styles.summaryValue}>{formatINR(summary.currentBalance)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.muted}>No transactions yet.</Text>
      ) : (
        transactions.map((entry) => <LedgerRow key={`${entry.type}-${entry.id}`} entry={entry} />)
      )}
    </AdminScreen>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.credit > 0;
  const amount = isCredit ? entry.credit : entry.debit;
  return (
    <View style={styles.row} testID={`ledger-row-${entry.id}`}>
      <View
        style={[
          styles.rowIcon,
          isCredit ? styles.rowIconCredit : styles.rowIconDebit,
        ]}
      >
        <Ionicons
          name={
            entry.type === "Receipt"
              ? "arrow-down"
              : entry.type === "Sale Return"
              ? "return-down-back"
              : "arrow-up"
          }
          size={16}
          color={isCredit ? Colors.success ?? "#16a34a" : Colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {entry.description}
        </Text>
        <Text style={styles.rowMeta}>
          {formatDate(entry.date)} · {entry.type}
          {entry.reference ? ` · ${entry.reference}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.rowAmount, isCredit ? styles.rowAmountCredit : null]}>
          {isCredit ? "-" : "+"}
          {formatINR(amount)}
        </Text>
        <Text style={styles.rowBalance}>{formatINR(entry.balance)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  summaryRow: { flexDirection: "row", gap: Spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryCardAttention: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconCredit: { backgroundColor: "#dcfce7" },
  rowIconDebit: { backgroundColor: Colors.primaryBg },
  rowTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowAmount: { fontSize: FontSize.md, fontWeight: "800", color: Colors.primary },
  rowAmountCredit: { color: Colors.success ?? "#16a34a" },
  rowBalance: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
