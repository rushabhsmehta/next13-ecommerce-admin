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
import {
  createOperationsClient,
  type OperationalStaffMember,
} from "@/lib/operations";
import { StaffForm } from "@/components/operations/StaffForm";

export default function StaffDetailScreen() {
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

  const [staff, setStaff] = useState<OperationalStaffMember | null>(null);
  const [assigned, setAssigned] = useState(0);
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
        const res = await client.getStaff(id);
        setStaff(res.staff);
        setAssigned(res.summary.assignedInquiries);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load staff."
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
    if (!staff) return;
    Alert.alert(
      `Remove ${staff.name}?`,
      assigned > 0
        ? `This staff member has ${assigned} assigned inquiry(s); they will be deactivated instead of deleted.`
        : "This permanently removes the staff member.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: assigned > 0 ? "Deactivate" : "Delete",
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
      await client.deleteStaff(id);
      router.back();
    } catch (err) {
      Alert.alert(
        "Remove failed",
        err instanceof ApiError ? err.message : "Could not remove staff."
      );
    } finally {
      setBusy(false);
    }
  }

  if (editing && staff) {
    return (
      <StaffForm
        mode="edit"
        staffId={staff.id}
        initial={{
          name: staff.name ?? "",
          email: staff.email ?? "",
          role: staff.role ?? "OPERATIONS",
          isActive: staff.isActive !== false,
        }}
      />
    );
  }

  if (loading) {
    return <AdminLoadingState label="Loading staff…" testID="staff-detail-loading" />;
  }

  if (error || !staff) {
    return (
      <AdminScreen testID="staff-detail-error">
        <Stack.Screen options={{ title: "Staff", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Staff not found"}
          onRetry={() => void load()}
          testID="staff-detail-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      testID="staff-detail-screen"
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
      <Stack.Screen options={{ title: staff.name, headerShown: false }} />
      <AdminTopBar
        title={staff.name}
        subtitle={staff.role === "ADMIN" ? "Admin" : "Operations"}
        onBackPress={() => router.back()}
        testID="staff-detail-header"
        rightSlot={
          canWrite ? (
            <View style={styles.headerActions}>
              <AdminTopBarIconButton
                icon="create-outline"
                label="Edit staff"
                testID={`staff-edit-${staff.id}`}
                onPress={() => setEditing(true)}
              />
              <AdminTopBarIconButton
                icon="trash-outline"
                label="Remove staff"
                testID={`staff-delete-${staff.id}`}
                disabled={busy}
                onPress={confirmDelete}
              />
            </View>
          ) : null
        }
      />
      <View style={styles.card}>
        <Pressable
          style={styles.contactRow}
          onPress={() => Linking.openURL(`mailto:${staff.email}`)}
        >
          <Ionicons name="mail" size={16} color={Colors.primary} />
          <Text style={styles.contactText}>{staff.email}</Text>
        </Pressable>
        <View style={styles.contactRow}>
          <Ionicons name="shield-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.contactText}>
            {staff.role === "ADMIN" ? "Admin" : "Operations"}
          </Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons
            name={staff.isActive ? "checkmark-circle" : "close-circle"}
            size={16}
            color={staff.isActive ? (Colors.success ?? "#16a34a") : Colors.textTertiary}
          />
          <Text style={styles.contactText}>
            {staff.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statValue}>{assigned}</Text>
        <Text style={styles.statLabel}>Assigned inquiries</Text>
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
});
