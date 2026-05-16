import { useMemo } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
import { useCurrentUser, MobileAdminModule } from "@/hooks/useCurrentUser";

/**
 * Generic "Coming soon" screen for admin modules that are listed in
 * MOBILE_ADMIN_MODULES but don't have a mobile implementation yet.
 *
 * The user reached this screen because their role grants permission to the
 * module (server-filtered list in mobileNavigation) — so this is a Phase
 * roadmap signal, not a permission denial.
 */
export default function ComingSoonScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mobileNavigation } = useCurrentUser();

  const module: MobileAdminModule | null = useMemo(() => {
    if (!moduleId) return null;
    return mobileNavigation.find((m) => m.id === moduleId) ?? null;
  }, [moduleId, mobileNavigation]);

  if (!module) {
    return (
      <View style={styles.empty}>
        <Ionicons name="help-circle-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Module not found</Text>
        <Text style={styles.emptyText}>
          That admin module does not exist for your role yet.
        </Text>
        <Pressable
          testID="coming-soon-back"
          accessibilityRole="button"
          accessibilityLabel="Back to admin"
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const firstWebRoute = module.webRoutes[0];
  const fallbackUrl = firstWebRoute ? `${API_BASE_URL}${firstWebRoute}` : null;

  function openOnWeb() {
    if (!fallbackUrl) return;
    void Linking.openURL(fallbackUrl);
  }

  return (
    <ScrollView
      testID="coming-soon-screen"
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroIcon}>
          <Ionicons name={module.icon as never} size={26} color="#fff" />
        </View>
        <Text style={styles.kicker}>Coming in {module.phase}</Text>
        <Text style={styles.heroTitle}>{module.title}</Text>
        <Text style={styles.heroSubtitle}>{module.description}</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this module will cover</Text>
        <View style={styles.workflowCard}>
          {module.workflows.map((workflow) => (
            <View key={workflow} style={styles.workflowRow}>
              <View style={styles.bullet} />
              <Text style={styles.workflowText}>{workflow}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Roadmap details</Text>
        <View style={styles.metaCard}>
          <MetaRow label="Phase" value={module.phase} />
          <MetaRow
            label="Status"
            value={
              module.status === "in-development"
                ? "In development"
                : module.status.charAt(0).toUpperCase() + module.status.slice(1)
            }
          />
          <MetaRow
            label="Offline policy"
            value={module.offlinePolicy.replace(/_/g, " ")}
          />
          <MetaRow
            label="Web parity scope"
            value={`${module.webRoutes.length} web routes`}
          />
          <MetaRow label="Acceptance target" value={module.acceptanceTarget} multiline />
        </View>
      </View>

      {fallbackUrl ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Use the web in the meantime</Text>
          <Pressable
            testID="coming-soon-open-web"
            accessibilityRole="button"
            accessibilityLabel="Open this module on the admin website"
            style={styles.linkButton}
            onPress={openOnWeb}
          >
            <Ionicons name="globe-outline" size={18} color={Colors.primary} />
            <Text style={styles.linkButtonText}>Open on admin web</Text>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </Pressable>
          <Text style={styles.linkHint}>Opens {firstWebRoute} in your browser.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function MetaRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text
        style={[styles.metaValue, multiline ? styles.metaValueMultiline : null]}
        numberOfLines={multiline ? undefined : 1}
      >
        {value}
      </Text>
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
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
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
  hero: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.medium,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  kicker: {
    color: "rgba(255,255,255,0.84)",
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
    color: "rgba(255,255,255,0.88)",
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  workflowCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  workflowRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  workflowText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  metaCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  metaLabel: {
    width: 130,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "600",
  },
  metaValueMultiline: {
    lineHeight: 19,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  linkButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.primary,
  },
  linkHint: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
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
});
