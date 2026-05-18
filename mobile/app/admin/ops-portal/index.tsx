import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import { createOpsPortalClient, type OpsPortalInquiry } from "@/lib/ops-portal";

const PAGE_SIZE = 30;
const STATUS_FILTERS = ["all", "pending", "contacted", "converted", "cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_OPTIONS = STATUS_FILTERS.map((s) => ({
  id: s,
  label: s,
}));

function fmtDate(value?: string | null): string {
  if (!value) return "No date";
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "No date";
  }
}

export default function OpsPortalScreen() {
  return (
    <PermissionGate permission="opsPortal.read">
      <OpsPortalInner />
    </PermissionGate>
  );
}

function OpsPortalInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOpsPortalClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<OpsPortalInquiry[]>([]);
  const [staffName, setStaffName] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", term: string, statusFilter: StatusFilter) => {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.list({
          search: term || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setStaffName(res.staff.name);
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
        setOffset(res.nextOffset);
        setHasMore(res.hasMore);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load assigned inquiries.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset]
  );

  useEffect(() => {
    void load("initial", debounced, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, status]);

  return (
    <AdminScreen scroll={false} testID="ops-portal-screen">
      <Stack.Screen options={{ title: "Ops Portal", headerShown: false }} />

      <AdminTopBar
        title="Assigned Inquiries"
        subtitle={loading ? "Loading..." : `${total} for ${staffName || "you"}`}
        onBackPress={() => router.back()}
        testID="ops-portal-header"
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Customer, phone, status, location"
        searchTestID="ops-portal-search"
        testID="ops-portal-command-bar"
      />

      <AdminSegmentedControl
        options={STATUS_OPTIONS}
        value={status}
        onChange={setStatus}
        testIDPrefix="ops-portal-status"
        scrollable={false}
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced, status)}
          testID="ops-portal-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debounced, status)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) void load("more", debounced, status);
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={styles.listLoader}
              size="large"
              color={Colors.primary}
            />
          ) : (
            <AdminEmptyState
              icon="clipboard-outline"
              title="No assigned inquiries"
              body="Assigned work will appear here."
              testID="ops-portal-empty"
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`ops-portal-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open assigned inquiry for ${item.customerName}`}
            style={styles.row}
            onPress={() => router.push(`/admin/ops-portal/${item.id}` as never)}
          >
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.customerMobileNumber} - {item.location?.label ?? "No location"}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                Journey {fmtDate(item.journeyDate)} - Follow-up {fmtDate(item.nextFollowUpDate)}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: Colors.primaryBg,
  },
  statusText: { fontSize: 10, fontWeight: "900", color: Colors.primary },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
