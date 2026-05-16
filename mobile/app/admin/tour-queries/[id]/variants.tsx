import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { AdminHeader } from "@/components/admin/AdminHeader";
import { API_BASE_URL } from "@/constants/api";
import { absoluteAdminUrl, tourQueryHotelUpdatePath } from "@/lib/tour-queries-web-urls";
import {
  createTourQueryPricingClient,
  type VariantComparisonItem,
  type VariantComparisonResponse,
} from "@/lib/tour-query-pricing";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "Rs. 0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function TourQueryVariantsScreen() {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourQueryVariantsScreenInner />
    </PermissionGate>
  );
}

function pickComparePair(
  list: VariantComparisonItem[],
  cheapest: VariantComparisonItem | null
): [VariantComparisonItem | null, VariantComparisonItem | null] {
  const confirmed = list.find((v) => v.isConfirmed) ?? null;
  const priced = [...list].filter((v) => v.pricing);
  const byCost = [...priced].sort(
    (a, b) =>
      (a.pricing!.totalCost - b.pricing!.totalCost) ||
      ((a.sortOrder ?? 999) - (b.sortOrder ?? 999))
  );
  const cheapestPriced = cheapest ?? byCost[0] ?? null;
  let a = confirmed ?? cheapestPriced ?? list[0] ?? null;
  let b =
    cheapestPriced && cheapestPriced.id !== a?.id
      ? cheapestPriced
      : byCost.find((v) => v.id !== a?.id) ?? list.find((v) => v.id !== a?.id) ?? null;
  return [a, b];
}

function TourQueryVariantsScreenInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const client = useMemo(
    () => createTourQueryPricingClient(authRequest),
    [authRequest]
  );

  const hotelEditUrl = useMemo(() => {
    if (!id) return "";
    const base = API_BASE_URL.replace(/\/$/, "");
    return absoluteAdminUrl(base, tourQueryHotelUpdatePath(id));
  }, [id]);

  const [data, setData] = useState<VariantComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.compare(id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load variants.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const cheapest = useMemo(
    () =>
      data?.variants.reduce<VariantComparisonItem | null>((best, v) => {
        if (!v.pricing) return best;
        if (!best?.pricing || v.pricing.totalCost < best.pricing!.totalCost) return v;
        return best;
      }, null),
    [data]
  );

  const decision = useMemo(() => {
    if (!data?.variants?.length) {
      return { title: "No variants", subtitle: "This trip has no options yet.", tone: "low" as const };
    }
    const confirmed = data.variants.find((v) => v.isConfirmed);
    if (confirmed && confirmed.pricing)
      return { title: "Confirmed variant selected", subtitle: `${confirmed.name}.`, tone: "high" as const };
    if (confirmed)
      return { title: "Confirmed variant selected", subtitle: `${confirmed.name} · pricing pending.`, tone: "medium" as const };
    const ch = cheapest;
    if (ch?.pricing && ch.name)
      return { title: "Lowest cost", subtitle: `${ch.name}`, tone: "high" as const };
    if (!data.hasPricing)
      return {
        title: "Pricing not computed yet",
        subtitle: "Build hotel and pricing on web, then pull to refresh.",
        tone: "low" as const,
      };
    return { title: "Compare options", subtitle: "Review totals before confirming.", tone: "medium" as const };
  }, [data, cheapest]);

  const [compareA, compareB] =
    data && data.variants.length ? pickComparePair(data.variants, cheapest) : [null, null];

  const openHotelsWeb = () => {
    if (!hotelEditUrl) return;
    Linking.openURL(hotelEditUrl).catch(() => {
      Alert.alert("Could not open page", "Open the hotel editor from a signed-in browser.");
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errText}>{error ?? "Variants not found"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen options={{ title: "Variants", headerShown: false }} />
      <AdminHeader title="Variants" subtitle={`${data.variants.length} options${data.hasPricing ? "" : " · pricing not computed"}`} onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 24,
          gap: Spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.decisionCard} testID="trip-variant-decision-summary">
          <View style={[styles.dot, decision.tone === "high" ? styles.dotGreen : decision.tone === "medium" ? styles.dotWarn : styles.dotMuted]} accessibilityElementsHidden />
          <Text style={styles.decisionTitle}>{decision.title}</Text>
          <Text style={styles.decisionSub}>{decision.subtitle}</Text>
        </View>

        {!data.hasPricing ? (
          <View style={styles.emptyPricingBanner}>
            <Text style={styles.emptyPricingTitle}>Pricing has not been computed on web yet.</Text>
            {hotelEditUrl ?
              (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open hotel and pricing editor on web"
                  accessibilityHint="Opens the admin website in your browser."
                  style={styles.emptyPricingBtn}
                  onPress={openHotelsWeb}
                >
                  <Text style={styles.emptyPricingBtnText}>Open hotel and pricing editor</Text>
                  <Ionicons name="open-outline" size={16} color="#fff" />
                </Pressable>
              )
              : (
                <Text style={styles.emptyPricingMuted}>Hotel editor URL unavailable offline.</Text>
              )}
          </View>
        ) : null}

        {compareA?.pricing || compareB?.pricing ?
          (
            <View style={styles.compareCard}>
              <Text style={styles.compareHeading}>Quick compare</Text>
              <View style={styles.compareGrid}>
                <Text style={[styles.cell, styles.cellHead]} accessibilityRole="header"> </Text>
                <Text style={[styles.cell, styles.cellHead]} numberOfLines={2}>
                  {compareA?.name ?? "Variant A"}
                </Text>
                <Text style={[styles.cell, styles.cellHead]} numberOfLines={2}>
                  {compareB?.name ?? "Variant B"}
                </Text>
                {(["totalCost", "basePrice", "markupAmount", "accommodation", "transport"] as const).map(
                  (metric) => {
                    const rows: Record<typeof metric, string> = {
                      totalCost: "Total",
                      basePrice: "Base",
                      markupAmount: "Markup",
                      accommodation: "Stay",
                      transport: "Transport",
                    };
                    const v1 =
                      metric === "markupAmount" && compareA?.pricing ?
                        `${formatINR(compareA.pricing.markupAmount)} (${compareA.pricing.markupPercentage}%)`
                      : compareA?.pricing ?
                        formatINR(compareA.pricing[metric])
                      : "—";
                    const v2 =
                      metric === "markupAmount" && compareB?.pricing ?
                        `${formatINR(compareB.pricing.markupAmount)} (${compareB.pricing.markupPercentage}%)`
                      : compareB?.pricing ?
                        formatINR(compareB.pricing[metric])
                      : "—";
                    const lowA =
                      cheapest &&
                      compareA?.id === cheapest.id &&
                      cheapest.pricing &&
                      metric === "totalCost";
                    const lowB =
                      cheapest &&
                      compareB?.id === cheapest.id &&
                      cheapest.pricing &&
                      metric === "totalCost";
                    const hlA = compareA?.isConfirmed || lowA;
                    const hlB = compareB?.isConfirmed || lowB;
                    return (
                      <React.Fragment key={metric}>
                        <Text style={[styles.cell, styles.metricLabel]}>{rows[metric]}</Text>
                        <Text style={[styles.cell, hlA ? styles.cellHighlight : null]}>{v1}</Text>
                        <Text style={[styles.cell, hlB ? styles.cellHighlight : null]}>{v2}</Text>
                      </React.Fragment>
                    );
                  }
                )}
              </View>
            </View>
          )
          : null}

        {data.variants.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: Spacing.lg }}>
            <Ionicons name="layers-outline" size={36} color={Colors.textTertiary} />
            <Text style={styles.errText}>This trip has no variants.</Text>
          </View>
        ) : (
          data.variants.map((v) => (
            <View
              key={v.id}
              testID={`variant-card-${v.id}`}
              style={[styles.card, v.isConfirmed ? styles.cardConfirmed : null]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {v.name || "Unnamed"}
                </Text>
                <View style={styles.badges}>
                  {v.isConfirmed ? (
                    <View style={[styles.badge, styles.badgeConfirmed]}>
                      <Text style={styles.badgeConfirmedText}>Confirmed</Text>
                    </View>
                  ) : null}
                  {!v.isConfirmed && cheapest && cheapest.id === v.id && v.pricing ? (
                    <View style={[styles.badge, styles.badgeCheap]}>
                      <Text style={styles.badgeCheapText}>Lowest</Text>
                    </View>
                  ) : null}
                  {!v.pricing ?
                    (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={styles.badgeWarnText}>No price</Text>
                      </View>
                    )
                    : null}
                </View>
              </View>
              {v.pricing ?
                (
                  <>
                    <Text style={styles.total}>{formatINR(v.pricing.totalCost)}</Text>
                    <Text style={styles.marginHint}>
                      Markup{" "}
                      {formatINR(v.pricing.markupAmount)} ({v.pricing.markupPercentage}%)
                    </Text>
                    <View style={styles.split}>
                      <View style={styles.splitCol}>
                        <Text style={styles.splitLabel}>Accommodation</Text>
                        <Text style={styles.splitVal}>{formatINR(v.pricing.accommodation)}</Text>
                      </View>
                      <View style={styles.splitCol}>
                        <Text style={styles.splitLabel}>Transport</Text>
                        <Text style={styles.splitVal}>{formatINR(v.pricing.transport)}</Text>
                      </View>
                    </View>
                  </>
                )
                : (
                  <Text style={styles.shortNoPricing}>
                    Pricing pending. Refresh after editing on web.
                  </Text>
                )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  errText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  retry: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  decisionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  dotGreen: { backgroundColor: Colors.success ?? "#16a34a" },
  dotWarn: { backgroundColor: Colors.warning ?? "#ca8a04" },
  dotMuted: { backgroundColor: Colors.textTertiary },
  decisionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  decisionSub: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  compareCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  compareHeading: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  compareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "33.33%",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: "700",
  },
  cellHead: {
    fontWeight: "900",
    backgroundColor: Colors.surfaceAlt,
  },
  metricLabel: {
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  cellHighlight: {
    backgroundColor: Colors.primaryBg,
    color: Colors.primaryDark,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardConfirmed: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  cardName: { flex: 1, fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
  badges: { flexDirection: "row", gap: 6, flexShrink: 0 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeConfirmed: { backgroundColor: Colors.primary },
  badgeConfirmedText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  badgeCheap: { backgroundColor: "#dcfce7" },
  badgeCheapText: { color: "#16a34a", fontSize: 10, fontWeight: "800" },
  badgeWarn: { backgroundColor: "#fff7ed" },
  badgeWarnText: { color: "#ea580c", fontSize: 10, fontWeight: "800" },
  total: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  marginHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  split: { flexDirection: "row", gap: Spacing.md },
  splitCol: { flex: 1 },
  splitLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: "700" },
  splitVal: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text, marginTop: 4 },
  shortNoPricing: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emptyPricingBanner: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyPricingTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text, lineHeight: 20 },
  emptyPricingBtn: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  emptyPricingBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.sm },
  emptyPricingMuted: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "600" },
});
