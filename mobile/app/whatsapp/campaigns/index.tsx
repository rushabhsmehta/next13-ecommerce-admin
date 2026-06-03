import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

const PAGE_LIMIT = 20;

interface CampaignCounters {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  responded: number;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  templateName: string;
  templateLanguage: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rateLimit: number;
  counters: CampaignCounters;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_FILTERS: {
  value: "all" | "draft" | "scheduled" | "sending" | "completed" | "failed";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sending", label: "Sending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#16a34a";
    case "sending":
      return "#0ea5e9";
    case "scheduled":
      return "#a855f7";
    case "failed":
      return "#dc2626";
    case "paused":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

export default function WhatsAppCampaignsList() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [items, setItems] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Campaigns",
      headerBackTitle: "Back",
    });
  }, [navigation]);

  const fetchPage = useCallback(
    async (pageNum: number, opts: { silent?: boolean; append?: boolean } = {}) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_LIMIT));
      if (statusFilter !== "all") params.set("status", statusFilter);
      try {
        const data = await api<ListResponse>(
          `/api/mobile/whatsapp/campaigns?${params.toString()}`,
        );
        setItems((prev) => (opts.append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Could not load campaigns.";
        if (!opts.silent) Alert.alert("WhatsApp", message);
      }
    },
    [api, statusFilter],
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

  useEffect(() => {
    setLoading(true);
    void fetchPage(1).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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

  if (loading) {
    return (
      <View style={styles.center} testID="wa-campaigns-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={STATUS_FILTERS}
        keyExtractor={(s) => s.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusRow}
        renderItem={({ item }) => {
          const active = statusFilter === item.value;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(item.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`wa-campaigns-status-${item.value}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

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
            <Ionicons name="megaphone-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              No campaigns match this filter.{"\n"}Create one on the web to launch from here.
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
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push(`/whatsapp/campaigns/${encodeURIComponent(item.id)}`)
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Open campaign ${item.name}`}
            testID={`wa-campaign-${item.id}`}
          >
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.templateName} · {item.templateLanguage}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor(item.status) + "22" },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]}
                />
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.counterRow}>
              <Counter label="Total" value={item.counters.total} />
              <Counter label="Sent" value={item.counters.sent} tint="#0ea5e9" />
              <Counter label="Read" value={item.counters.read} tint="#16a34a" />
              <Counter label="Failed" value={item.counters.failed} tint="#dc2626" />
            </View>

            {item.scheduledFor && item.status === "scheduled" ? (
              <Text style={styles.cardMeta}>
                <Ionicons name="time-outline" size={12} /> Runs at{" "}
                {new Date(item.scheduledFor).toLocaleString("en-IN")}
              </Text>
            ) : item.startedAt ? (
              <Text style={styles.cardMeta}>
                <Ionicons name="play-outline" size={12} /> Started{" "}
                {new Date(item.startedAt).toLocaleString("en-IN")}
              </Text>
            ) : (
              <Text style={styles.cardMeta}>
                Created {new Date(item.createdAt).toLocaleString("en-IN")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Counter({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint?: string;
}) {
  return (
    <View style={styles.counter}>
      <Text style={[styles.counterValue, tint ? { color: tint } : null]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#25D366" },
  chipText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  counter: { alignItems: "center", flex: 1 },
  counterValue: { fontSize: 16, fontWeight: "700", color: Colors.text },
  counterLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  cardMeta: { fontSize: 11, color: Colors.textTertiary },
  empty: { alignItems: "center", padding: 40, gap: 12, flex: 1, justifyContent: "center" },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  footer: { paddingVertical: 16, alignItems: "center" },
});
