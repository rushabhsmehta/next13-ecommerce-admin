import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

const PAGE_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 300;

interface Customer {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string | null;
  phoneNumber: string;
  email: string | null;
  tags: string[];
  notes: string | null;
  isOptedIn: boolean;
  importedFrom: string | null;
  lastContactedAt: string | null;
}

interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tags: { tag: string; count: number }[];
}

const OPT_FILTERS: { value: "all" | "in" | "out"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "Opted in" },
  { value: "out", label: "Opted out" },
];

export default function WhatsAppCustomersList() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [optFilter, setOptFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Customers",
      headerBackTitle: "Back",
    });
  }, [navigation]);

  // Debounce the search input.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchPage = useCallback(
    async (
      pageNum: number,
      opts: { silent?: boolean; append?: boolean } = {},
    ) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_LIMIT));
      if (debouncedSearch.length > 0) params.set("search", debouncedSearch);
      if (activeTag) params.set("tags", activeTag);
      if (optFilter === "in") params.set("optedIn", "true");
      if (optFilter === "out") params.set("optedIn", "false");

      try {
        const data = await api<CustomerListResponse>(
          `/api/mobile/whatsapp/customers?${params.toString()}`,
        );
        setItems((prev) => (opts.append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTags(data.tags ?? []);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not load customers.";
        if (!opts.silent) Alert.alert("WhatsApp", message);
      }
    },
    [api, activeTag, debouncedSearch, optFilter],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void fetchPage(1).finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchPage]),
  );

  // Re-fetch when filters/search change (after the initial mount).
  const filtersKey = `${debouncedSearch}|${activeTag ?? ""}|${optFilter}`;
  useEffect(() => {
    setLoading(true);
    void fetchPage(1).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchPage(page + 1, { append: true, silent: true });
    setLoadingMore(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchPage(1, { silent: true });
    setRefreshing(false);
  }

  const tagChips = useMemo(() => tags.slice(0, 12), [tags]);

  if (loading) {
    return (
      <View style={styles.center} testID="wa-customers-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone or email"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Search customers"
          testID="wa-customers-search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.optRow}>
        {OPT_FILTERS.map((f) => {
          const active = optFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setOptFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`wa-customers-opt-${f.value}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tagChips.length > 0 && (
        <FlatList
          data={["__all__", ...tagChips.map((t) => t.tag)]}
          keyExtractor={(t) => t}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
          renderItem={({ item }) => {
            if (item === "__all__") {
              const active = activeTag === null;
              return (
                <TouchableOpacity
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => setActiveTag(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    All tags
                  </Text>
                </TouchableOpacity>
              );
            }
            const active = activeTag === item;
            const count = tagChips.find((t) => t.tag === item)?.count ?? 0;
            return (
              <TouchableOpacity
                style={[styles.tag, active && styles.tagActive]}
                onPress={() => setActiveTag(active ? null : item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`wa-customers-tag-${item}`}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>
                  {item} · {count}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {total.toLocaleString()} {total === 1 ? "customer" : "customers"}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>No customers match these filters.</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color="#25D366" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const display =
            item.fullName ||
            [item.firstName, item.lastName].filter(Boolean).join(" ") ||
            item.phoneNumber;
          const initial = (display || "?").charAt(0).toUpperCase();
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                router.push(`/whatsapp/customers/${encodeURIComponent(item.id)}`)
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open ${display}`}
              testID={`wa-customer-${item.id}`}
            >
              <View style={[styles.avatar, !item.isOptedIn && styles.avatarOptOut]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {display}
                </Text>
                <Text style={styles.rowPhone} numberOfLines={1}>
                  {item.phoneNumber}
                </Text>
                {item.tags.length > 0 ? (
                  <Text style={styles.rowTags} numberOfLines={1}>
                    {item.tags.slice(0, 4).join(" · ")}
                  </Text>
                ) : null}
              </View>
              {!item.isOptedIn && (
                <View style={styles.optBadge}>
                  <Text style={styles.optBadgeText}>OPT-OUT</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textTertiary}
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.border,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  optRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  chipActive: { backgroundColor: "#25D366" },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  tagRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    marginRight: 6,
  },
  tagActive: { backgroundColor: "#075E54" },
  tagText: { fontSize: 12, color: "#075E54", fontWeight: "600" },
  tagTextActive: { color: "#fff" },
  metaRow: { paddingHorizontal: 16, paddingVertical: 4 },
  metaText: { fontSize: 12, color: Colors.textTertiary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOptOut: { backgroundColor: "#94a3b8" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  rowName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  rowPhone: { fontSize: 12, color: Colors.textTertiary },
  rowTags: { fontSize: 11, color: "#075E54" },
  optBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  optBadgeText: { fontSize: 9, fontWeight: "700", color: "#b91c1c" },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  footer: { paddingVertical: 16, alignItems: "center" },
});
