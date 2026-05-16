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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
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
  const insets = useSafeAreaInsets();
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errorText}>{error ?? "Ledger not found"}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void load()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { customer, transactions, summary } = data;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: `${customer.name} – Ledger`, headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{customer.name}</Text>
          <Text style={styles.headerSubtitle}>Ledger</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
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
      </ScrollView>
    </View>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  errorText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  primaryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },

  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
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
