import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Associate Partners", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Associate Partners</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "…" : `${total} total`}
          </Text>
        </View>
        <Pressable
          testID="partners-new"
          accessibilityRole="button"
          accessibilityLabel="New partner"
          onPress={() => router.push("/admin/crm/associate-partners/new" as never)}
          style={styles.newBtn}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="partners-search-input"
          accessibilityLabel="Search partners"
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length ? (
          <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <Pressable
          testID="partners-filter-active"
          onPress={() => setActiveOnly((v) => !v)}
          style={[styles.filterChip, activeOnly ? styles.filterChipActive : null]}
        >
          <Text style={[styles.filterChipText, activeOnly ? styles.filterChipTextActive : null]}>
            Active only
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
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
            <View style={styles.centeredInList}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centeredInList}>
              <Ionicons name="briefcase-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No partners</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch
                  ? "Try a different search term."
                  : "Tap + to add an associate partner."}
              </Text>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  filterChipText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
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
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
