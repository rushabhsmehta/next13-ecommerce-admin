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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminActionRail,
  AdminFocusCard,
  AdminFocusEmpty,
  AdminMetricCard,
  AdminModuleCard,
  AdminSection,
  AdminStatusPill,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { OrganizationRole } from "@/hooks/useCurrentUser";
import { MobileAdminModule, useCurrentUser } from "@/hooks/useCurrentUser";
import { useNetwork } from "@/lib/network";
import { ApiError, withAuth } from "@/lib/api";

type AdminStat = {
  id: string;
  label: string;
  value: number | string;
  category: string;
  requiresAttention: boolean;
};

type AdminOverviewProfile = {
  organizationRole: OrganizationRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isOperations: boolean;
  isAssociate: boolean;
  canUseAdmin: boolean;
  canUseFinance: boolean;
  permissions: string[];
  mobileNavigation: MobileAdminModule[];
};

type AdminOverview = {
  generatedAt: string;
  profile: AdminOverviewProfile;
  stats: AdminStat[];
};

const SHORTCUT_DEFINITIONS: {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  route: string;
  visible: (c: {
    isAdmin: boolean;
    canUseAdmin: boolean;
    canUseFinance: boolean;
  }) => boolean;
}[] = [
  {
    id: "crm",
    title: "CRM",
    icon: "people-outline",
    route: "/admin/crm/inquiries",
    visible: ({ canUseAdmin }) => canUseAdmin,
  },
  {
    id: "trips",
    title: "Trips",
    icon: "map-outline",
    route: "/admin/tour-queries",
    visible: ({ canUseAdmin }) => canUseAdmin,
  },
  {
    id: "finance",
    title: "Finance",
    icon: "cash-outline",
    route: "/admin/finance",
    visible: ({ canUseFinance, canUseAdmin }) => canUseFinance || canUseAdmin,
  },
  {
    id: "reports",
    title: "Reports",
    icon: "bar-chart-outline",
    route: "/admin/reports",
    visible: ({ canUseFinance, canUseAdmin }) => canUseFinance || canUseAdmin,
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    icon: "logo-whatsapp",
    iconColor: "#25D366",
    route: "/whatsapp",
    visible: ({ isAdmin }) => isAdmin,
  },
];

const TOOL_IDS: string[] = [
  "crm",
  "sales-trips",
  "finance",
  "reports",
  "operations",
  "flight-tickets",
  "website-management",
  "ai-wizards",
  "ops-portal",
  "travel-app-admin",
  "settings",
  "communications",
  "exports",
  "todos",
];

/** Dashboard snapshot (~6 Owner metrics) — omit audits/travel noise */
const SNAPSHOT_IDS: string[] = [
  "open-inquiries",
  "follow-ups-due",
  "tour-queries",
  "open-todos",
  "receipts-payments",
  "unread-notifications",
];

const ATTENTION_IDS_ORDER = [
  "follow-ups-due",
  "open-todos",
  "open-inquiries",
  "unread-notifications",
];

function attentionSortPriority(id: string): number {
  const idx = ATTENTION_IDS_ORDER.indexOf(id);
  return idx === -1 ? 99 + id.charCodeAt(0) : idx;
}

function moduleRoute(moduleId: string, isAssociate: boolean): string | null {
  if (moduleId === "communications") return "/whatsapp";
  if (moduleId === "crm") return isAssociate ? "/associate/inquiries" : "/admin/crm/inquiries";
  if (moduleId === "todos" && !isAssociate) return "/admin/todos";
  if (moduleId === "exports" && !isAssociate) return "/admin/exports";
  if (moduleId === "sales-trips") return "/admin/tour-queries";
  if (moduleId === "operations" && !isAssociate) return "/admin/operations";
  if (moduleId === "flight-tickets" && !isAssociate) return "/admin/flight-tickets";
  if (moduleId === "website-management" && !isAssociate) return "/admin/website";
  if (moduleId === "ai-wizards" && !isAssociate) return "/admin/ai-wizards";
  if (moduleId === "ops-portal" && !isAssociate) return "/admin/ops-portal";
  if (moduleId === "travel-app-admin" && !isAssociate) return "/admin/travel-app";
  if (moduleId === "settings" && !isAssociate) return "/admin/settings";
  if (moduleId === "finance" && !isAssociate) return "/admin/finance";
  if (moduleId === "reports" && !isAssociate) return "/admin/reports";
  return null;
}

function resolveAttentionRoute(statId: string, isAssociate: boolean): string | null {
  switch (statId) {
    case "follow-ups-due":
    case "open-inquiries":
      return isAssociate ? "/associate/inquiries" : "/admin/crm/inquiries";
    case "open-todos":
      return isAssociate ? null : "/admin/todos";
    case "unread-notifications":
      return null;
    default:
      return null;
  }
}

function displayRoleBadge(
  ctx: Pick<ReturnType<typeof useCurrentUser>, "organizationRole" | "isAssociate" | "isOwner">
): string {
  if (ctx.isAssociate) return "Associate";
  if (ctx.isOwner) return "Owner";
  const role = ctx.organizationRole;
  if (!role) return "Staff";
  if (role === "ADMIN") return "Admin";
  if (role === "FINANCE") return "Finance";
  if (role === "OPERATIONS") return "Ops";
  if (role === "VIEWER") return "Viewer";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function syncLine(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    return `Synced ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return null;
  }
}

function findStat(stats: AdminStat[], id: string): AdminStat | undefined {
  return stats.find((s) => s.id === id);
}

function formatSnapshotStat(stat: AdminStat): string {
  if (stat.id === "receipts-payments" && typeof stat.value === "string") {
    return stat.value.replace(/\s*\/\s*/, " · ");
  }
  if (typeof stat.value === "number") return stat.value.toLocaleString("en-IN");
  return String(stat.value);
}

function snapshotLabel(stat: AdminStat): string {
  const map: Record<string, string> = {
    "open-inquiries": "Open inquiries",
    "follow-ups-due": "Follow-ups due",
    "tour-queries": "Tour queries",
    "open-todos": "Open todos",
    "receipts-payments": "Receipts · payments",
    "unread-notifications": "Unread alerts",
  };
  return map[stat.id] ?? stat.label;
}

type FocusPick = {
  stat: AdminStat;
  title: string;
  detail: string;
  actionLabel?: string;
  tone: "high" | "medium";
};

function buildFocus(primaryStat: AdminStat | null): FocusPick | null {
  if (!primaryStat) return null;
  const n =
    typeof primaryStat.value === "number"
      ? primaryStat.value
      : Number.parseInt(String(primaryStat.value), 10);
  const countLabel = Number.isFinite(n) ? n.toLocaleString("en-IN") : String(primaryStat.value);

  switch (primaryStat.id) {
    case "follow-ups-due":
      return {
        stat: primaryStat,
        title: "Follow-ups need review",
        detail: `${countLabel} due now`,
        actionLabel: "Open CRM",
        tone: "high",
      };
    case "open-todos":
      return {
        stat: primaryStat,
        title: "Todos need review",
        detail: `${countLabel} open`,
        actionLabel: "Open todos",
        tone: "high",
      };
    case "open-inquiries":
      return {
        stat: primaryStat,
        title: "Open inquiries",
        detail: `${countLabel} open`,
        actionLabel: "Open CRM",
        tone: "medium",
      };
    case "unread-notifications":
      return {
        stat: primaryStat,
        title: "Unread alerts",
        detail: `${countLabel} waiting`,
        tone: "medium",
      };
    default:
      return null;
  }
}

export default function AdminTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const net = useNetwork();
  const { isSignedIn, getToken } = useAuth();
  const {
    organizationRole,
    isAdmin,
    isAssociate,
    canUseAdmin,
    canUseFinance,
    mobileNavigation,
    isLoading: authLoading,
    isOwner,
  } = useCurrentUser();

  const degraded = net.isInternetReachable === false && net.isOnline;
  const showNetPill = !net.isOnline || degraded;

  const shortcuts = useMemo(() => {
    return SHORTCUT_DEFINITIONS.filter((s) =>
      s.visible({
        isAdmin,
        canUseAdmin,
        canUseFinance,
      })
    ).slice(0, 5);
  }, [isAdmin, canUseAdmin, canUseFinance]);

  const shortcutActions = useMemo(
    () =>
      shortcuts.map((s) => ({
        ...s,
        route: s.id === "crm" && isAssociate ? "/associate/inquiries" : s.route,
        onPress: () =>
          router.push((s.id === "crm" && isAssociate ? "/associate/inquiries" : s.route) as never),
      })),
    [router, shortcuts, isAssociate]
  );

  const horizontalPad = Spacing.lg * 2;
  const layoutGutter = Spacing.sm;
  const usableWidth = Math.max(280, windowWidth - horizontalPad);
  const kpiCols = windowWidth >= 760 ? 3 : 2;
  const snapshotTile =
    kpiCols > 1 ? Math.floor((usableWidth - layoutGutter * (kpiCols - 1)) / kpiCols) : usableWidth;

  const modulesById = useMemo(() => {
    const m = new Map<string, MobileAdminModule>();
    for (const mod of mobileNavigation) {
      if (mod.id !== "today") m.set(mod.id, mod);
    }
    return m;
  }, [mobileNavigation]);

  const toolModules = useMemo(() => {
    return TOOL_IDS.map((id) => modulesById.get(id)).filter((x): x is MobileAdminModule => !!x && x.status !== "planned");
  }, [modulesById]);

  const plannedModules = useMemo(
    () => mobileNavigation.filter((m) => m.status === "planned" && m.id !== "today"),
    [mobileNavigation]
  );

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const adminRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadKeyRef = useRef<string | null>(null);
  const [plannedOpen, setPlannedOpen] = useState(false);

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
        const data = await adminRequest<AdminOverview>("/api/mobile/admin/overview", { retries: 1 });
        setOverview(data);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load the mobile admin dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminRequest, canUseAdmin]
  );

  useEffect(() => {
    if (authLoading) return;
    const key = `${canUseAdmin}:${organizationRole ?? ""}:${isAssociate}`;
    if (lastLoadKeyRef.current === key) return;
    lastLoadKeyRef.current = key;
    void loadOverview();
  }, [authLoading, canUseAdmin, organizationRole, isAssociate, loadOverview]);

  const stats = overview?.stats ?? [];
  const attentionStats = [...stats.filter((s) => s.requiresAttention)].sort(
    (a, b) => attentionSortPriority(a.id) - attentionSortPriority(b.id)
  );

  const primaryAttention = useMemo(() => {
    const routedFirst = attentionStats.find((s) => s.id !== "unread-notifications");
    return routedFirst ?? attentionStats[0] ?? null;
  }, [attentionStats]);

  const focusPick = primaryAttention ? buildFocus(primaryAttention) : null;

  const focusRoute = focusPick ? resolveAttentionRoute(focusPick.stat.id, isAssociate) : null;

  const moreAttentionCount =
    attentionStats.length > 1 && focusPick ? attentionStats.length - 1 : 0;

  const snapshotItems = useMemo(() => {
    const out: AdminStat[] = [];
    for (const id of SNAPSHOT_IDS) {
      const s = findStat(stats, id);
      if (s) out.push(s);
    }
    return out.slice(0, 6);
  }, [stats]);

  function openModule(module: MobileAdminModule) {
    const route = moduleRoute(module.id, isAssociate);
    if (route) {
      router.push(route as never);
      return;
    }
    router.push(`/admin/coming-soon?moduleId=${encodeURIComponent(module.id)}` as never);
  }

  function firstRoutedAttentionRoute(): string {
    const ordered = [...attentionStats].sort(
      (a, b) => attentionSortPriority(a.id) - attentionSortPriority(b.id)
    );
    for (const s of ordered) {
      const route = resolveAttentionRoute(s.id, isAssociate);
      if (route) return route;
    }
    return isAssociate ? "/associate/inquiries" : "/admin/crm/inquiries";
  }

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} accessibilityLabel="Loading admin" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!isSignedIn && !canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={42} color={Colors.textTertiary} accessibilityLabel="Locked" />
        <Text style={styles.emptyTitle}>Admin access required</Text>
        <Text style={styles.emptyText}>Sign in with authorized staff credentials.</Text>
        <Pressable
          testID="admin-sign-in"
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
        <Text style={styles.emptyTitle}>No admin workspace</Text>
        <Text style={styles.emptyText}>Mobile admin isn’t enabled for this account.</Text>
      </View>
    );
  }

  const roleBadgeLabel = displayRoleBadge({ organizationRole, isAssociate, isOwner });
  const sync = syncLine(overview?.generatedAt ?? null);

  return (
    <ScrollView
      testID="admin-dashboard"
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOverview("refresh")} />}
      showsVerticalScrollIndicator={false}
    >
      <View testID="admin-command-header" style={styles.toolbar}>
        <View style={styles.toolbarAccent} accessibilityElementsHidden />
        <View style={styles.toolbarRow}>
          <Text style={styles.toolbarTitle} allowFontScaling={false} accessibilityRole="header">
            Admin
          </Text>
          <AdminStatusPill label={roleBadgeLabel} variant="neutral" compact testID="admin-role-pill" />
          {showNetPill ? (
            <AdminStatusPill
              label={net.isOnline ? "Limited connectivity" : "Offline"}
              variant={net.isOnline ? "warning" : "offline"}
              compact
              testID="admin-connection-pill"
            />
          ) : null}
        </View>
        <Text style={styles.syncTiny} allowFontScaling={false}>
          {sync ?? "Pull down to refresh"}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={18} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AdminSection title="Focus" dense testID="admin-focus-section">
        {!attentionStats.length ? (
          <AdminFocusEmpty testID="admin-focus-empty" />
        ) : focusPick ? (
          <AdminFocusCard
            eyebrow="Today"
            title={focusPick.title}
            detail={focusPick.detail}
            actionLabel={focusPick.actionLabel}
            onPress={
              focusRoute && focusPick.actionLabel
                ? () => router.push(focusRoute as never)
                : undefined
            }
            priorityTone={focusPick.tone}
            secondaryLine={
              moreAttentionCount > 0
                ? `${moreAttentionCount} more ${moreAttentionCount === 1 ? "item needs" : "items need"} attention`
                : focusPick.stat.id === "unread-notifications"
                  ? "Unread alerts appear on web admin"
                  : undefined
            }
            onSecondaryPress={moreAttentionCount > 0 ? () => router.push(firstRoutedAttentionRoute() as never) : undefined}
            testID="admin-focus-card"
          />
        ) : (
          <AdminFocusEmpty />
        )}
      </AdminSection>

      {shortcutActions.length ? (
        <AdminSection title="Shortcuts" dense>
          <AdminActionRail
            compact
            singleRow={shortcutActions.length <= 5}
            actions={shortcutActions.map((s) => ({
              id: s.id,
              title: s.title,
              icon: s.icon,
              iconColor: s.iconColor,
              onPress: s.onPress,
            }))}
            testIDPrefix="admin-action"
          />
        </AdminSection>
      ) : null}

      {snapshotItems.length ? (
        <AdminSection title="Snapshot" dense testID="admin-snapshot-zone">
          <View style={[styles.snapRow, { gap: layoutGutter }]}>
            {snapshotItems.map((st) => (
              <View key={st.id} style={[styles.snapCell, { width: snapshotTile }]}>
                <AdminMetricCard
                  id={`snap-${st.id}`}
                  label={snapshotLabel(st)}
                  category={st.category}
                  value={formatSnapshotStat(st)}
                  dotTone={st.requiresAttention ? "attention" : "neutral"}
                  showCategory={false}
                  requiresAttention={false}
                />
              </View>
            ))}
          </View>
        </AdminSection>
      ) : null}

      <AdminSection title="Tools" dense>
        <View style={styles.toolsList}>
          {toolModules.map((mod) => (
            <AdminModuleCard key={mod.id} module={mod} variant="tool" onPress={() => openModule(mod)} />
          ))}
        </View>

        {plannedModules.length ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={plannedOpen ? "Hide planned modules" : "Show planned modules"}
              onPress={() => setPlannedOpen((v) => !v)}
              style={styles.plannedToggle}
              testID="admin-planned-toggle"
            >
              <Text style={styles.plannedToggleText}>
                {plannedOpen ? "Hide" : "Show"} upcoming modules ({plannedModules.length})
              </Text>
              <Ionicons name={plannedOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.textTertiary} />
            </Pressable>
            {plannedOpen ? (
              <View style={styles.toolsList}>
                {plannedModules.map((mod) => (
                  <AdminModuleCard key={`p-${mod.id}`} module={mod} variant="tool" onPress={() => openModule(mod)} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </AdminSection>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open admin safeguards"
        accessibilityHint="Shows safety and offline policies."
        onPress={() => router.push("/admin/safeguards" as never)}
        style={styles.footerLink}
        testID="admin-safeguards-link"
      >
        <Text style={styles.footerLinkText}>Admin safeguards</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} accessibilityElementsHidden />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: {
    gap: Spacing.xs,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.sm, color: Colors.textSecondary },
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

  toolbar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  toolbarAccent: {
    height: 2,
    width: 48,
    marginBottom: Spacing.sm,
    marginTop: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    marginLeft: 0,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  toolbarTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: 0,
  },
  syncTiny: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    marginTop: 2,
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: "#fff1f2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fecdd3",
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  errorText: { flex: 1, color: Colors.error, fontSize: FontSize.sm, fontWeight: "600" },

  snapRow: { flexDirection: "row", flexWrap: "wrap" },
  snapCell: { maxWidth: "100%" },

  toolsList: { gap: 2 },

  plannedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  plannedToggleText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },

  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
  },
  footerLinkText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textDecorationLine: "underline",
  },
});
