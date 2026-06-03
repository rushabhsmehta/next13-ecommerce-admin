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
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminCommandBar,
  AdminEmptyState,
  AdminErrorState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
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
    <AdminScreen scroll={false} testID="flight-tickets-screen">
      <Stack.Screen options={{ title: "Flight Tickets", headerShown: false }} />

      <AdminTopBar
        title="Flight Tickets"
        subtitle={subtitle}
        onBackPress={() => router.back()}
        testID="flight-tickets-header"
        rightSlot={
          canWrite ? (
            <AdminTopBarPrimaryButton
              label="New"
              icon="add"
              testID="flight-tickets-new"
              onPress={() => router.push("/admin/flight-tickets/new" as never)}
            />
          ) : null
        }
      />

      <AdminCommandBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="PNR, passenger, route, customer"
        searchTestID="flight-tickets-search"
        testID="flight-tickets-command-bar"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load("refresh", debounced)}
          testID="flight-tickets-error"
        />
      ) : null}

      <FlatList
        style={styles.list}
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
            <ActivityIndicator style={styles.listLoader} size="large" color={Colors.primary} />
          ) : (
            <AdminEmptyState
              icon="airplane-outline"
              title="No tickets"
              body={
                debounced
                  ? "Try another PNR or customer name."
                  : canWrite
                    ? "Create a ticket to track bookings and passengers."
                    : "No flight tickets match your search."
              }
              actionLabel={canWrite && !debounced ? "Create ticket" : undefined}
              onActionPress={
                canWrite && !debounced
                  ? () => router.push("/admin/flight-tickets/new" as never)
                  : undefined
              }
              testID="flight-tickets-empty"
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
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listLoader: { marginTop: Spacing.xl },
  listContent: { paddingHorizontal: Spacing.lg },
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
});
