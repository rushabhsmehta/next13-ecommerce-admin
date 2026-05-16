import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { downloadAndShareExport, ExportKind } from "@/lib/exports";

const EXPORTS: Array<{
  id: ExportKind;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "inquiries-contacts",
    title: "Inquiry contacts",
    description:
      "Full CRM inquiry list with customer name, mobile, location, status, and associate partner.",
    icon: "people-outline",
  },
  {
    id: "queries-contacts",
    title: "Tour query contacts",
    description:
      "Confirmed and pending tour query contact list with linked customer + associate info.",
    icon: "map-outline",
  },
];

export default function ExportsScreen() {
  return (
    <PermissionGate permission="exports.read">
      <OfflineGate policy="online_only">
        <ExportsScreenInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function ExportsScreenInner() {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [busy, setBusy] = useState<ExportKind | null>(null);

  async function run(kind: ExportKind) {
    setBusy(kind);
    try {
      const { bytes } = await downloadAndShareExport(kind, () => getToken());
      const kb = Math.max(1, Math.round(bytes / 1024));
      Alert.alert("Export ready", `Generated ${kb} KB. Use Share to save the file.`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not generate the export.";
      Alert.alert("Export failed", message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      testID="exports-screen"
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
    >
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.kicker}>CRM exports</Text>
        <Text style={styles.heroTitle}>Pull contacts to share</Text>
        <Text style={styles.heroSubtitle}>
          Generates the same CSV the web admin produces, with full RBAC checks
          and an audit log row for every mobile-initiated download.
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        {EXPORTS.map((opt) => {
          const isBusy = busy === opt.id;
          return (
            <Pressable
              key={opt.id}
              testID={`export-${opt.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Export ${opt.title}`}
              accessibilityHint="Generates a CSV, then opens the system share sheet."
              disabled={busy !== null}
              style={[styles.card, busy && !isBusy ? styles.cardDisabled : null]}
              onPress={() => void run(opt.id)}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={opt.icon} size={22} color={Colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardDescription}>{opt.description}</Text>
              </View>
              {isBusy ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={20} color={Colors.primary} />
              )}
            </Pressable>
          );
        })}

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
          <Text style={styles.safetyText}>
            Every export is recorded with your user, timestamp, row count, and
            byte size so the team can audit who pulled data and when.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: Spacing.lg },
  hero: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.medium,
  },
  kicker: {
    color: "rgba(255,255,255,0.84)",
    fontSize: FontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: { color: "#fff", fontSize: FontSize.xxxl, fontWeight: "900", marginTop: 4 },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: FontSize.md,
    lineHeight: 21,
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.light,
  },
  cardDisabled: { opacity: 0.5 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  cardDescription: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19 },
  safetyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginTop: Spacing.sm,
  },
  safetyText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 19,
    fontWeight: "600",
  },
});
