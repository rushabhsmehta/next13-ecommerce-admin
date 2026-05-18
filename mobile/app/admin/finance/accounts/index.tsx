import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { OfflineGate } from "@/components/auth/PermissionGate";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { createFinanceClient, type FinanceAccount } from "@/lib/finance";

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function FinanceAccountsScreen() {
  return (
    <OfflineGate policy="online_only">
      <FinanceAccountsScreenInner />
    </OfflineGate>
  );
}

function FinanceAccountsScreenInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFinanceClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.listAccounts();
        setAccounts(res.accounts);
        setTotalBalance(res.totalBalance);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load accounts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminScreen
      testID="finance-accounts-screen"
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: "Accounts", headerShown: false }} />

      <AdminTopBar
        title="Accounts"
        subtitle={loading ? "…" : `Total ${formatINR(totalBalance)}`}
        onBackPress={() => router.back()}
        testID="finance-accounts-header"
      />

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total balance</Text>
        <Text style={styles.totalValue}>
          {loading ? "…" : formatINR(totalBalance)}
        </Text>
      </View>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh")}
          testID="finance-accounts-error"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : accounts.length === 0 ? (
        <AdminEmptyState
          icon="wallet-outline"
          title="No active accounts"
          body="Bank and cash accounts configured on the web will appear here."
          testID="finance-accounts-empty"
        />
      ) : (
        accounts.map((a) => (
          <Pressable
            key={`${a.kind}-${a.id}`}
            testID={`account-${a.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${a.name}`}
            style={styles.row}
            onPress={() =>
              router.push(
                `/admin/finance/accounts/${a.id}?kind=${a.kind}` as never
              )
            }
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: a.kind === "bank" ? "#dbeafe" : "#dcfce7",
                },
              ]}
            >
              <Ionicons
                name={a.kind === "bank" ? "card-outline" : "cash-outline"}
                size={18}
                color={a.kind === "bank" ? "#2563eb" : "#16a34a"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {a.subtitle}
              </Text>
            </View>
            <Text style={styles.rowBalance}>{formatINR(a.currentBalance)}</Text>
          </Pressable>
        ))
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  totalCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  totalLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "800" },
  totalValue: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  loader: { marginTop: Spacing.xl },
  row: {
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
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowBalance: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
});
