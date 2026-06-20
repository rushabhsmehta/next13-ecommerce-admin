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
import { createOperationsClient, type Supplier } from "@/lib/operations";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

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
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const [items, setItems] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<InquiryLookupOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
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

  useEffect(() => {
    void request<{ items: { id: string; name: string }[] }>(
      "/api/mobile/operations/list?type=locations&limit=100",
      LOOKUP_CACHE
    )
      .then((data) => {
        setLocations(data.items.map((l) => ({ id: l.id, label: l.name })));
      })
      .catch(() => {
        /* location picker falls back to empty list */
      });
  }, [request]);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more", term: string, locId: string) => {
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.listSuppliers({
          search: term || undefined,
          locationId: locId || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) =>
          mode === "more" ? [...prev, ...res.suppliers] : res.suppliers
        );
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load suppliers."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset]
  );

  useEffect(() => {
    void load("initial", debounced, locationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, locationId]);

  const hasFilters = Boolean(debounced || locationId);

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

      {locationId ? (
        <Pressable
          testID="suppliers-clear-location-filter"
          accessibilityRole="button"
          accessibilityLabel="Clear location filter"
          style={styles.filterChip}
          onPress={() => {
            setLocationId("");
            setLocationLabel("");
          }}
        >
          <Text style={styles.filterChipText} numberOfLines={1}>
            {locationLabel || "Location"} · Clear
          </Text>
          <Ionicons name="close" size={14} color={Colors.primary} />
        </Pressable>
      ) : null}

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone, email, or location"
        searchTestID="suppliers-search"
        testID="suppliers-command-bar"
        onFilterPress={() => setLocationPickerOpen(true)}
        filterActive={Boolean(locationId)}
        filterAccessibilityLabel="Filter by location"
      />

      <LookupPickerModal
        visible={locationPickerOpen}
        title="Location"
        options={locations}
        testID="suppliers-location-picker"
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(id) => {
          const opt = locations.find((o) => o.id === id);
          setLocationId(id);
          setLocationLabel(opt?.label ?? "");
          setLocationPickerOpen(false);
        }}
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced, locationId)}
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
            onRefresh={() => void load("refresh", debounced, locationId)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) {
            void load("more", debounced, locationId);
          }
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="business-outline"
              title="No suppliers"
              body={hasFilters ? "Try a different search or filter." : "Tap + to add one."}
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
          const locationText =
            item.locations?.map((l) => l.label).join(" · ") || null;
          return (
          <Pressable
            testID={`supplier-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            style={styles.row}
            onPress={() =>
              router.push(`/admin/operations/suppliers/${item.id}` as never)
            }
          >
            <View style={styles.avatar}>
              <Ionicons name="business" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              {locationText ? (
                <Text style={styles.rowLocations} numberOfLines={1}>
                  {locationText}
                </Text>
              ) : null}
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.contact ?? "No phone"}
                {item.email ? ` · ${item.email}` : ""}
              </Text>
              {item.gstNumber ? (
                <Text style={styles.rowGst} numberOfLines={1}>
                  GST: {item.gstNumber}
                </Text>
              ) : null}
            </View>
            {item.contact ? (
              <Pressable
                testID={`supplier-call-${item.id}`}
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
          );
        }}
      />
    </AdminScreen>
  );
}

const LOOKUP_CACHE = { cacheTtlSeconds: 300, dedupe: true, staleOnError: true } as const;

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
    maxWidth: "90%",
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowLocations: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2, fontWeight: "600" },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowGst: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
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
  },
});
