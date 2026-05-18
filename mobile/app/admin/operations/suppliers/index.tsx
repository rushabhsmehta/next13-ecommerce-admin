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
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminEntityRow,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type Supplier } from "@/lib/operations";

const PAGE_SIZE = 30;

export default function SuppliersListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <SuppliersListScreenInner />
    </PermissionGate>
  );
}

function SuppliersListScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("operations.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  const requestIdRef = useRef(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", term: string) => {
      const reqId = ++requestIdRef.current;
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offsetRef.current : 0;
        const res = await client.listSuppliers({
          search: term || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if (requestIdRef.current !== reqId) return;
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) =>
          mode === "more" ? [...prev, ...res.suppliers] : res.suppliers
        );
      } catch (err) {
        if (requestIdRef.current !== reqId) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load suppliers."
        );
      } finally {
        if (requestIdRef.current === reqId) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [client]
  );

  useEffect(() => {
    void load("initial", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const subtitle = loading ? "Loading..." : `${total} total`;

  return (
    <AdminScreen scroll={false} testID="suppliers-screen">
      <Stack.Screen options={{ title: "Suppliers", headerShown: false }} />

      <AdminTopBar
        title="Suppliers"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="suppliers-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="suppliers-new"
              onPress={() => router.push("/admin/operations/suppliers/new" as never)}
            />
          ) : null
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone, or email"
        searchTestID="suppliers-search"
        testID="suppliers-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="suppliers-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debounced)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", debounced);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="business-outline"
              title="No suppliers"
              body={debounced ? "Try a different search." : "Tap + to add one."}
              testID="suppliers-empty"
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
              testID={`supplier-row-${item.id}`}
              icon="business"
              title={item.name}
              subtitle={`${item.contact ?? "No phone"}${
                item.email ? ` · ${item.email}` : ""
              }`}
              meta={item.gstNumber ? `GST: ${item.gstNumber}` : undefined}
              onPress={() =>
                router.push(`/admin/operations/suppliers/${item.id}` as never)
              }
              trailing={
                hasPhone ? (
                  <View style={styles.actions}>
                    <Pressable
                      testID={`supplier-call-${item.id}`}
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
                      testID={`supplier-menu-${item.id}`}
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
