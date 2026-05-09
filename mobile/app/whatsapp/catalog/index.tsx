import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface ActiveCatalog {
  id: string;
  name: string;
  metaCatalogId: string | null;
  currency: string | null;
  isActive: boolean;
}

interface CatalogResponse {
  activeCatalog: ActiveCatalog | null;
  catalogs: { id: string; name: string; isActive: boolean }[];
  stats: {
    totalPackages: number;
    byStatus: Record<string, number>;
    bySyncStatus: Record<string, number>;
  };
}

interface Product {
  id: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  heroImageUrl: string | null;
  durationDays: number | null;
  durationNights: number | null;
  basePrice: string | null;
  currency: string;
  status: string;
  syncStatus: string;
  retailerId: string | null;
  catalogProductId: string | null;
  productSku: string | null;
  productName: string | null;
  updatedAt: string;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_FILTERS: { value: "all" | "active" | "draft" | "archived"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function syncIcon(status: string): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
} {
  switch (status) {
    case "synced":
      return { name: "checkmark-circle", color: "#16a34a", label: "Synced" };
    case "syncing":
      return { name: "sync", color: "#0ea5e9", label: "Syncing" };
    case "failed":
      return { name: "alert-circle", color: "#dc2626", label: "Failed" };
    default:
      return { name: "ellipse-outline", color: "#94a3b8", label: "Pending" };
  }
}

function formatPrice(p: Product): string | null {
  if (!p.basePrice) return null;
  const v = Number(p.basePrice);
  if (Number.isNaN(v)) return p.basePrice;
  return `${p.currency} ${v.toLocaleString()}`;
}

export default function WhatsAppCatalog() {
  const params = useLocalSearchParams<{ phone?: string; return?: string }>();
  const phone = params.phone ? decodeURIComponent(params.phone) : null;
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [activeCatalog, setActiveCatalog] = useState<ActiveCatalog | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("active");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Catalog",
      headerBackTitle: phone ? "Chat" : "Back",
    });
  }, [navigation, phone]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchHeader = useCallback(async () => {
    try {
      const data = await api<CatalogResponse>("/api/mobile/whatsapp/catalog");
      setActiveCatalog(data.activeCatalog);
    } catch {
      /* header is non-critical; product list continues to render */
    }
  }, [api]);

  const fetchProducts = useCallback(
    async (pageNum: number, opts: { append?: boolean; silent?: boolean } = {}) => {
      const q = new URLSearchParams();
      q.set("page", String(pageNum));
      q.set("limit", String(PAGE_LIMIT));
      if (statusFilter !== "all") q.set("status", statusFilter);
      if (debouncedSearch.length > 0) q.set("search", debouncedSearch);
      if (phone) q.set("sendable", "true");
      try {
        const data = await api<ProductsResponse>(
          `/api/mobile/whatsapp/catalog/products?${q.toString()}`,
        );
        setItems((prev) => (opts.append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not load products.";
        if (!opts.silent) Alert.alert("WhatsApp", message);
      }
    },
    [api, debouncedSearch, phone, statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void Promise.all([fetchHeader(), fetchProducts(1)]).finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchHeader, fetchProducts]),
  );

  useEffect(() => {
    setLoading(true);
    void fetchProducts(1).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchProducts(page + 1, { append: true, silent: true });
    setLoadingMore(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchHeader(), fetchProducts(1, { silent: true })]);
    setRefreshing(false);
  }

  function confirmSend(product: Product) {
    if (!phone) {
      Alert.alert(
        product.title,
        [
          product.subtitle,
          product.location ? `📍 ${product.location}` : null,
          formatPrice(product) ? `💰 ${formatPrice(product)}` : null,
        ]
          .filter(Boolean)
          .join("\n\n") || "No description available.",
      );
      return;
    }
    if (!product.retailerId || !activeCatalog?.metaCatalogId) {
      Alert.alert(
        "Cannot send",
        "This package isn't synced to Meta yet. Sync it from the web before sending.",
      );
      return;
    }
    Alert.alert(
      "Send this package?",
      `Send "${product.title}" to ${phone}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => sendProduct(product),
        },
      ],
    );
  }

  async function sendProduct(product: Product) {
    if (!phone || !activeCatalog?.metaCatalogId || !product.retailerId) return;
    setSending(true);
    try {
      await api("/api/mobile/whatsapp/send", {
        method: "POST",
        body: {
          type: "product",
          phone,
          catalogId: activeCatalog.metaCatalogId,
          productRetailerId: product.retailerId,
          productHeaderText: product.title,
          productBody: product.subtitle ?? "Have a look at this package",
        },
      });
      // Pop back to the chat thread.
      router.back();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not send product.";
      Alert.alert("Send failed", message);
    } finally {
      setSending(false);
    }
  }

  const filterRow = useMemo(() => STATUS_FILTERS, []);

  if (loading) {
    return (
      <View style={styles.center} testID="wa-catalog-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {phone ? (
        <View style={styles.contextBanner}>
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
          <Text style={styles.contextText} numberOfLines={1}>
            Sending to {phone}
          </Text>
        </View>
      ) : null}

      {activeCatalog ? (
        <View style={styles.catalogCard}>
          <Ionicons name="bag-handle-outline" size={18} color="#075E54" />
          <View style={{ flex: 1 }}>
            <Text style={styles.catalogName}>{activeCatalog.name}</Text>
            <Text style={styles.catalogMeta} numberOfLines={1}>
              Meta ID {activeCatalog.metaCatalogId ?? "—"} · {activeCatalog.currency ?? "INR"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.catalogCard, styles.catalogMissing]}>
          <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
          <Text style={styles.catalogMissingText}>
            No catalog linked. Connect a Meta catalog from the web before sending products.
          </Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, location or retailer ID"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Search catalog"
          testID="wa-catalog-search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipRow}>
        {filterRow.map((f) => {
          const active = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`wa-catalog-status-${f.value}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
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
            <Ionicons name="bag-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              {phone
                ? "No sendable packages match. Sync more from the web."
                : "No packages match these filters."}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color="#25D366" />
            </View>
          ) : null
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
        renderItem={({ item }) => {
          const sync = syncIcon(item.syncStatus);
          const price = formatPrice(item);
          const canSend = !!phone && !!item.retailerId && !!activeCatalog?.metaCatalogId;
          return (
            <TouchableOpacity
              style={[styles.card, sending && styles.cardDisabled]}
              onPress={() => confirmSend(item)}
              disabled={sending}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              testID={`wa-catalog-product-${item.id}`}
            >
              {item.heroImageUrl ? (
                <Image
                  source={{ uri: item.heroImageUrl }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={22} color="#94a3b8" />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  {item.location ? (
                    <Text style={styles.metaPiece}>📍 {item.location}</Text>
                  ) : null}
                  {item.durationDays ? (
                    <Text style={styles.metaPiece}>
                      🗓 {item.durationDays}D
                      {item.durationNights ? `/${item.durationNights}N` : ""}
                    </Text>
                  ) : null}
                  {price ? <Text style={styles.metaPiece}>{price}</Text> : null}
                </View>
                <View style={styles.footRow}>
                  <View style={styles.syncPill}>
                    <Ionicons name={sync.name} size={10} color={sync.color} />
                    <Text style={[styles.syncText, { color: sync.color }]}>
                      {sync.label}
                    </Text>
                  </View>
                  {phone && canSend ? (
                    <Text style={styles.sendHint}>Tap to send →</Text>
                  ) : phone && !canSend ? (
                    <Text style={styles.sendDisabled}>Not synced</Text>
                  ) : null}
                </View>
              </View>
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
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#E0F7E9",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#A7E5BC",
  },
  contextText: { fontSize: 13, color: "#075E54", fontWeight: "600" },
  catalogCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
  },
  catalogName: { fontSize: 14, fontWeight: "700", color: "#0c4a6e" },
  catalogMeta: { fontSize: 11, color: "#0c4a6e" },
  catalogMissing: { backgroundColor: "#fee2e2" },
  catalogMissingText: { fontSize: 12, color: "#b91c1c", flex: 1 },
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
  chipRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  chipActive: { backgroundColor: "#25D366" },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardDisabled: { opacity: 0.5 },
  thumb: { width: 90, height: 90, borderRadius: 8, backgroundColor: "#E5E7EB" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textTertiary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPiece: { fontSize: 11, color: Colors.text },
  footRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  syncPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  syncText: { fontSize: 10, fontWeight: "700" },
  sendHint: { fontSize: 11, color: "#25D366", fontWeight: "700" },
  sendDisabled: { fontSize: 11, color: Colors.textTertiary, fontStyle: "italic" },
  empty: { alignItems: "center", padding: 40, gap: 12, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  footer: { paddingVertical: 16, alignItems: "center" },
});
