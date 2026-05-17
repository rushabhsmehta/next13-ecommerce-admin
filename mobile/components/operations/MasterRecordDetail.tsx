import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createOperationsClient,
  type OpsActivityMaster,
  type OpsItineraryMaster,
} from "@/lib/operations";
import { MasterRecordForm } from "@/components/operations/MasterRecordForm";

type Kind = "itinerary" | "activity";
type RecordRow = OpsItineraryMaster | OpsActivityMaster;

function routeFor(kind: Kind) {
  return kind === "itinerary" ? "/admin/operations/itineraries" : "/admin/operations/activities";
}

export function MasterRecordDetail({ kind }: { kind: Kind }) {
  return (
    <PermissionGate permission="operations.read">
      <Inner kind={kind} />
    </PermissionGate>
  );
}

function Inner({ kind }: { kind: Kind }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (loadMode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (loadMode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setRecord(kind === "itinerary" ? await client.getItinerary(id) : await client.getActivity(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load record.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, id, kind]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteRecord() {
    if (!id) return;
    setDeleting(true);
    try {
      if (kind === "itinerary") await client.deleteItinerary(id);
      else await client.deleteActivity(id);
      router.replace(routeFor(kind) as never);
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete record."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Record not found"}</Text>
      </View>
    );
  }

  if (String(mode ?? "") === "edit") {
    return (
      <PermissionGate permission="operations.write">
        <MasterRecordForm kind={kind} mode="edit" recordId={id} initial={record} />
      </PermissionGate>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: record.title ?? "Record", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {record.title || "Untitled"}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{record.locationLabel || "No location"}</Text>
          {"dayNumber" in record && record.dayNumber != null ? (
            <>
              <Text style={styles.label}>Day</Text>
              <Text style={styles.value}>{record.dayNumber}</Text>
            </>
          ) : null}
          <Text style={styles.label}>Description</Text>
          <Text style={styles.body}>{record.description || "No description"}</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            testID={`${kind}-detail-edit`}
            accessibilityRole="button"
            accessibilityLabel="Edit record"
            style={styles.primaryAction}
            onPress={() => router.push(`${routeFor(kind)}/${id}?mode=edit` as never)}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Edit</Text>
          </Pressable>
          <Pressable
            testID={`${kind}-detail-delete`}
            accessibilityRole="button"
            accessibilityLabel="Delete record"
            disabled={deleting}
            style={[styles.dangerAction, deleting ? styles.disabled : null]}
            onPress={() =>
              Alert.alert("Delete record?", "This removes the selected master record.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => void deleteRecord() },
              ])
            }
          >
            {deleting ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.dangerActionText}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errorText: { color: Colors.error, textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.sm,
  },
  value: { fontSize: FontSize.md, color: Colors.text, fontWeight: "700", marginTop: 4 },
  body: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: Spacing.sm },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryActionText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  dangerAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
  },
  dangerActionText: { color: Colors.error, fontWeight: "800", fontSize: FontSize.sm },
  disabled: { opacity: 0.6 },
});
