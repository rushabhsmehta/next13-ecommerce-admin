import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Shadows, Spacing } from "@/constants/theme";
import {
  MobileAdminModule,
  OrganizationRole,
  useCurrentUser,
} from "@/hooks/useCurrentUser";
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
  organizationId: string | null;
  profile: AdminOverviewProfile;
  stats: AdminStat[];
  safety: Record<string, string>;
  rollout: string[];
};

function moduleRoute(moduleId: string, isAssociate: boolean): string | null {
  if (moduleId === "communications") return "/whatsapp";
  if (moduleId === "crm") {
    return isAssociate ? "/associate/inquiries" : "/admin/crm/inquiries";
  }
  return null;
}

function roleLabel(role: string | null, isAssociate: boolean) {
  if (role) return role.charAt(0) + role.slice(1).toLowerCase();
  return isAssociate ? "Associate" : "Mobile user";
}

function statusLabel(status: MobileAdminModule["status"]) {
  switch (status) {
    case "foundation":
      return "Foundation";
    case "ready":
      return "Ready";
    case "restricted":
      return "Restricted";
    default:
      return "Planned";
  }
}

export default function AdminTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const {
    organizationRole,
    isAssociate,
    canUseAdmin,
    canUseFinance,
    mobileNavigation,
    isLoading: authLoading,
  } = useCurrentUser();
  const adminRequest = useMemo(() => withAuth(() => getToken()), [getToken]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
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
        const data = await adminRequest<AdminOverview>("/api/mobile/admin/overview", {
          retries: 1,
        });
        setOverview(data);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not load the mobile admin dashboard.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminRequest, canUseAdmin]
  );

  useEffect(() => {
    if (!authLoading) void loadOverview();
  }, [authLoading, loadOverview]);

  function openModule(module: MobileAdminModule) {
    const route = moduleRoute(module.id, isAssociate);
    if (route) {
      router.push(route as never);
      return;
    }

    Alert.alert(
      module.title,
      `${module.description}\n\n${module.phase} acceptance: ${module.acceptanceTarget}\n\nWorkflows:\n${module.workflows
        .map((workflow) => `- ${workflow}`)
        .join("\n")}\n\nWeb routes covered: ${module.webRoutes.length}\nOffline policy: ${module.offlinePolicy.replace(/_/g, " ")}.`
    );
  }

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading admin workspace...</Text>
      </View>
    );
  }

  if (!isSignedIn && !canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Admin access required</Text>
        <Text style={styles.emptyText}>Sign in with an authorized staff account to use mobile admin.</Text>
        <Pressable
          testID="admin-sign-in"
          accessibilityRole="button"
          accessibilityLabel="Sign in to mobile admin"
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (!canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No admin workspace</Text>
        <Text style={styles.emptyText}>Your account does not currently have mobile admin permissions.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="admin-dashboard"
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadOverview("refresh")} />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.kicker}>Mobile Admin</Text>
            <Text style={styles.heroTitle}>Run today from here</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel(organizationRole, isAssociate)}</Text>
          </View>
        </View>
        <Text style={styles.heroSubtitle}>
          CRM, sales, operations, finance, communications, reports, settings, and audit controls
          are organized into role-aware mobile modules.
        </Text>
      </LinearGradient>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={18} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {overview?.stats?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.statsGrid}>
            {overview.stats.map((stat) => (
              <View
                key={stat.id}
                style={[
                  styles.statCard,
                  stat.requiresAttention ? styles.statCardAttention : null,
                ]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statCategory}>{stat.category}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Modules</Text>
        <Text style={styles.sectionHint}>
          Visible modules are based on your server-side role and associate access.
        </Text>
        <View style={styles.moduleList}>
          {mobileNavigation.map((module) => (
            <Pressable
              key={module.id}
              testID={`admin-module-${module.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${module.title}`}
              accessibilityHint={module.acceptanceTarget}
              style={styles.moduleCard}
              onPress={() => openModule(module)}
            >
              <View style={styles.moduleIcon}>
                <Ionicons name={module.icon as never} size={22} color={Colors.primary} />
              </View>
              <View style={styles.moduleBody}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.statusBadge}>{statusLabel(module.status)}</Text>
                </View>
                <Text style={styles.moduleDescription}>{module.description}</Text>
                <View style={styles.workflowList}>
                  {module.workflows.slice(0, 2).map((workflow) => (
                    <Text key={workflow} style={styles.workflowText}>
                      - {workflow}
                    </Text>
                  ))}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{module.phase}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{module.offlinePolicy.replace(/_/g, " ")}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{module.webRoutes.length} web routes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Guardrails</Text>
        <View style={styles.guardrailCard}>
          <Guardrail
            icon="cloud-offline-outline"
            title="Offline policy"
            text="CRM and operations can use drafts, but finance and sensitive settings require online confirmation."
          />
          <Guardrail
            icon="repeat-outline"
            title="Write retry policy"
            text="Non-idempotent finance writes stay protected from unsafe automatic retries."
          />
          <Guardrail
            icon="server-outline"
            title="Server truth"
            text="Roles, prices, balances, allocations, reports, and status transitions remain server-authoritative."
          />
          <Guardrail
            icon="shield-checkmark-outline"
            title={canUseFinance ? "Finance enabled" : "Finance restricted"}
            text={
              canUseFinance
                ? "Finance modules are available with online-only money movement safeguards."
                : "Finance modules remain hidden unless your role is Finance, Admin, or Owner."
            }
          />
        </View>
      </View>

      {overview?.rollout?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rollout Sequence</Text>
          <View style={styles.timelineCard}>
            {overview.rollout.map((item, index) => (
              <View key={item} style={styles.timelineRow}>
                <View style={styles.timelineIndex}>
                  <Text style={styles.timelineIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.timelineText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Guardrail({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.guardrailRow}>
      <View style={styles.guardrailIcon}>
        <Ionicons name={icon as never} size={18} color={Colors.primary} />
      </View>
      <View style={styles.guardrailBody}>
        <Text style={styles.guardrailTitle}>{title}</Text>
        <Text style={styles.guardrailText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  primaryButtonText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: FontSize.md,
  },
  hero: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.medium,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  kicker: {
    color: "rgba(255,255,255,0.78)",
    fontSize: FontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: Colors.textInverse,
    fontSize: FontSize.xxxl,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: FontSize.md,
    lineHeight: 21,
    marginTop: Spacing.md,
  },
  rolePill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  rolePillText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: FontSize.sm,
  },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    width: "47.8%",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  statCardAttention: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "700",
    marginTop: 4,
  },
  statCategory: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  moduleList: {
    gap: Spacing.md,
  },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    ...Shadows.light,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleBody: {
    flex: 1,
    gap: 5,
  },
  moduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  moduleTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: "900",
  },
  statusBadge: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    overflow: "hidden",
    fontWeight: "800",
  },
  moduleDescription: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  workflowList: {
    gap: 2,
    marginTop: 2,
  },
  workflowText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaDot: {
    color: Colors.textTertiary,
  },
  guardrailCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  guardrailRow: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  guardrailIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  guardrailBody: {
    flex: 1,
  },
  guardrailTitle: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  guardrailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  timelineCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  timelineIndex: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIndexText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: FontSize.xs,
  },
  timelineText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "700",
  },
});
