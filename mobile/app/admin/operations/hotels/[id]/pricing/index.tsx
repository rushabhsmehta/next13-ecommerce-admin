import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
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
import { PricingSeasonGroup } from "@/components/operations/PricingSeasonGroup";
import {
  createOperationsClient,
  type HotelSpecialDatePricingListResponse,
  type HotelSpecialDatePricingRow,
  type HotelPricingListResponse,
  type HotelPricingRow,
  type HotelPricingLookups,
} from "@/lib/operations";
import { fmtPricingDateRange, groupPricingBySeason } from "@/lib/pricing-season-groups";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function rowSubtitle(row: HotelPricingRow): string {
  const parts = [
    row.roomTypeName,
    row.occupancyTypeName,
    row.mealPlanName ?? row.mealPlanCode,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function specialSubtitle(row: HotelSpecialDatePricingRow): string {
  const parts = [
    row.roomTypeName,
    row.occupancyTypeName,
    row.mealPlanName ?? row.mealPlanCode,
  ].filter(Boolean);
  return parts.length ? parts.join(" Â· ") : "â€”";
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
  const [specialData, setSpecialData] =
    useState<HotelSpecialDatePricingListResponse | null>(null);
  const [lookups, setLookups] = useState<HotelPricingLookups | null>(null);
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
        const [pricing, specialPricing] = await Promise.all([
          client.listHotelPricing(hotelId),
          client.listHotelSpecialDatePricing(hotelId),
        ]);
        setData(pricing);
        setSpecialData(specialPricing);
        const periodLookups = await client.getHotelPricingLookups(
          pricing.hotel.locationId
        );
        setLookups(periodLookups);
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

  const groups = useMemo(
    () =>
      groupPricingBySeason(data?.items ?? [], lookups?.seasonalPeriods ?? []),
    [data?.items, lookups?.seasonalPeriods]
  );

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
      <ScrollView
        testID="hotel-pricing-list"
        style={styles.list}
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
      >
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {data?.total ?? 0} active pricing row(s)
          </Text>
          <Text style={styles.summaryHint}>
            Use broad base periods here; event and holiday overrides live under Special Date Pricing.
          </Text>
          <Pressable
            testID="hotel-special-date-pricing-add"
            accessibilityRole="button"
            accessibilityLabel="Add special date pricing"
            style={styles.specialAdd}
            onPress={() =>
              router.push(
                `/admin/operations/hotels/${hotelId}/special-date-pricing/new` as never
              )
            }
          >
            <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
            <Text style={styles.specialAddText}>Add Special Date Pricing</Text>
          </Pressable>
        </View>
        {(specialData?.items.length ?? 0) > 0 ? (
          <View style={styles.specialSection}>
            <Text style={styles.sectionTitle}>Special Date Pricing</Text>
            {specialData?.items.map((item) => (
              <Pressable
                key={item.id}
                testID={`hotel-special-date-pricing-row-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${specialSubtitle(item)}, ${inr(item.price)}`}
                style={[styles.card, styles.specialCard]}
                onPress={() =>
                  router.push(
                    `/admin/operations/hotels/${hotelId}/special-date-pricing/${item.id}` as never
                  )
                }
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {specialSubtitle(item)}
                    </Text>
                  </View>
                  <Text style={styles.cardPrice}>{inr(item.price)}</Text>
                </View>
                <Text style={styles.specialDates}>
                  {fmtPricingDateRange(item.startDate, item.endDate)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.textTertiary}
                  style={styles.chevron}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No pricing rows</Text>
            <Text style={styles.emptySub}>
              Add the first seasonal rate for this hotel.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <PricingSeasonGroup
              key={group.key}
              group={group}
              testID={`pricing-season-group-${group.key}`}
              renderItem={(item) => (
                <Pressable
                  key={item.id}
                  testID={`hotel-pricing-row-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${rowSubtitle(item)}, ${inr(item.price)}`}
                  style={styles.card}
                  onPress={() =>
                    router.push(
                      `/admin/operations/hotels/${hotelId}/pricing/${item.id}` as never
                    )
                  }
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {rowSubtitle(item)}
                    </Text>
                    <Text style={styles.cardPrice}>{inr(item.price)}</Text>
                  </View>
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
          ))
        )}
      </ScrollView>
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
  specialAdd: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  specialAddText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  specialSection: { gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
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
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  specialCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  cardText: { flex: 1, gap: Spacing.xs },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  cardPrice: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  cardSub: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  specialDates: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  inactiveBadge: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: "600",
  },
  chevron: { position: "absolute", right: Spacing.md, top: "50%" },
});
