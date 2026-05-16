import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
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
  const insets = useSafeAreaInsets();
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error || !staff) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText}>{error ?? "Staff not found"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: staff.name, headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {staff.name}
        </Text>
        {canWrite ? (
          <>
            <Pressable
              testID={`staff-edit-${staff.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit staff"
              style={styles.iconBtn}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color={Colors.text} />
            </Pressable>
            <Pressable
              testID={`staff-delete-${staff.id}`}
              accessibilityRole="button"
              accessibilityLabel="Remove staff"
              style={styles.iconBtn}
              disabled={busy}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </Pressable>
          </>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  errText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  retry: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
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
  contactRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  contactText: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  statCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.lg,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
