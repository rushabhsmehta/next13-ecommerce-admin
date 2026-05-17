import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { createFlightTicketsClient, type FlightTicket } from "@/lib/flight-tickets";

const PAGE_SIZE = 30;

function fmtDate(value?: string | null): string {
  if (!value) return "Date TBD";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Date TBD";
  }
}

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Fare TBD";
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function statusTone(status: string): "ok" | "warn" | "bad" {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "bad";
  if (s.includes("pending") || s.includes("hold")) return "warn";
  return "ok";
}

function statusStyle(tone: "ok" | "warn" | "bad") {
  if (tone === "bad") return styles.status_bad;
  if (tone === "warn") return styles.status_warn;
  return styles.status_ok;
}

export default function FlightTicketsScreen() {
  return (
    <PermissionGate permission="flightTickets.read">
      <FlightTicketsInner />
    </PermissionGate>
  );
}

function FlightTicketsInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("flightTickets.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFlightTicketsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [items, setItems] = useState<FlightTicket[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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
        const res = await client.listTickets({
          search: term || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setItems((prev) => (mode === "more" ? [...prev, ...res.items] : res.items));
        setOffset(res.nextOffset);
        setTotal(res.total);
        setHasMore(res.hasMore);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load flight tickets.");
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

  const subtitle = loading ? "Loading..." : `${total} ticket${total === 1 ? "" : "s"}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Flight Tickets", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Flight Tickets</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        {canWrite ? (
          <Pressable
            testID="flight-tickets-new"
            accessibilityRole="button"
            accessibilityLabel="Create flight ticket"
            style={styles.newBtn}
            onPress={() => router.push("/admin/flight-tickets/new" as never)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          testID="flight-tickets-search"
          accessibilityRole="search"
          accessibilityLabel="Search flight tickets"
          style={styles.searchInput}
          placeholder="PNR, passenger, route, customer"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="characters"
        />
        {search.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setSearch("")}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh", debounced)}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) void load("more", debounced);
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons name="airplane-outline" size={38} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No tickets</Text>
              <Text style={styles.emptyText}>
                {debounced ? "Try another PNR or customer name." : "Tap + to create a ticket."}
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
        renderItem={({ item }) => {
          const tone = statusTone(item.status);
          const firstPassenger = item.passengers[0]?.name ?? "No passenger";
          return (
            <Pressable
              testID={`flight-ticket-row-${item.pnr}`}
              accessibilityRole="button"
              accessibilityLabel={`Open flight ticket ${item.pnr}`}
              style={styles.row}
              onPress={() =>
                router.push(`/admin/flight-tickets/${encodeURIComponent(item.pnr)}` as never)
              }
            >
              <View style={styles.rowIcon}>
                <Ionicons name="airplane" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.pnr}
                  </Text>
                  <View style={[styles.statusPill, statusStyle(tone)]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.airline} {item.flightNumber} - {item.departureAirport} to {item.arrivalAirport}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {firstPassenger}
                  {item.passengers.length > 1 ? ` +${item.passengers.length - 1}` : ""}
                  {item.customerName ? ` - ${item.customerName}` : ""}
                </Text>
                <View style={styles.metrics}>
                  <Text style={styles.metric}>{fmtDate(item.departureTime)}</Text>
                  <Text style={styles.metric}>{money(item.totalAmount)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    width: 38,
    height: 38,
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
  centered: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowTitle: { flex: 1, fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  rowSub: { fontSize: FontSize.xs, color: Colors.textTertiary },
  metrics: { flexDirection: "row", gap: Spacing.xs, flexWrap: "wrap" },
  metric: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "800",
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  status_ok: { backgroundColor: "#dcfce7" },
  status_warn: { backgroundColor: "#fef3c7" },
  status_bad: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 10, fontWeight: "900", color: Colors.text },
  footerLoader: { paddingVertical: Spacing.lg, alignItems: "center" },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
