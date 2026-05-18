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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
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
import { createOperationsClient, type TransportPricing } from "@/lib/operations";

const PAGE_SIZE = 30;

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function TransportPricingListScreen() {
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

  const [items, setItems] = useState<TransportPricing[]>([]);
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
        const res = await client.listTransportPricing({
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
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load transport pricing."
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
    <AdminScreen scroll={false} testID="transport-pricing-screen">
      <Stack.Screen options={{ title: "Transport pricing", headerShown: false }} />

      <AdminTopBar
        title="Transport pricing"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="transport-pricing-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="transport-pricing-new"
              onPress={() =>
                router.push("/admin/operations/transport-pricing/new" as never)
              }
            />
          ) : null
        }
      />

      <Pressable
        testID="transport-pricing-manage-vehicles"
        accessibilityRole="button"
        accessibilityLabel="Manage vehicle types"
        style={styles.manageBanner}
        onPress={() => router.push("/admin/operations/vehicle-types" as never)}
      >
        <Ionicons name="car-outline" size={16} color={Colors.primary} />
        <Text style={styles.manageText}>Manage vehicle types</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </Pressable>

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search location, vehicle, or type"
        searchTestID="transport-pricing-search"
        testID="transport-pricing-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="transport-pricing-error"
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
              icon="car-outline"
              title="No transport pricing"
              body={debounced ? "Try a different search." : "Tap + to add one."}
              testID="transport-pricing-empty"
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
            testID={`transport-pricing-row-${item.id}`}
            icon="car"
            title={item.locationLabel}
            subtitle={`${item.vehicleTypeName ?? "No vehicle"} · ${
              item.transportType === "PerDay" ? "Per day" : "Per trip"
            }`}
            meta={`${inr(item.price)} · ${fmtDate(item.startDate)} – ${fmtDate(
              item.endDate
            )}`}
            trailing={
              !item.isActive ? (
                <AdminStatusPill label="Inactive" variant="muted" compact />
              ) : undefined
            }
            onPress={() =>
              router.push(`/admin/operations/transport-pricing/${item.id}` as never)
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
  manageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  manageText: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.lg },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
