import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
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
import { createOperationsClient, type VehicleTypeDetail } from "@/lib/operations";
import { VehicleTypeForm } from "@/components/operations/VehicleTypeForm";

export default function VehicleTypeDetailScreen() {
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

  const [data, setData] = useState<VehicleTypeDetail | null>(null);
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
        setData(await client.getVehicleType(id));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load vehicle type."
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
    const { summary } = data;
    const msg =
      summary.usageCount > 0
        ? `This vehicle type is used in ${summary.usageCount} record(s). It will be deactivated instead of deleted.`
        : "This permanently removes the vehicle type.";
    Alert.alert(`Delete ${data.vehicleType.name}?`, msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: summary.usageCount > 0 ? "Deactivate" : "Delete",
        style: "destructive",
        onPress: () => void doDelete(),
      },
    ]);
  }

  async function doDelete() {
    if (!id) return;
    setBusy(true);
    try {
      const res = await client.deleteVehicleType(id);
      if (res.deactivated) {
        Alert.alert("Deactivated", `${res.vehicleType.name} was deactivated.`);
      }
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete vehicle type."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    const v = data.vehicleType;
    return (
      <VehicleTypeForm
        mode="edit"
        vehicleTypeId={v.id}
        initial={{
          name: v.name,
          description: v.description ?? "",
          isActive: v.isActive,
        }}
      />
    );
  }

  if (loading) {
    return (
      <AdminLoadingState label="Loading vehicle type…" testID="vehicle-type-detail-loading" />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="vehicle-type-detail-error">
        <Stack.Screen options={{ title: "Vehicle type", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Vehicle type not found"}
          onRetry={() => void load()}
          testID="vehicle-type-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { vehicleType, summary } = data;

  return (
    <AdminScreen
      testID="vehicle-type-detail-screen"
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
      <Stack.Screen options={{ title: vehicleType.name, headerShown: false }} />
      <AdminTopBar
        title={vehicleType.name}
        subtitle={vehicleType.isActive ? "Active" : "Inactive"}
        onBackPress={() => router.back()}
        testID="vehicle-type-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit vehicle type"
                testID={`vehicle-type-edit-${vehicleType.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete vehicle type"
                testID={`vehicle-type-delete-${vehicleType.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      <View style={styles.card}>
        {vehicleType.description ? (
          <Text style={styles.desc}>{vehicleType.description}</Text>
        ) : (
          <Text style={styles.muted}>No description</Text>
        )}
        <Text style={styles.status}>
          {vehicleType.isActive ? "Active" : "Inactive"}
        </Text>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.usageCount}</Text>
        <Text style={styles.statLabel}>Linked records</Text>
        <Text style={styles.statHint}>
          {summary.transportPricingsCount} pricing · {summary.transportDetailsCount}{" "}
          transport details
        </Text>
      </View>
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
  desc: { fontSize: FontSize.md, color: Colors.text },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary },
  status: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  statCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  statHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
});
