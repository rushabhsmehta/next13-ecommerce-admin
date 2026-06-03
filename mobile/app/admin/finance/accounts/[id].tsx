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
import { OfflineGate } from "@/components/auth/PermissionGate";
import {
  createFinanceClient,
  type AccountDetailResponse,
} from "@/lib/finance";

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatDate(s: string): string {
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

export default function FinanceAccountDetailScreen() {
  return (
    <OfflineGate policy="online_only">
      <Inner />
    </OfflineGate>
  );
}

function Inner() {
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFinanceClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<AccountDetailResponse | null>(null);
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
        setData(
          await client.getAccount(id, kind === "cash" ? "cash" : "bank")
        );
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load account."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, kind, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <AdminLoadingState label="Loading account…" testID="finance-account-loading" />;
  }
  if (error || !data) {
    return (
      <AdminScreen testID="finance-account-error">
        <Stack.Screen options={{ title: "Account", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Account not found"}
          onRetry={() => void load()}
          testID="finance-account-error-state"
        />
      </AdminScreen>
    );
  }

  const { account, transactions } = data;

  return (
    <AdminScreen
      testID="finance-account-detail-screen"
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
      <Stack.Screen options={{ title: account.name, headerShown: false }} />

      <AdminTopBar
        title={account.name}
        subtitle={kind === "cash" ? "Cash account" : "Bank account"}
        onBackPress={() => router.back()}
        testID="finance-account-header"
      />

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current balance</Text>
        <Text style={styles.balanceValue}>{formatINR(account.currentBalance)}</Text>
        <Text style={styles.openingText}>
          Opening: {formatINR(account.openingBalance)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.muted}>No transactions yet.</Text>
      ) : (
        transactions.map((t) => (
          <View key={t.id} style={styles.txRow}>
            <View
              style={[
                styles.txIcon,
                { backgroundColor: t.isInflow ? "#dcfce7" : "#fee2e2" },
              ]}
            >
              <Ionicons
                name={t.isInflow ? "arrow-down" : "arrow-up"}
                size={15}
                color={t.isInflow ? "#16a34a" : "#dc2626"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {t.description || t.type}
              </Text>
              <Text style={styles.txMeta}>
                {formatDate(t.date)} · {t.type}
              </Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                { color: t.isInflow ? "#16a34a" : "#dc2626" },
              ]}
            >
              {t.isInflow ? "+" : "-"}
              {formatINR(t.amount)}
            </Text>
          </View>
        ))
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  balanceCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "800" },
  balanceValue: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  openingText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  txMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: FontSize.md, fontWeight: "800" },
});
