import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import {
  createOperationsClient,
  type TransportPricingDetail,
} from "@/lib/operations";
import { TransportPricingForm } from "@/components/operations/TransportPricingForm";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string): string {
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

export default function TransportPricingDetailScreen() {
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

  const [data, setData] = useState<TransportPricingDetail | null>(null);
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
        setData(await client.getTransportPricing(id));
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load transport pricing."
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
      "Delete transport pricing?",
      `Remove pricing for ${data.transportPricing.locationLabel}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void doDelete() },
      ]
    );
  }

  async function doDelete() {
    if (!id) return;
    setBusy(true);
    try {
      await client.deleteTransportPricing(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete transport pricing."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    const p = data.transportPricing;
    return (
      <TransportPricingForm
        mode="edit"
        pricingId={p.id}
        initial={{
          locationId: p.locationId,
          locationLabel: p.locationLabel,
          vehicleTypeId: p.vehicleTypeId ?? "",
          vehicleTypeName: p.vehicleTypeName ?? "",
          price: String(p.price),
          transportType: p.transportType,
          description: p.description ?? "",
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          isActive: p.isActive,
        }}
      />
    );
  }

  if (loading) {
    return (
      <AdminLoadingState
        label="Loading transport pricing…"
        testID="transport-pricing-detail-loading"
      />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="transport-pricing-detail-error">
        <Stack.Screen options={{ title: "Transport pricing", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Transport pricing not found"}
          onRetry={() => void load()}
          testID="transport-pricing-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const p = data.transportPricing;

  return (
    <AdminScreen
      testID="transport-pricing-detail-screen"
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
      <Stack.Screen options={{ title: p.locationLabel, headerShown: false }} />
      <AdminTopBar
        title={p.locationLabel}
        subtitle={p.vehicleTypeName ?? undefined}
        onBackPress={() => router.back()}
        testID="transport-pricing-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit transport pricing"
                testID={`transport-pricing-edit-${p.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete transport pricing"
                testID={`transport-pricing-delete-${p.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      <View style={styles.card}>
        <Row label="Vehicle" value={p.vehicleTypeName ?? "—"} />
        <Row
          label="Type"
          value={p.transportType === "PerDay" ? "Per day" : "Per trip"}
        />
        <Row label="Price" value={inr(p.price)} />
        <Row label="Period" value={`${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}`} />
        <Row label="Status" value={p.isActive ? "Active" : "Inactive"} />
        {p.description ? <Row label="Notes" value={p.description} /> : null}
      </View>
    </AdminScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  row: { gap: 2 },
  rowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rowValue: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
