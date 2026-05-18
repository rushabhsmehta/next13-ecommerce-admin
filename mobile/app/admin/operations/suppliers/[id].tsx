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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type SupplierDetail } from "@/lib/operations";
import { SupplierForm } from "@/components/operations/SupplierForm";

function inr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "₹0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtDate(s?: string | null): string {
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

export default function SupplierDetailScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("operations.write");
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<SupplierDetail | null>(null);
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
        setData(await client.getSupplier(id));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load supplier."
        );
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

  function confirmDelete() {
    if (!data) return;
    Alert.alert(
      `Delete ${data.supplier.name}?`,
      data.summary.purchaseCount > 0
        ? `This supplier has ${data.summary.purchaseCount} linked purchase(s) and cannot be deleted.`
        : "This permanently removes the supplier.",
      data.summary.purchaseCount > 0
        ? [{ text: "OK", style: "cancel" }]
        : [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
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
      await client.deleteSupplier(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete supplier."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    return (
      <SupplierForm
        mode="edit"
        supplierId={data.supplier.id}
        initial={{
          name: data.supplier.name ?? "",
          contact: data.supplier.contact ?? "",
          email: data.supplier.email ?? "",
          gstNumber: data.supplier.gstNumber ?? "",
          address: data.supplier.address ?? "",
        }}
      />
    );
  }

  if (loading) {
    return <AdminLoadingState label="Loading supplier…" testID="supplier-detail-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="supplier-detail-error">
        <Stack.Screen options={{ title: "Supplier", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Supplier not found"}
          onRetry={() => void load()}
          testID="supplier-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { supplier, summary, recentPurchases } = data;

  return (
    <AdminScreen
      testID="supplier-detail-screen"
      bottomInset={Spacing.xl}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: supplier.name, headerShown: false }} />
      <AdminTopBar
        title={supplier.name}
        subtitle={`${summary.purchaseCount} purchase(s)`}
        onBackPress={() => router.back()}
        testID="supplier-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit supplier"
                testID={`supplier-edit-${supplier.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete supplier"
                testID={`supplier-delete-${supplier.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      <View style={styles.card}>
        {supplier.contact ? (
          <Pressable
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${supplier.contact}`)}
          >
            <Ionicons name="call" size={16} color={Colors.primary} />
            <Text style={styles.contactText}>{supplier.contact}</Text>
          </Pressable>
        ) : null}
        {supplier.email ? (
          <Pressable
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${supplier.email}`)}
          >
            <Ionicons name="mail" size={16} color={Colors.primary} />
            <Text style={styles.contactText}>{supplier.email}</Text>
          </Pressable>
        ) : null}
        {supplier.gstNumber ? (
          <View style={styles.contactRow}>
            <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.contactText}>GST: {supplier.gstNumber}</Text>
          </View>
        ) : null}
        {supplier.address ? (
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.contactText}>{supplier.address}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.purchaseCount}</Text>
        <Text style={styles.statLabel}>Purchases</Text>
      </View>

      <Text style={styles.sectionTitle}>Recent purchases</Text>
      {recentPurchases.length === 0 ? (
        <Text style={styles.muted}>No purchases recorded.</Text>
      ) : (
        recentPurchases.map((p) => (
          <View key={p.id} style={styles.pRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pTitle} numberOfLines={1}>
                {p.billNumber || `#${p.id.slice(0, 8)}`}
              </Text>
              <Text style={styles.pMeta}>{fmtDate(p.purchaseDate)}</Text>
            </View>
            <Text style={styles.pAmount}>
              {inr((p.price ?? 0) + (p.gstAmount ?? 0))}
            </Text>
          </View>
        ))
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 4 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  contactText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  statCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary },
  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  pTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  pMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  pAmount: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
});
