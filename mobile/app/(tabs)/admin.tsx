import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminActionRail,
  AdminEmptyState,
  AdminErrorState,
  AdminFocusCard,
  AdminFocusEmpty,
  AdminLoadingState,
  AdminMetricStrip,
  AdminModuleCard,
  AdminScreen,
  AdminSection,
  AdminToolGroup,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { OrganizationRole } from "@/hooks/useCurrentUser";
import { MobileAdminModule, useCurrentUser } from "@/hooks/useCurrentUser";
import { useNetwork } from "@/lib/network";
import { ApiError, withAuth } from "@/lib/api";
import { APP_VARIANT, isStaffApp } from "@/lib/app-variant";
import { OperationsAdminHub } from "@/components/admin/OperationsAdminHub";
import { AppVersionFooter } from "@/components/AppVersionFooter";

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

type QuickActionCtx = {
  permissions: string[];
  isAssociate: boolean;
  canUseFinance: boolean;
  isAdmin: boolean;
};

const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  route: string;
  visible: (c: QuickActionCtx) => boolean;
}[] = [
  {
    id: "new-inquiry",
    title: "Inquiry",
    icon: "person-add-outline",
    route: "/admin/crm/inquiries/new",
    visible: ({ permissions, isAssociate }) =>
      !isAssociate && permissions.includes("crm.write"),
  },
  {
    id: "new-trip",
    title: "Trip",
    icon: "map-outline",
    route: "/admin/tour-queries/create",
    visible: ({ permissions }) => permissions.includes("salesTrips.write"),
  },
  {
    id: "receipt",
    title: "Receipt",
    icon: "arrow-down-circle-outline",
    route: "/admin/finance/collect",
    visible: ({ canUseFinance, permissions }) =>
      canUseFinance && permissions.includes("finance.write"),
  },
  {
    id: "payment",
    title: "Payment",
    icon: "arrow-up-circle-outline",
    route: "/admin/finance/record",
    visible: ({ canUseFinance, permissions }) =>
      canUseFinance && permissions.includes("finance.write"),
  },
  {
    id: "flight-ticket",
    title: "Ticket",
    icon: "airplane-outline",
    route: "/admin/flight-tickets/new",
    visible: ({ permissions }) => permissions.includes("flightTickets.write"),
  },
  {
    id: "hotel",
    title: "Hotel",
    icon: "bed-outline",
    route: "/admin/operations/hotels/new",
    visible: ({ permissions }) => permissions.includes("operations.write"),
  },
  {
    id: "new-package",
    title: "Package",
    icon: "map-outline",
    route: "/admin/operations/tour-packages/new",
    visible: ({ permissions }) => permissions.includes("operations.write"),
  },
  {
    id: "ai-draft",
    title: "AI draft",
    icon: "sparkles-outline",
    route: "/admin/ai-wizards",
    visible: ({ permissions }) => permissions.includes("aiWizards.write"),
  },
];

const TOOL_GROUPS: { id: string; title: string; moduleIds: string[] }[] = [
  { id: "crm", title: "CRM", moduleIds: ["crm", "todos", "exports"] },
  { id: "sales", title: "Sales", moduleIds: ["sales-trips", "ai-wizards"] },
  {
    id: "operations",
    title: "Operations",
    moduleIds: ["operations", "flight-tickets", "website-management", "ops-portal"],
  },
  { id: "finance", title: "Finance", moduleIds: ["finance"] },
  { id: "communications", title: "Communications", moduleIds: ["communications"] },
  { id: "reports", title: "Reports", moduleIds: ["reports"] },
  { id: "settings", title: "Settings", moduleIds: ["settings", "travel-app-admin"] },
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

function resolveMetricRoute(statId: string, isAssociate: boolean): string | null {
  switch (statId) {
    case "open-inquiries":
    case "follow-ups-due":
      return isAssociate ? "/associate/inquiries" : "/admin/crm/inquiries";
    case "tour-queries":
      return "/admin/tour-queries";
    case "open-todos":
      return isAssociate ? null : "/admin/todos";
    case "receipts-payments":
      return isAssociate ? null : "/admin/finance";
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
  if (isStaffApp()) {
    return <OperationsAdminHub />;
  }
  return <LegacyAdminDashboard />;
}

function LegacyAdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const net = useNetwork();
  const { isSignedIn, getToken } = useAuth();
  const {
    organizationRole,
    isAdmin,
    isAssociate,
    canUseAdmin,
    canUseFinance,
    mobileNavigation,
    permissions,
    isLoading: authLoading,
    isOwner,
  } = useCurrentUser();

  const degraded = net.isInternetReachable === false && net.isOnline;
  const showNetPill = !net.isOnline || degraded;

  const quickActionCtx = useMemo<QuickActionCtx>(
    () => ({ permissions, isAssociate, canUseFinance, isAdmin }),
    [permissions, isAssociate, canUseFinance, isAdmin]
  );

  const quickActions = useMemo(() => {
    return QUICK_ACTIONS.filter((a) => a.visible(quickActionCtx)).slice(0, 6);
  }, [quickActionCtx]);

  const quickActionRail = useMemo(
    () =>
      quickActions.map((a) => ({
        id: a.id,
        title: a.title,
        icon: a.icon,
        iconColor: a.iconColor,
        onPress: () => router.push(a.route as never),
      })),
    [router, quickActions]
  );

  const modulesById = useMemo(() => {
    const m = new Map<string, MobileAdminModule>();
    for (const mod of mobileNavigation) {
      if (mod.id !== "today") m.set(mod.id, mod);
    }
    return m;
  }, [mobileNavigation]);

  const toolGroups = useMemo(() => {
    return TOOL_GROUPS.map((group) => ({
      ...group,
      modules: group.moduleIds
        .map((id) => modulesById.get(id))
        .filter((x): x is MobileAdminModule => !!x && x.status !== "planned"),
    })).filter((g) => g.modules.length > 0);
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

  const stats = (overview?.stats ?? []).filter(
    (stat) => APP_VARIANT !== "staff" || stat.id !== "receipts-payments"
  );
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

  const metricStripItems = useMemo(() => {
    const out: AdminStat[] = [];
    for (const id of SNAPSHOT_IDS) {
      const s = findStat(stats, id);
      if (s) out.push(s);
    }
    return out.slice(0, 6).map((st) => ({
      id: st.id,
      label: snapshotLabel(st),
      value: formatSnapshotStat(st),
      attention: st.requiresAttention,
      onPress: resolveMetricRoute(st.id, isAssociate)
        ? () => router.push(resolveMetricRoute(st.id, isAssociate)! as never)
        : undefined,
    }));
  }, [stats, isAssociate, router]);

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
    return <AdminLoadingState label="Loading admin…" testID="admin-loading" />;
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
  const topBadges = [
    { id: "role", label: roleBadgeLabel, variant: "neutral" as const },
    ...(showNetPill
      ? [
          {
            id: "net",
            label: net.isOnline ? "Limited connectivity" : "Offline",
            variant: (net.isOnline ? "warning" : "offline") as "warning" | "offline",
          },
        ]
      : []),
  ];

  return (
    <AdminScreen
      testID="admin-dashboard"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadOverview("refresh")} />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.md }}
    >
      <AdminTopBar
        title="Admin"
        subtitle={sync ?? "Pull down to refresh"}
        badges={topBadges}
        testID="admin-command-header"
      />

      {error ? (
        <AdminErrorState message={error} onRetry={() => void loadOverview("refresh")} testID="admin-overview-error" />
      ) : null}

      <AdminSection title="Focus" dense uppercaseEyebrow testID="admin-focus-section">
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

      {quickActionRail.length ? (
        <AdminSection title="Quick actions" dense uppercaseEyebrow testID="admin-quick-actions">
          <AdminActionRail
            compact
            singleRow={quickActionRail.length <= 4}
            actions={quickActionRail}
            testIDPrefix="admin-quick"
          />
        </AdminSection>
      ) : null}

      {metricStripItems.length ? (
        <AdminSection title="At a glance" dense uppercaseEyebrow testID="admin-snapshot-zone">
          <AdminMetricStrip items={metricStripItems} />
        </AdminSection>
      ) : null}

      <AdminSection title="Tools" dense uppercaseEyebrow testID="admin-tools-section">
        {toolGroups.map((group, index) => (
          <AdminToolGroup
            key={group.id}
            id={group.id}
            title={group.title}
            modules={group.modules}
            defaultExpanded={index === 0}
            onOpenModule={openModule}
          />
        ))}

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

      <AdminSection title="Continue work" dense uppercaseEyebrow testID="admin-recent-section">
        <AdminEmptyState
          icon="time-outline"
          title="No recent records yet"
          body="Trips and inquiries you open will appear here when that API is available."
          testID="admin-recent-empty"
        />
      </AdminSection>

      <AppVersionFooter
        detailed={isStaffApp()}
        testID="admin-app-version"
        style={styles.versionFooter}
      />

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

  toolsList: { gap: 2 },

  plannedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  plannedToggleText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },

  versionFooter: {
    marginTop: Spacing.md,
  },
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
