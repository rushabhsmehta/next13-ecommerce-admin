import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminErrorState,
  AdminHubSection,
  AdminLoadingState,
  AdminScreen,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OfflineGate } from "@/components/auth/PermissionGate";
import { ApiError, withAuth } from "@/lib/api";
import { createFinanceClient } from "@/lib/finance";
import { ACCOUNTS_ADMIN_SECTIONS } from "@/lib/accounts-admin-nav";

function formatBalance(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function displayRoleLabel(
  role: string | null,
  isOwner: boolean
): string {
  if (isOwner) return "Owner";
  if (role === "ADMIN") return "Admin";
  if (role === "FINANCE") return "Finance";
  if (role === "VIEWER") return "Viewer";
  return role ? role.charAt(0) + role.slice(1).toLowerCase() : "Staff";
}

export function AccountsFinanceHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const {
    organizationRole,
    canUseFinance,
    isLoading: authLoading,
    isOwner,
  } = useCurrentUser();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const financeClient = useMemo(
    () => createFinanceClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!canUseFinance) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await financeClient.listAccounts();
        setTotalBalance(data.totalBalance ?? 0);
      } catch (err) {
        setTotalBalance(null);
        setError(
          err instanceof ApiError ? err.message : "Could not load account balances."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canUseFinance, financeClient]
  );

  useEffect(() => {
    if (!authLoading) void loadSummary();
  }, [authLoading, canUseFinance, loadSummary]);

  function openItem(item: { id: string }) {
    const navItem = ACCOUNTS_ADMIN_SECTIONS
      .flatMap((section) => section.items)
      .find((candidate) => candidate.id === item.id);
    if (navItem) router.push(navItem.route as never);
  }

  if (authLoading || loading) {
    return <AdminLoadingState label="Loading…" testID="accounts-hub-loading" />;
  }

  if (!isSignedIn && !canUseFinance) {
    return (
      <View style={styles.centered} testID="finance-sign-in-required">
        <Ionicons name="lock-closed-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>Use finance credentials to open Accounts.</Text>
        <Pressable
          testID="finance-sign-in-empty"
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!canUseFinance) {
    return (
      <View style={styles.centered} testID="finance-access-denied">
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Finance access required</Text>
        <Text style={styles.emptyText}>This app is for authorized finance staff only.</Text>
      </View>
    );
  }

  const roleLabel = displayRoleLabel(organizationRole, isOwner);

  return (
    <AdminScreen
      testID="accounts-admin-hub"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadSummary("refresh")} />
      }
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xl,
      }}
    >
      <View style={styles.header} testID="accounts-hub-header">
        <View style={styles.headerText}>
          <Text style={styles.title}>Accounts</Text>
          <Text style={styles.subtitle}>Finance modules — same as web admin sidebar</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void loadSummary("refresh")}
          testID="accounts-hub-error"
        />
      ) : null}

      {totalBalance !== null ? (
        <Pressable
          testID="accounts-hub-balance-chip"
          accessibilityRole="button"
          accessibilityLabel={`Total balance ${formatBalance(totalBalance)}`}
          accessibilityHint="Opens bank and cash accounts"
          onPress={() => router.push("/admin/finance/accounts" as never)}
          style={({ pressed }) => [styles.balanceCard, pressed && styles.balancePressed]}
        >
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>{formatBalance(totalBalance)}</Text>
          <View style={styles.balanceLink}>
            <Text style={styles.balanceLinkText}>View accounts</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </Pressable>
      ) : null}

      {ACCOUNTS_ADMIN_SECTIONS.map((section) => (
        <AdminHubSection
          key={section.id}
          id={section.id}
          title={section.title}
          items={section.items}
          onPressItem={openItem}
        />
      ))}
    </AdminScreen>
  );
}

export default function AccountsFinanceHubScreen() {
  return (
    <OfflineGate policy="online_only">
      <AccountsFinanceHub />
    </OfflineGate>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  primaryButtonText: { color: Colors.textInverse, fontWeight: "800", fontSize: FontSize.md },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerText: { flex: 1, gap: 4 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rolePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  rolePillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },

  balanceCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primarySoft,
    gap: 4,
  },
  balancePressed: { opacity: 0.92 },
  balanceLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  balanceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: Spacing.xs,
  },
  balanceLinkText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
});
