import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { createOpsPortalClient, type OpsPortalInquiry } from "@/lib/ops-portal";

const PAGE_SIZE = 30;
const STATUS_FILTERS = ["", "pending", "contacted", "converted", "cancelled"];

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
  const [status, setStatus] = useState("");
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
    async (mode: "initial" | "refresh" | "more", term: string, statusFilter: string) => {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.list({
          search: term || undefined,
          status: statusFilter || undefined,
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Ops Portal", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Assigned Inquiries</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Loading..." : `${total} for ${staffName || "you"}`}
          </Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="ops-portal-search"
          accessibilityRole="search"
          accessibilityLabel="Search assigned inquiries"
          style={styles.searchInput}
          placeholder="Customer, phone, status, location"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmentWrap}>
        {STATUS_FILTERS.map((s) => {
          const active = status === s;
          const label = s || "all";
          return (
            <Pressable
              key={label}
              testID={`ops-portal-status-${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${label} assigned inquiries`}
              style={[styles.segment, active ? styles.segmentActive : null]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
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
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="clipboard-outline" size={38} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No assigned inquiries</Text>
              <Text style={styles.emptyText}>Assigned work will appear here.</Text>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
  },
  segmentActive: { backgroundColor: Colors.surface, borderBottomWidth: 2, borderBottomColor: Colors.primary },
  segmentText: { fontSize: 10, fontWeight: "900", color: Colors.textSecondary, textTransform: "capitalize" },
  segmentTextActive: { color: Colors.text },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  centered: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
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
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: "center" },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
