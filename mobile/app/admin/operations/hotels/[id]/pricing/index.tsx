import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
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

  if (loading) {
    return (
      <AdminLoadingState label="Loading hotel pricing…" testID="hotel-pricing-list-loading" />
    );
  }

  if (error) {
    return (
      <AdminScreen testID="hotel-pricing-list-error">
        <Stack.Screen options={{ title, headerShown: false }} />
        <AdminErrorState
          message={error}
          onRetry={() => void load()}
          testID="hotel-pricing-list-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen scroll={false} testID="hotel-pricing-list-screen">
      <Stack.Screen options={{ title, headerShown: false }} />
      <AdminTopBar
        title={title}
        subtitle="Seasonal pricing"
        onBackPress={() => router.back()}
        testID="hotel-pricing-list-header"
        rightSlot={
          <AdminTopBarPrimaryButton
            label="Add"
            icon="add"
            testID="hotel-pricing-add"
            onPress={() =>
              router.push(
                `/admin/operations/hotels/${hotelId}/pricing/new` as never
              )
            }
          />
        }
      />
      <FlatList
        testID="hotel-pricing-list"
        style={styles.list}
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {data?.total ?? 0} active pricing row(s)
            </Text>
            <Text style={styles.summaryHint}>
              Overlaps are split automatically when a new range is saved.
            </Text>
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
              <View style={styles.cardTopLeft}>
                {item.seasonalPeriodName ? (
                  <Text style={styles.seasonBadge} numberOfLines={1}>
                    {item.seasonalPeriodName}
                  </Text>
                ) : null}
                <Text style={styles.cardDates}>
                  {fmtDate(item.startDate)} – {fmtDate(item.endDate)}
                </Text>
              </View>
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
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  summary: { marginBottom: Spacing.md, paddingTop: Spacing.sm },
  summaryText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  summaryHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
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
  cardTopLeft: { flex: 1, gap: Spacing.xs },
  seasonBadge: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "capitalize",
  },
  cardDates: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
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
