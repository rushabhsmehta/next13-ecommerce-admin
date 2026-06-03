import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { createCustomersClient, type CustomerDetail } from "@/lib/customers";
import { PermissionGate } from "@/components/auth/PermissionGate";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function CustomerDetailScreen() {
  return (
    <PermissionGate permission="crm.read">
      <CustomerDetailScreenInner />
    </PermissionGate>
  );
}

function CustomerDetailScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const client = useMemo(() => createCustomersClient(request), [request]);

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          err instanceof ApiError ? err.message : "Could not load customer.";
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

  if (loading) {
    return <AdminLoadingState label="Loading customer…" testID="customer-detail-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="customer-detail-error">
        <Stack.Screen options={{ title: "Customer", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Customer not found"}
          onRetry={() => void load()}
          testID="customer-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { customer, inquiries, sales, summary } = data;
  const initials = (customer.name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AdminScreen
      testID="customer-detail-screen"
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
      <Stack.Screen options={{ title: customer.name, headerShown: false }} />

      <AdminTopBar
        title={customer.name}
        subtitle={customer.contact ?? customer.email ?? "Customer"}
        onBackPress={() => router.back()}
        testID="customer-detail-header"
        rightSlot={
          <AdminTopBarIconButton
            icon="create-outline"
            label="Edit customer"
            testID={`customer-edit-${customer.id}`}
            onPress={() => router.push(`/admin/customers/${customer.id}/edit` as never)}
          />
        }
      />

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {customer.email ? <Text style={styles.profileMeta}>{customer.email}</Text> : null}
        {customer.contact ? <Text style={styles.profileMeta}>{customer.contact}</Text> : null}
        <View style={styles.profileActions}>
          {customer.contact ? (
            <Pressable
              accessibilityLabel="Call customer"
              style={styles.profileAction}
              onPress={() => Linking.openURL(`tel:${customer.contact}`)}
            >
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.profileActionText}>Call</Text>
            </Pressable>
          ) : null}
          {customer.contact ? (
            <Pressable
              accessibilityLabel="WhatsApp customer"
              style={styles.profileAction}
              onPress={() => {
                const num = customer.contact!.replace(/[^0-9]/g, "");
                Linking.openURL(`https://wa.me/${num}`);
              }}
            >
              <Ionicons name="logo-whatsapp" size={16} color={Colors.primary} />
              <Text style={styles.profileActionText}>WhatsApp</Text>
            </Pressable>
          ) : null}
          {customer.email ? (
            <Pressable
              accessibilityLabel="Email customer"
              style={styles.profileAction}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}
            >
              <Ionicons name="mail" size={16} color={Colors.primary} />
              <Text style={styles.profileActionText}>Email</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.salesCount}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        <Pressable
          testID={`customer-ledger-${customer.id}`}
          accessibilityRole="button"
          accessibilityLabel="Open ledger"
          style={[
            styles.statCard,
            summary.outstanding > 0 ? styles.statCardAttention : null,
          ]}
          onPress={() => router.push(`/admin/customers/${customer.id}/ledger` as never)}
        >
          <Text style={styles.statValue}>{formatINR(summary.outstanding)}</Text>
          <Text style={styles.statLabel}>Outstanding · Tap for ledger</Text>
        </Pressable>
      </View>

      {customer.associatePartner ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Associate Partner</Text>
          <View style={styles.infoCard}>
            <Ionicons name="briefcase-outline" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{customer.associatePartner.name}</Text>
              <Text style={styles.infoMeta}>
                {customer.associatePartner.mobileNumber}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Inquiries</Text>
        {inquiries.length === 0 ? (
          <Text style={styles.muted}>No inquiries yet.</Text>
        ) : (
          inquiries.map((inq) => (
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
                  {inq.location?.label ?? "—"}
                </Text>
                <Text style={styles.listMeta}>
                  {inq.numAdults ?? 0} adults
                  {inq.numChildren5to11 ? `, ${inq.numChildren5to11} children` : ""}
                  {" · "}
                  {formatDate(inq.journeyDate ?? inq.createdAt)}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{inq.status}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {sales.length === 0 ? (
          <Text style={styles.muted}>No sales for this customer yet.</Text>
        ) : (
          sales.map((s) => (
            <View key={s.id} style={styles.listRow}>
              <View style={styles.listIcon}>
                <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {s.invoiceNumber ?? `#${s.id.slice(0, 8)}`}
                </Text>
                <Text style={styles.listMeta}>
                  {formatDate(s.saleDate)} · {s.status ?? "—"}
                </Text>
              </View>
              <Text style={styles.amount}>
                {formatINR(Number(s.salePrice) + Number(s.gstAmount ?? 0))}
              </Text>
            </View>
          ))
        )}
      </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
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
  profileMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  profileActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: "wrap" },
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
  statCardAttention: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
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
  amount: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
