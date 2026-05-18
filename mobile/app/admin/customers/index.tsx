import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminEntityRow,
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
        renderItem={({ item }) => {
          const hasPhone = !!item.contact;
          const openMenu = () => {
            const options: {
              text: string;
              style?: "cancel" | "destructive";
              onPress?: () => void;
            }[] = [];
            if (hasPhone) {
              options.push({
                text: "Call",
                onPress: () => Linking.openURL(`tel:${item.contact}`),
              });
            }
            options.push({ text: "Cancel", style: "cancel" });
            Alert.alert(item.name, undefined, options);
          };
          return (
            <AdminEntityRow
              testID={`customer-row-${item.id}`}
              icon="person"
              title={item.name}
              subtitle={`${item.contact ?? "No phone"}${
                item.email ? ` · ${item.email}` : ""
              }`}
              meta={
                item.associatePartner
                  ? `Associate: ${item.associatePartner.name}`
                  : undefined
              }
              onPress={() => router.push(`/admin/customers/${item.id}` as never)}
              trailing={
                hasPhone ? (
                  <View style={styles.actions}>
                    <Pressable
                      testID={`customer-call-${item.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${item.name}`}
                      style={styles.iconBtn}
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${item.contact}`);
                      }}
                    >
                      <Ionicons name="call" size={18} color={Colors.primary} />
                    </Pressable>
                    <Pressable
                      testID={`customer-menu-${item.id}`}
                      accessibilityRole="button"
                      accessibilityLabel="More actions"
                      style={styles.iconBtn}
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        openMenu();
                      }}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={18}
                        color={Colors.textTertiary}
                      />
                    </Pressable>
                  </View>
                ) : undefined
              }
            />
          );
        }}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
