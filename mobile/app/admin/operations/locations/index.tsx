import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { Colors, Spacing } from "@/constants/theme";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminEntityRow,
  AdminErrorState,
  AdminScreen,
  AdminStatusPill,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type OpsLocation } from "@/lib/operations";

const PAGE_SIZE = 30;

export default function LocationsListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
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

  const [items, setItems] = useState<OpsLocation[]>([]);
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
        const res = await client.listLocations({
          search: term || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        if (requestIdRef.current !== reqId) return;
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
      } catch (err) {
        if (requestIdRef.current !== reqId) return;
        setError(err instanceof ApiError ? err.message : "Could not load locations.");
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
    <AdminScreen scroll={false} testID="locations-screen">
      <Stack.Screen options={{ title: "Locations", headerShown: false }} />

      <AdminTopBar
        title="Locations"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="locations-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="locations-new"
              onPress={() => router.push("/admin/operations/locations/new" as never)}
            />
          ) : null
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by label or slug"
        searchTestID="locations-search"
        testID="locations-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="locations-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(r) => r.id}
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
              icon="earth-outline"
              title="No locations"
              body={debounced ? "Try a different search." : "Tap + to add one."}
              testID="locations-empty"
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
          <AdminEntityRow
            testID={`location-row-${item.id}`}
            title={item.label}
            subtitle={`${item.destinationCount ?? 0} destinations · ${item.hotelCount ?? 0} hotels`}
            meta={item.slug ? `/${item.slug}` : undefined}
            icon="map-outline"
            onPress={() => router.push(`/admin/operations/locations/${item.id}` as never)}
            trailing={
              !item.isActive ? (
                <AdminStatusPill label="Inactive" variant="muted" compact />
              ) : undefined
            }
          />
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
