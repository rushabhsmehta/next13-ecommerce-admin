import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { createOperationsClient, type LocationDetail } from "@/lib/operations";
import { LocationForm } from "@/components/operations/LocationForm";

export default function LocationDetailScreen() {
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

  const [data, setData] = useState<LocationDetail | null>(null);
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
        setData(await client.getLocation(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load location.");
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
      `Delete ${data.location.label}?`,
      summary.linkedCount > 0
        ? `This location has ${summary.linkedCount} linked record(s) and cannot be deleted.`
        : "This permanently removes the location.",
      summary.linkedCount > 0
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
      await client.deleteLocation(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete location."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && data) {
    const l = data.location;
    return (
      <LocationForm
        mode="edit"
        locationId={l.id}
        initial={{
          label: l.label,
          imageUrl: l.imageUrl,
          slug: l.slug ?? "",
          tags: l.tags ?? "",
          isActive: l.isActive,
        }}
      />
    );
  }

  if (loading) {
    return (
      <AdminLoadingState label="Loading location…" testID="location-detail-loading" />
    );
  }

  if (error || !data) {
    return (
      <AdminScreen testID="location-detail-error">
        <Stack.Screen options={{ title: "Location", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Location not found"}
          onRetry={() => void load()}
          testID="location-detail-error-state"
        />
      </AdminScreen>
    );
  }

  const { location, summary } = data;
  const locationImageUrl = location.imageUrl.trim();

  return (
    <AdminScreen
      testID="location-detail-screen"
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
      <Stack.Screen options={{ title: location.label, headerShown: false }} />
      <AdminTopBar
        title={location.label}
        subtitle={location.isActive ? "Active" : "Inactive"}
        onBackPress={() => router.back()}
        testID="location-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit location"
                testID={`location-edit-${location.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Delete location"
                testID={`location-delete-${location.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      {locationImageUrl ? (
        <Image
          source={{ uri: locationImageUrl }}
          style={styles.hero}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Ionicons name="image-outline" size={28} color={Colors.textTertiary} />
        </View>
      )}
      <View style={styles.card}>
        <Row label="Status" value={location.isActive ? "Active" : "Inactive"} />
        {location.slug ? <Row label="Slug" value={location.slug} /> : null}
        {location.tags ? <Row label="Tags" value={location.tags} /> : null}
      </View>

      <Pressable
        testID={`location-view-destinations-${location.id}`}
        accessibilityRole="button"
        accessibilityLabel="View destinations for this location"
        style={styles.linkBanner}
        onPress={() =>
          router.push(
            `/admin/operations/destinations?locationId=${location.id}` as never
          )
        }
      >
        <Ionicons name="compass-outline" size={16} color={Colors.primary} />
        <Text style={styles.linkText}>View destinations ({summary.destinations})</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </Pressable>

      <View style={styles.statGrid}>
        <Stat label="Hotels" value={summary.hotels} />
        <Stat label="Destinations" value={summary.destinations} />
        <Stat label="Packages" value={summary.tourPackages} />
        <Stat label="Inquiries" value={summary.inquiries} />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
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
  linkBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  linkText: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
