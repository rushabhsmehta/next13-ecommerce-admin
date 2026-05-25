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
import { ApiError, withAuth } from "@/lib/api";
import {
  ASSOCIATE_OPERATIONS_SECTIONS,
  OPERATIONS_ADMIN_SECTIONS,
  filterOperationsNavSections,
  type OperationsNavItem,
} from "@/lib/operations-admin-nav";

type HubStat = {
  id: string;
  label: string;
  value: number | string;
  requiresAttention: boolean;
};

type HubOverview = {
  generatedAt: string;
  stats: HubStat[];
};

const STAT_CHIPS: { id: string; label: string; route: string; associateRoute?: string }[] = [
  { id: "open-inquiries", label: "Open inquiries", route: "/admin/crm/inquiries", associateRoute: "/associate/inquiries" },
  { id: "follow-ups-due", label: "Follow-ups", route: "/admin/crm/inquiries", associateRoute: "/associate/inquiries" },
  { id: "tour-queries", label: "Tour queries", route: "/admin/tour-queries" },
  { id: "open-todos", label: "Open todos", route: "/admin/todos" },
];

function displayRoleLabel(
  role: string | null,
  isAssociate: boolean,
  isOwner: boolean
): string {
  if (isAssociate) return "Associate";
  if (isOwner) return "Owner";
  if (role === "ADMIN") return "Admin";
  if (role === "OPERATIONS") return "Operations";
  if (role === "FINANCE") return "Finance";
  if (role === "VIEWER") return "Viewer";
  return role ? role.charAt(0) + role.slice(1).toLowerCase() : "Staff";
}

function formatStatValue(value: number | string): string {
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}

export function OperationsAdminHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const {
    organizationRole,
    isAssociate,
    canUseAdmin,
    permissions,
    isLoading: authLoading,
    isOwner,
  } = useCurrentUser();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const adminRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [overview, setOverview] = useState<HubOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!canUseAdmin) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await adminRequest<HubOverview>("/api/mobile/admin/overview", { retries: 1 });
        setOverview(data);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load dashboard counts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminRequest, canUseAdmin]
  );

  useEffect(() => {
    if (!authLoading) void loadOverview();
  }, [authLoading, canUseAdmin, loadOverview]);

  const navSections = useMemo(() => {
    const base = isAssociate ? ASSOCIATE_OPERATIONS_SECTIONS : OPERATIONS_ADMIN_SECTIONS;
    return filterOperationsNavSections(base, { permissions, isAssociate });
  }, [isAssociate, permissions]);

  const statChips = useMemo(() => {
    const stats = overview?.stats ?? [];
    return STAT_CHIPS.map((chip) => {
      const stat = stats.find((s) => s.id === chip.id);
      if (!stat) return null;
      if (chip.id === "open-todos" && isAssociate) return null;
      const route =
        isAssociate && chip.associateRoute ? chip.associateRoute : chip.route;
      return {
        ...chip,
        value: formatStatValue(stat.value),
        attention: stat.requiresAttention,
        route,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [overview?.stats, isAssociate]);

  function openItem(item: OperationsNavItem) {
    router.push(item.route as never);
  }

  if (authLoading || loading) {
    return <AdminLoadingState label="Loading…" testID="operations-hub-loading" />;
  }

  if (!isSignedIn && !canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>Use your staff account to open Operations.</Text>
        <Pressable
          testID="operations-hub-sign-in"
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

  if (!canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No access</Text>
        <Text style={styles.emptyText}>Operations isn’t enabled for this account.</Text>
      </View>
    );
  }

  const roleLabel = displayRoleLabel(organizationRole, isAssociate, isOwner);

  return (
    <AdminScreen
      testID="operations-admin-hub"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadOverview("refresh")} />
      }
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xl,
      }}
    >
      <View style={styles.header} testID="operations-hub-header">
        <View style={styles.headerText}>
          <Text style={styles.title}>Operations</Text>
          <Text style={styles.subtitle}>Same modules as web CRM — tap a card to open</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void loadOverview("refresh")}
          testID="operations-hub-error"
        />
      ) : null}

      {statChips.length ? (
        <View style={styles.statsRow} testID="operations-hub-stats">
          {statChips.map((chip) => (
            <Pressable
              key={chip.id}
              testID={`operations-stat-${chip.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${chip.label}, ${chip.value}`}
              onPress={() => router.push(chip.route as never)}
              style={({ pressed }) => [
                styles.statChip,
                chip.attention && styles.statChipAttention,
                pressed && styles.statChipPressed,
              ]}
            >
              <Text style={[styles.statValue, chip.attention && styles.statValueAttention]}>
                {chip.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {navSections.map((section) => (
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

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statChip: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    gap: 2,
  },
  statChipAttention: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  statChipPressed: { opacity: 0.9 },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
  },
  statValueAttention: {
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
