import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";

interface CustomerListItem {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  createdAt: string;
  associatePartner: { id: string; name: string } | null;
}

interface CustomerListResponse {
  customers: CustomerListItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

const PAGE_SIZE = 30;

export default function CustomersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { canUseAdmin, isLoading: authLoading } = useCurrentUser();
  // Stable request closure: re-creating it on every render causes the list
  // effect to re-fire and refresh in a loop.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", searchTerm: string) => {
      if (!canUseAdmin) {
        setLoading(false);
        return;
      }
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const nextOffset = mode === "more" ? offset : 0;
        const qs = new URLSearchParams();
        qs.set("limit", String(PAGE_SIZE));
        qs.set("offset", String(nextOffset));
        if (searchTerm) qs.set("search", searchTerm);
        const data = await request<CustomerListResponse>(
          `/api/mobile/customers?${qs.toString()}`,
          { retries: 1 }
        );
        setHasMore(data.hasMore);
        setOffset(data.nextOffset);
        setTotal(data.total);
        setItems((prev) => (mode === "more" ? [...prev, ...data.customers] : data.customers));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load customers.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [canUseAdmin, request, offset]
  );

  useEffect(() => {
    if (!authLoading) void load("initial", debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, debouncedSearch]);

  if (authLoading) {
    return <AdminLoadingState label="Loading…" testID="customers-auth-loading" />;
  }

  if (!canUseAdmin) {
    return (
      <AdminScreen testID="customers-forbidden">
        <Stack.Screen options={{ title: "Customers", headerShown: false }} />
        <AdminEmptyState
          icon="shield-outline"
          title="Admin access required"
          body="This list is only visible to authorized staff."
          testID="customers-forbidden-empty"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen scroll={false} testID="customers-list-screen">
      <Stack.Screen options={{ title: "Customers", headerShown: false }} />

      <AdminTopBar
        title="Customers"
        subtitle={loading ? "…" : `${total} total`}
        onBackPress={() => router.back()}
        testID="customers-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="New"
            icon="add"
            testID="customers-new"
            onPress={() => router.push("/admin/customers/new" as never)}
          />
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone, or email"
        searchTestID="customers-search-input"
        testID="customers-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debouncedSearch)}
          testID="customers-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debouncedSearch)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", debouncedSearch);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="people-outline"
              title="No customers"
              body={
                debouncedSearch
                  ? "Try a different search term."
                  : "Customers created from the web will appear here."
              }
              testID="customers-empty"
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
            testID={`customer-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            style={styles.row}
            onPress={() => router.push(`/admin/customers/${item.id}` as never)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.name ?? "?")
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.contact ?? "No phone"}
                {item.email ? ` · ${item.email}` : ""}
              </Text>
              {item.associatePartner ? (
                <Text style={styles.rowAssociate} numberOfLines={1}>
                  Associate: {item.associatePartner.name}
                </Text>
              ) : null}
            </View>
            {item.contact ? (
              <Pressable
                testID={`customer-call-${item.id}`}
                accessibilityLabel={`Call ${item.name}`}
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${item.contact}`)}
                hitSlop={8}
              >
                <Ionicons name="call" size={16} color={Colors.primary} />
              </Pressable>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  centeredInList: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
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
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: Colors.primary, fontWeight: "800", fontSize: FontSize.sm },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rowAssociate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
