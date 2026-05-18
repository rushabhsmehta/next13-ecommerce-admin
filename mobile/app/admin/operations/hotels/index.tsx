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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminEntityRow,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createOperationsClient, type OpsHotel } from "@/lib/operations";

const PAGE_SIZE = 30;

export default function HotelsListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locationId: filterLocationId } = useLocalSearchParams<{
    locationId?: string;
  }>();
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

  const [items, setItems] = useState<OpsHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const locationFilter =
    typeof filterLocationId === "string" ? filterLocationId : undefined;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", term: string) => {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.listHotels({
          search: term || undefined,
          locationId: locationFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load hotels.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset, locationFilter]
  );

  useEffect(() => {
    void load("initial", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, locationFilter]);

  return (
    <AdminScreen scroll={false} testID="hotels-list-screen">
      <Stack.Screen options={{ title: "Hotels", headerShown: false }} />
      <AdminTopBar
        title="Hotels"
        subtitle={loading ? "…" : `${total} total`}
        onBackPress={() => router.back()}
        testID="hotels-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="hotels-new"
              onPress={() =>
                router.push(
                  locationFilter
                    ? (`/admin/operations/hotels/new?locationId=${locationFilter}` as never)
                    : ("/admin/operations/hotels/new" as never)
                )
              }
            />
          ) : null
        }
      />

      {locationFilter ? (
        <Pressable
          testID="hotels-clear-location-filter"
          accessibilityRole="button"
          accessibilityLabel="Clear location filter"
          style={styles.filterChip}
          onPress={() => router.replace("/admin/operations/hotels" as never)}
        >
          <Text style={styles.filterChipText}>Filtered by location · Clear</Text>
          <Ionicons name="close" size={14} color={Colors.primary} />
        </Pressable>
      ) : null}

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or location"
        searchTestID="hotels-search"
        testID="hotels-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="hotels-error"
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
              icon="bed-outline"
              title="No hotels"
              body={debounced ? "Try a different search." : "Add a hotel to start building pricing."}
              actionLabel={canWrite && !debounced ? "New hotel" : undefined}
              onActionPress={
                canWrite && !debounced
                  ? () =>
                      router.push(
                        locationFilter
                          ? (`/admin/operations/hotels/new?locationId=${locationFilter}` as never)
                          : ("/admin/operations/hotels/new" as never)
                      )
                  : undefined
              }
              testID="hotels-empty"
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
            testID={`hotel-row-${item.id}`}
            icon="bed"
            title={item.name}
            subtitle={
              item.destinationName
                ? `${item.locationLabel} · ${item.destinationName}`
                : item.locationLabel
            }
            meta={
              (item.pricingCount ?? 0) > 0
                ? `${item.pricingCount} pricing row(s)`
                : undefined
            }
            onPress={() => router.push(`/admin/operations/hotels/${item.id}` as never)}
          />
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.lg },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
