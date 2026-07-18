import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createTourPackagesClient,
  type TourPackageListItem,
} from "@/lib/tour-packages";
import { AI_DRAFT_KEYS, acknowledgeAiDraft } from "@/lib/ai-wizard-drafts";

const PAGE_SIZE = 30;

export default function TourPackagesListScreen() {
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
  const canAiGenerate = permissions.includes("aiWizards.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<TourPackageListItem[]>([]);
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
        const res = await client.list({
          search: term || undefined,
          locationId: locationFilter,
          includeArchived: true,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.packages] : res.packages));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load packages.");
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

  const openManualCreate = useCallback(() => {
    // Clear any leftover AI handoff so a blank manual create stays blank.
    acknowledgeAiDraft(AI_DRAFT_KEYS.packageCreate);
    router.push(
      locationFilter
        ? (`/admin/operations/tour-packages/new?locationId=${locationFilter}` as never)
        : ("/admin/operations/tour-packages/new" as never)
    );
  }, [locationFilter, router]);

  const openAiGenerate = useCallback(() => {
    router.push("/admin/ai-wizards?target=tourPackage" as never);
  }, [router]);

  const openCreateMenu = useCallback(() => {
    if (!canWrite) return;
    if (!canAiGenerate) {
      openManualCreate();
      return;
    }
    Alert.alert("Create tour package", "Choose how to start.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Manual",
        onPress: openManualCreate,
      },
      {
        text: "AI Generate",
        onPress: openAiGenerate,
      },
    ]);
  }, [canAiGenerate, canWrite, openAiGenerate, openManualCreate]);

  return (
    <AdminScreen scroll={false} testID="tour-packages-list-screen">
      <Stack.Screen options={{ title: "Tour packages", headerShown: false }} />
      <AdminTopBar
        title="Tour packages"
        subtitle={loading ? "…" : `${total} total`}
        onBackPress={() => router.back()}
        testID="tour-packages-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="tour-packages-new"
              accessibilityHint={
                canAiGenerate
                  ? "Opens manual or AI tour package creation."
                  : "Opens the manual tour package form."
              }
              onPress={openCreateMenu}
            />
          ) : null
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or destination"
        searchTestID="tour-packages-search"
        testID="tour-packages-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="tour-packages-error"
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
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="map-outline"
              title="No tour packages"
              body={
                canWrite
                  ? "Create a standard itinerary template for sales trips and the website."
                  : "No packages match your search."
              }
              testID="tour-packages-empty"
            />
          )
        }
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            void load("more", debounced);
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Pressable
            testID={`tour-package-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open package ${item.tourPackageName ?? "Untitled"}`}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: "/admin/operations/tour-packages/[id]",
                params: { id: item.id },
              } as never)
            }
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.tourPackageName || "Untitled package"}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {item.location?.label ?? "—"}
                {item.numDaysNight ? ` · ${item.numDaysNight}` : ""}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {[item.tourPackageType, item.tourCategory].filter(Boolean).join(" · ") ||
                  "Standard"}
                {item.itineraryCount > 0 ? ` · ${item.itineraryCount} days` : ""}
              </Text>
            </View>
            <View style={styles.rowRight}>
              {item.isArchived ? (
                <View style={styles.archivedPill}>
                  <Text style={styles.archivedText}>Archived</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={Colors.primary} />
          ) : null
        }
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  loader: { marginTop: Spacing.xl },
  footerLoader: { marginVertical: Spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  rowSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  archivedPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  archivedText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
  },
});
