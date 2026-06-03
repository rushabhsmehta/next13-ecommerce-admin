import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
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
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        const res = await client.listLocations({
          search: term || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load locations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset]
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
          <Pressable
            testID={`location-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.label}`}
            style={styles.row}
            onPress={() => router.push(`/admin/operations/locations/${item.id}` as never)}
          >
            {item.imageUrl.trim() ? (
              <Image source={{ uri: item.imageUrl.trim() }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="map" size={18} color={Colors.textTertiary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.destinationCount ?? 0} destinations · {item.hotelCount ?? 0} hotels
              </Text>
              {item.slug ? (
                <Text style={styles.rowSlug} numberOfLines={1}>
                  /{item.slug}
                </Text>
              ) : null}
            </View>
            {!item.isActive ? (
              <Text style={styles.inactiveBadge}>Inactive</Text>
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
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 0 },
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
  thumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowSlug: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  inactiveBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.error,
    textTransform: "uppercase",
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
