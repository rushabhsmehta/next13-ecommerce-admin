import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const insets = useSafeAreaInsets();
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
        <Text style={styles.emptyTitle}>{error ?? "Customer not found"}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void load()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: customer.name, headerShown: false }} />
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
            <Pressable
              testID={`customer-edit-${customer.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit customer"
              style={styles.heroBack}
              onPress={() => router.push(`/admin/customers/${customer.id}/edit` as never)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{customer.name}</Text>
          {customer.email ? (
            <Text style={styles.heroEmail}>{customer.email}</Text>
          ) : null}
          {customer.contact ? (
            <Text style={styles.heroPhone}>{customer.contact}</Text>
          ) : null}

          <View style={styles.heroActions}>
            {customer.contact ? (
              <Pressable
                accessibilityLabel="Call customer"
                style={styles.heroAction}
                onPress={() => Linking.openURL(`tel:${customer.contact}`)}
              >
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.heroActionText}>Call</Text>
              </Pressable>
            ) : null}
            {customer.contact ? (
              <Pressable
                accessibilityLabel="WhatsApp customer"
                style={styles.heroAction}
                onPress={() => {
                  const num = customer.contact!.replace(/[^0-9]/g, "");
                  Linking.openURL(`https://wa.me/${num}`);
                }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.heroActionText}>WhatsApp</Text>
              </Pressable>
            ) : null}
            {customer.email ? (
              <Pressable
                accessibilityLabel="Email customer"
                style={styles.heroAction}
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
              >
                <Ionicons name="mail" size={16} color="#fff" />
                <Text style={styles.heroActionText}>Email</Text>
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>

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
  heroName: {
    color: "#fff",
    fontSize: FontSize.xl,
    fontWeight: "900",
    marginTop: Spacing.sm,
  },
  heroEmail: { color: "rgba(255,255,255,0.86)", fontSize: FontSize.sm, marginTop: 2 },
  heroPhone: { color: "rgba(255,255,255,0.86)", fontSize: FontSize.sm },
  heroActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
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
    elevation: 1,
  },
  statCardAttention: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },

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
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
});
