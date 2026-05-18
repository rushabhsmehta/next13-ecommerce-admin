import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
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
import { createOperationsClient, type DestinationDetail } from "@/lib/operations";
import { DestinationForm } from "@/components/operations/DestinationForm";

export default function DestinationDetailScreen() {
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

  const [data, setData] = useState<DestinationDetail | null>(null);
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
        setData(await client.getDestination(id));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load destination."
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
    Alert.alert(
      `Delete ${data.destination.name}?`,
      summary.hotelCount > 0
        ? `This destination has ${summary.hotelCount} linked hotel(s) and cannot be deleted.`
        : "This permanently removes the destination.",
      summary.hotelCount > 0
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
      await client.deleteDestination(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete destination."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    const d = data.destination;
    return (
      <DestinationForm
        mode="edit"
        destinationId={d.id}
        initial={{
          name: d.name,
          description: d.description ?? "",
          imageUrl: d.imageUrl ?? "",
          locationId: d.locationId,
          locationLabel: d.locationLabel,
          isActive: d.isActive,
        }}
      />
    );
  }

  if (loading) {
    return (
      <AdminLoadingState label="Loading destination…" testID="destination-detail-loading" />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="destination-detail-error">
        <Stack.Screen options={{ title: "Destination", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Destination not found"}
          onRetry={() => void load()}
          testID="destination-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { destination, summary } = data;
  const destinationImageUrl = destination.imageUrl?.trim();

  return (
    <AdminScreen
      testID="destination-detail-screen"
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
      <Stack.Screen options={{ title: destination.name, headerShown: false }} />
      <AdminTopBar
        title={destination.name}
        subtitle={destination.locationLabel}
        onBackPress={() => router.back()}
        testID="destination-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit destination"
                testID={`destination-edit-${destination.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete destination"
                testID={`destination-delete-${destination.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      {destinationImageUrl ? (
        <Image
          source={{ uri: destinationImageUrl }}
          style={styles.hero}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.card}>
        <Row label="Location" value={destination.locationLabel} />
        <Row label="Status" value={destination.isActive ? "Active" : "Inactive"} />
        {destination.description ? (
          <Row label="Description" value={destination.description} />
        ) : null}
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.hotelCount}</Text>
        <Text style={styles.statLabel}>Linked hotels</Text>
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
  hero: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceAlt,
  },
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
  statCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
