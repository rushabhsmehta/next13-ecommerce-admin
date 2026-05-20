import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createNotificationsClient,
  type AdminNotification,
} from "@/lib/notifications";

type FilterKey = "all" | "unread";

const FILTER_SEGMENTS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

export default function NotificationsScreen() {
  return (
    <PermissionGate permission="admin.dashboard.read">
      <NotificationsInner />
    </PermissionGate>
  );
}

function NotificationsInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createNotificationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [filter, setFilter] = useState<FilterKey>("all");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await client.list({
          unreadOnly: filter === "unread",
          limit: 100,
        });
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, filter]
  );

  useEffect(() => {
    void load();
  }, [load]);

  function navigateForNotification(n: AdminNotification) {
    if (n.type === "NEW_INQUIRY" && n.data?.inquiryId) {
      router.push(`/admin/crm/inquiries/${encodeURIComponent(n.data.inquiryId)}`);
    }
  }

  async function handleOpen(n: AdminNotification) {
    if (!n.read) {
      try {
        await client.markRead(n.id, true);
        setNotifications((prev) =>
          prev.map((row) => (row.id === n.id ? { ...row, read: true } : row))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // best-effort — still navigate
      }
    }
    navigateForNotification(n);
  }

  async function handleToggle(n: AdminNotification) {
    setBusy(n.id);
    try {
      await client.markRead(n.id, !n.read);
      setNotifications((prev) =>
        prev.map((row) => (row.id === n.id ? { ...row, read: !n.read } : row))
      );
      setUnreadCount((prev) => Math.max(0, prev + (n.read ? 1 : -1)));
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof ApiError ? err.message : "Could not update notification."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(n: AdminNotification) {
    setBusy(n.id);
    try {
      await client.delete(n.id);
      setNotifications((prev) => prev.filter((row) => row.id !== n.id));
      if (!n.read) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete notification."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkAllRead() {
    setBusy("mark-all");
    try {
      await client.markAllRead();
      await load("refresh");
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof ApiError ? err.message : "Could not mark notifications as read."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminScreen
      testID="notifications-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />
      }
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: "Notifications", headerShown: false }} />
      <AdminTopBar
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        onBackPress={() => router.back()}
        testID="notifications-header"
      />

      <View style={styles.controls}>
        <AdminSegmentedControl
          options={FILTER_SEGMENTS}
          value={filter}
          onChange={setFilter}
          testIDPrefix="notifications-filter"
          scrollable={false}
        />
        <Pressable
          testID="notifications-mark-all"
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
          disabled={busy !== null || unreadCount === 0}
          style={[
            styles.markAllButton,
            busy !== null || unreadCount === 0 ? styles.disabled : null,
          ]}
          onPress={() => void handleMarkAllRead()}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={Colors.primary} />
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh")}
          testID="notifications-error"
        />
      ) : null}
      {loading && notifications.length === 0 ? (
        <AdminLoadingState label="Loading notifications…" testID="notifications-loading" />
      ) : notifications.length === 0 ? (
        <AdminEmptyState
          icon="notifications-off-outline"
          title="No notifications"
          body={
            filter === "unread"
              ? "You have no unread notifications."
              : "You don't have any notifications yet."
          }
          testID="notifications-empty"
        />
      ) : (
        notifications.map((n) => (
          <Pressable
            key={n.id}
            testID={`notification-${n.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${n.title}. ${n.message}`}
            accessibilityHint={n.read ? "Already read" : "Tap to view"}
            style={[styles.row, !n.read ? styles.rowUnread : null]}
            onPress={() => void handleOpen(n)}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowHeader}>
                <Text style={[styles.rowTitle, !n.read ? styles.rowTitleUnread : null]}>
                  {n.title}
                </Text>
                {!n.read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.rowMessage} numberOfLines={3}>
                {n.message}
              </Text>
              <Text style={styles.rowMeta}>{formatDate(n.createdAt)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                testID={`notification-toggle-${n.id}`}
                accessibilityRole="button"
                accessibilityLabel={n.read ? "Mark as unread" : "Mark as read"}
                disabled={busy !== null}
                style={[styles.smallButton, busy !== null ? styles.disabled : null]}
                onPress={() => void handleToggle(n)}
              >
                <Ionicons
                  name={n.read ? "mail-unread-outline" : "checkmark-outline"}
                  size={16}
                  color={Colors.primary}
                />
              </Pressable>
              <Pressable
                testID={`notification-delete-${n.id}`}
                accessibilityRole="button"
                accessibilityLabel="Delete notification"
                disabled={busy !== null}
                style={[styles.smallButton, busy !== null ? styles.disabled : null]}
                onPress={() => void handleDelete(n)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
          </Pressable>
        ))
      )}
    </AdminScreen>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "No date";
  try {
    const d = new Date(value);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md },
  controls: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  markAllText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  disabled: { opacity: 0.45 },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  rowUnread: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  rowTitle: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.text, flex: 1 },
  rowTitleUnread: { fontWeight: "900" },
  rowMessage: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  actions: { flexDirection: "column", gap: 6 },
  smallButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
});
