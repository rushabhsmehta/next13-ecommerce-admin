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
import { useAuth } from "@clerk/clerk-expo";
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
import {
  createAssociatePartnersClient,
  type AssociatePartnerOption,
} from "@/lib/associate-partners";

const PAGE_SIZE = 50;

export default function AssociatePartnersListScreen() {
  return (
    <PermissionGate permission="crm.read">
      <AssociatePartnersListScreenInner />
    </PermissionGate>
  );
}

function AssociatePartnersListScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(
    () => createAssociatePartnersClient(authRequest),
    [authRequest]
  );

  const [items, setItems] = useState<AssociatePartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
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
      if (mode === "more") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const nextOffset = mode === "more" ? offset : 0;
        const res = await client.list({
          search: searchTerm || undefined,
          activeOnly,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setHasMore(res.hasMore);
        setOffset(res.nextOffset);
        setTotal(res.total);
        setItems((prev) => (mode === "more" ? [...prev, ...res.partners] : res.partners));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not load partners.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [client, offset, activeOnly]
  );

  useEffect(() => {
    void load("initial", debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeOnly]);

  return (
    <AdminScreen scroll={false} testID="associate-partners-screen">
      <Stack.Screen options={{ title: "Associate Partners", headerShown: false }} />

      <AdminTopBar
        title="Associate Partners"
        subtitle={loading ? "…" : `${total} total`}
        onBackPress={() => router.back()}
        testID="partners-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="New"
            icon="add"
            testID="partners-new"
            onPress={() => router.push("/admin/crm/associate-partners/new" as never)}
          />
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email"
        searchTestID="partners-search-input"
        testID="partners-command-bar"
        trailing={
          <Pressable
            testID="partners-filter-active"
            onPress={() => setActiveOnly((v) => !v)}
            style={[styles.filterChip, activeOnly ? styles.filterChipActive : null]}
            accessibilityRole="button"
            accessibilityLabel="Active only"
            accessibilityState={{ selected: activeOnly }}
          >
            <Text style={[styles.filterChipText, activeOnly ? styles.filterChipTextActive : null]}>
              Active only
            </Text>
          </Pressable>
        }
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debouncedSearch)}
          testID="partners-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
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
            <ActivityIndicator
              style={styles.listLoader}
              size="large"
              color={Colors.primary}
            />
          ) : (
            <AdminEmptyState
              icon="briefcase-outline"
              title="No partners"
              body={
                debouncedSearch
                  ? "Try a different search term."
                  : "Tap + to add an associate partner."
              }
              testID="partners-empty"
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
            testID={`partner-row-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            style={styles.row}
            onPress={() =>
              router.push(`/admin/crm/associate-partners/${item.id}` as never)
            }
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
              <View style={styles.rowTopRow}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                {!item.isActive ? (
                  <View style={styles.inactivePill}>
                    <Text style={styles.inactivePillText}>Inactive</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.mobileNumber}
                {item.email ? ` · ${item.email}` : ""}
              </Text>
              {item.gmail ? (
                <Text style={styles.rowGmail} numberOfLines={1}>
                  Login: {item.gmail}
                </Text>
              ) : null}
            </View>
            {item.mobileNumber ? (
              <Pressable
                testID={`partner-call-${item.id}`}
                accessibilityLabel={`Call ${item.name}`}
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${item.mobileNumber}`)}
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
  listContent: { paddingHorizontal: Spacing.lg },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
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
  rowTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowName: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text, flex: 1 },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rowGmail: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  inactivePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  inactivePillText: { fontSize: 10, fontWeight: "800", color: Colors.textTertiary },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
});
