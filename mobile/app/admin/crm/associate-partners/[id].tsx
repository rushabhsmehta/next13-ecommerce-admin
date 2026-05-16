import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  createAssociatePartnersClient,
  type AssociatePartnerDetail,
} from "@/lib/associate-partners";
import { AssociatePartnerForm } from "@/components/associate-partners/AssociatePartnerForm";

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
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

export default function AssociatePartnerDetailScreen() {
  return (
    <PermissionGate permission="crm.read">
      <AssociatePartnerDetailScreenInner />
    </PermissionGate>
  );
}

function AssociatePartnerDetailScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(
    () => createAssociatePartnersClient(authRequest),
    [authRequest]
  );

  const [data, setData] = useState<AssociatePartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await client.get(id);
        setData(res);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load partner.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!data) return;
    Alert.alert(
      `Remove ${data.partner.name}?`,
      data.summary.inquiryCount > 0
        ? "This partner has linked inquiries. We'll deactivate them instead of deleting to preserve history."
        : "This permanently removes the partner.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: data.summary.inquiryCount > 0 ? "Deactivate" : "Delete",
          style: "destructive",
          onPress: () => void doDelete(),
        },
      ]
    );
  }

  async function doDelete() {
    if (!id) return;
    setBusy(true);
    try {
      await client.delete(id);
      router.back();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not remove partner.";
      Alert.alert("Delete failed", message);
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    return (
      <AssociatePartnerForm
        mode="edit"
        partnerId={data.partner.id}
        initial={{
          name: data.partner.name ?? "",
          mobileNumber: data.partner.mobileNumber ?? "",
          email: data.partner.email ?? "",
          gmail: data.partner.gmail ?? "",
          isActive: data.partner.isActive !== false,
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errorText}>{error ?? "Partner not found"}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void load()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { partner, summary, recentInquiries } = data;
  const initials = (partner.name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: partner.name, headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor="#fff"
          />
        }
      >
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.heroTopRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.heroBack}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <Pressable
                testID={`partner-edit-${partner.id}`}
                accessibilityRole="button"
                accessibilityLabel="Edit partner"
                style={styles.heroBack}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable
                testID={`partner-delete-${partner.id}`}
                accessibilityRole="button"
                accessibilityLabel="Remove partner"
                style={styles.heroBack}
                onPress={() => void confirmDelete()}
                disabled={busy}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{partner.name}</Text>
          <Text style={styles.heroPhone}>{partner.mobileNumber}</Text>
          {!partner.isActive ? (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          ) : null}
          <View style={styles.heroActions}>
            <Pressable
              accessibilityLabel="Call partner"
              style={styles.heroAction}
              onPress={() => Linking.openURL(`tel:${partner.mobileNumber}`)}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.heroActionText}>Call</Text>
            </Pressable>
            {partner.email ? (
              <Pressable
                accessibilityLabel="Email partner"
                style={styles.heroAction}
                onPress={() => Linking.openURL(`mailto:${partner.email}`)}
              >
                <Ionicons name="mail" size={16} color="#fff" />
                <Text style={styles.heroActionText}>Email</Text>
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.inquiryCount}</Text>
            <Text style={styles.statLabel}>Inquiries</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.infoCard}>
            <Ionicons name="call" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{partner.mobileNumber}</Text>
              <Text style={styles.infoMeta}>Mobile</Text>
            </View>
          </View>
          {partner.email ? (
            <View style={styles.infoCard}>
              <Ionicons name="mail" size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{partner.email}</Text>
                <Text style={styles.infoMeta}>Email</Text>
              </View>
            </View>
          ) : null}
          {partner.gmail ? (
            <View style={styles.infoCard}>
              <Ionicons name="logo-google" size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{partner.gmail}</Text>
                <Text style={styles.infoMeta}>Clerk login</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Inquiries</Text>
          {recentInquiries.length === 0 ? (
            <Text style={styles.muted}>No inquiries from this partner yet.</Text>
          ) : (
            recentInquiries.map((inq) => (
              <Pressable
                key={inq.id}
                accessibilityRole="button"
                accessibilityLabel={`Open inquiry ${inq.id.slice(0, 8)}`}
                style={styles.listRow}
                onPress={() => router.push(`/admin/crm/inquiries/${inq.id}` as never)}
              >
                <View style={styles.listIcon}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {inq.customerName}
                  </Text>
                  <Text style={styles.listMeta}>
                    {inq.location?.label ?? "—"} · {formatDate(inq.journeyDate ?? inq.createdAt)}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{inq.status}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  errorText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  primaryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },

  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: "center",
  },
  heroTopRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroBack: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.42)",
  },
  heroAvatarText: { color: "#fff", fontWeight: "900", fontSize: FontSize.xxl },
  heroName: { color: "#fff", fontSize: FontSize.xl, fontWeight: "900", marginTop: Spacing.sm },
  heroPhone: { color: "rgba(255,255,255,0.86)", fontSize: FontSize.sm },
  inactiveBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  inactiveBadgeText: { fontSize: FontSize.xs, fontWeight: "800", color: "#fff" },
  heroActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  heroAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  heroActionText: { color: "#fff", fontWeight: "700", fontSize: FontSize.sm },

  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },

  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xs,
  },
  infoTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  infoMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xs,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  listMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
    textTransform: "uppercase",
  },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
