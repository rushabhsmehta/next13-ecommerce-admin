import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
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
    return <AdminLoadingState label="Loading partner…" testID="partner-detail-loading" />;
  }
  if (error || !data) {
    return (
      <AdminScreen testID="partner-detail-error">
        <Stack.Screen options={{ title: "Partner", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Partner not found"}
          onRetry={() => void load()}
          testID="partner-detail-error-state"
        />
      </AdminScreen>
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
    <AdminScreen
      testID="partner-detail-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: partner.name, headerShown: false }} />

      <AdminTopBar
        title={partner.name}
        subtitle={partner.mobileNumber}
        onBackPress={() => router.back()}
        testID="partner-detail-header"
        badges={
          !partner.isActive
            ? [{ id: "inactive", label: "Inactive", variant: "warning" }]
            : undefined
        }
        rightSlot={
          <View style={styles.headerActions}>
            <AdminTopBarIconButton
              icon="create-outline"
              label="Edit partner"
              testID={`partner-edit-${partner.id}`}
              onPress={() => setEditing(true)}
            />
            <AdminTopBarIconButton
              icon="trash-outline"
              label="Remove partner"
              testID={`partner-delete-${partner.id}`}
              onPress={() => void confirmDelete()}
              disabled={busy}
            />
          </View>
        }
      />

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileActions}>
          <Pressable
            accessibilityLabel="Call partner"
            style={styles.profileAction}
            onPress={() => Linking.openURL(`tel:${partner.mobileNumber}`)}
          >
            <Ionicons name="call" size={16} color={Colors.primary} />
            <Text style={styles.profileActionText}>Call</Text>
          </Pressable>
          {partner.email ? (
            <Pressable
              accessibilityLabel="Email partner"
              style={styles.profileAction}
              onPress={() => Linking.openURL(`mailto:${partner.email}`)}
            >
              <Ionicons name="mail" size={16} color={Colors.primary} />
              <Text style={styles.profileActionText}>Email</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

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
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  headerActions: { flexDirection: "row", gap: 4 },
  profileCard: {
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  avatarText: { color: Colors.primary, fontWeight: "900", fontSize: FontSize.xxl },
  profileActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  profileAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
  },
  profileActionText: { color: Colors.primary, fontWeight: "700", fontSize: FontSize.sm },
  statsRow: { flexDirection: "row", gap: Spacing.md },
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
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
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
