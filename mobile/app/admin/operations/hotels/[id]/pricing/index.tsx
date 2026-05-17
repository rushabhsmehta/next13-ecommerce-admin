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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  createOperationsClient,
  type HotelPricingListResponse,
  type HotelPricingRow,
} from "@/lib/operations";

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

function rowSubtitle(row: HotelPricingRow): string {
  const parts = [
    row.roomTypeName,
    row.occupancyTypeName,
    row.mealPlanName ?? row.mealPlanCode,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export default function HotelPricingListScreen() {
  return (
    <PermissionGate permission="operations.read">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: hotelId } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [data, setData] = useState<HotelPricingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!hotelId) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.listHotelPricing(hotelId));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load hotel pricing."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hotelId, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const title = data?.hotel.name ?? "Hotel pricing";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSub}>Seasonal pricing</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.errText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="hotel-pricing-list"
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
            flexGrow: (data?.items.length ?? 0) === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.summary}>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryText}>
                    {data?.total ?? 0} active pricing row(s)
                  </Text>
                  <Text style={styles.summaryHint}>
                    Overlaps are split automatically when a new range is saved.
                  </Text>
                </View>
                <Pressable
                  testID="hotel-pricing-add"
                  accessibilityRole="button"
                  accessibilityLabel="Add hotel pricing"
                  style={styles.addButton}
                  onPress={() =>
                    router.push(
                      `/admin/operations/hotels/${hotelId}/pricing/new` as never
                    )
                  }
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No pricing rows</Text>
              <Text style={styles.emptySub}>
                Add the first seasonal rate for this hotel.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`hotel-pricing-row-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Pricing ${fmtDate(item.startDate)} to ${fmtDate(item.endDate)}, ${inr(item.price)}`}
              style={styles.card}
              onPress={() =>
                router.push(
                  `/admin/operations/hotels/${hotelId}/pricing/${item.id}` as never
                )
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardDates}>
                  {fmtDate(item.startDate)} – {fmtDate(item.endDate)}
                </Text>
                <Text style={styles.cardPrice}>{inr(item.price)}</Text>
              </View>
              <Text style={styles.cardSub} numberOfLines={2}>
                {rowSubtitle(item)}
              </Text>
              {!item.isActive ? (
                <Text style={styles.inactiveBadge}>Inactive</Text>
              ) : null}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textTertiary}
                style={styles.chevron}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  headerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errText: { marginTop: Spacing.md, color: Colors.error, textAlign: "center" },
  retry: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  summary: { marginBottom: Spacing.md },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  summaryText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  summaryHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  addButtonText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  cardDates: { flex: 1, fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  cardPrice: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  inactiveBadge: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: "600",
  },
  chevron: { position: "absolute", right: Spacing.md, top: "50%" },
});
