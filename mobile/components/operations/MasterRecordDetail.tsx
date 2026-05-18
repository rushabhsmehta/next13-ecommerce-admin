import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
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

  if (String(mode ?? "") === "edit" && record && id) {
    return (
      <PermissionGate permission="operations.write">
        <MasterRecordForm kind={kind} mode="edit" recordId={id} initial={record} />
      </PermissionGate>
    );
  }

  if (loading) {
    return <AdminLoadingState label="Loading record…" testID={`${kind}-detail-loading`} />;
  }

  if (error || !record) {
    return (
      <AdminScreen testID={`${kind}-detail-error`}>
        <Stack.Screen options={{ title: "Record", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Record not found"}
          onRetry={() => void load()}
          testID={`${kind}-detail-error-state`}
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      testID={`${kind}-detail-screen`}
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
      <Stack.Screen options={{ title: record.title ?? "Record", headerShown: false }} />
      <AdminTopBar
        title={record.title || "Untitled"}
        subtitle={record.locationLabel || "No location"}
        onBackPress={() => router.back()}
        testID={`${kind}-detail-header`}
      />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name={kind === "itinerary" ? "list" : "walk"}
            size={22}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {record.title || "Untitled"}
        </Text>
        <Text style={styles.heroSub} numberOfLines={1}>
          {record.locationLabel || "No location"}
        </Text>
      </View>

      <Section title="Details">
        {"dayNumber" in record && record.dayNumber != null ? (
          <Info label="Day" value={String(record.dayNumber)} />
        ) : null}
        <Info label="Location" value={record.locationLabel || "No location"} />
        <View style={styles.descBlock}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.body}>{record.description || "No description"}</Text>
        </View>
      </Section>

      <View style={styles.footerActions}>
        <Pressable
          testID={`${kind}-detail-edit`}
          accessibilityRole="button"
          accessibilityLabel="Edit record"
          style={styles.primaryBtn}
          onPress={() => router.push(`${routeFor(kind)}/${id}?mode=edit` as never)}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          testID={`${kind}-detail-delete`}
          accessibilityRole="button"
          accessibilityLabel="Delete record"
          disabled={deleting}
          style={[styles.deleteBtn, deleting ? styles.disabled : null]}
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
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteText}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </AdminScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  hero: {
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  heroSub: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  sectionBody: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: 2,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  infoValue: { flex: 1, textAlign: "right", fontSize: FontSize.sm, color: Colors.text },
  descBlock: { gap: 4, paddingTop: Spacing.xs },
  body: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  footerActions: { flexDirection: "row", gap: Spacing.sm },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "900" },
  deleteBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  deleteText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: "900" },
  disabled: { opacity: 0.6 },
});
