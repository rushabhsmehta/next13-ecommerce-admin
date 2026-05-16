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
import { OfflineGate } from "@/components/auth/PermissionGate";
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
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Accounts", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Accounts</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total balance</Text>
          <Text style={styles.totalValue}>
            {loading ? "…" : formatINR(totalBalance)}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: Spacing.xl }}
          />
        ) : accounts.length === 0 ? (
          <Text style={styles.muted}>No active accounts.</Text>
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
                    backgroundColor:
                      a.kind === "bank" ? "#dbeafe" : "#dcfce7",
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
              <Text style={styles.rowBalance}>
                {formatINR(a.currentBalance)}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  errorCard: {
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
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
