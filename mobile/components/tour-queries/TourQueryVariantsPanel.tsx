import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import { API_BASE_URL } from "@/constants/api";
import { absoluteAdminUrl, tourQueryHotelUpdatePath } from "@/lib/tour-queries-web-urls";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  createTourQueryPricingClient,
  type VariantBuildDraft,
  type VariantComparisonItem,
  type VariantComparisonResponse,
} from "@/lib/tour-query-pricing";
import { VariantBuildPanel } from "./VariantBuildPanel";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "Rs. 0";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function methodLabel(method: string | null | undefined): string {
  if (method === "manual") return "Manual";
  if (method === "autoHotelTransport") return "Hotel + transport";
  if (method === "autoTourPackage" || method === "useTourPackagePricing") {
    return "Package pricing";
  }
  return "Pricing";
}

export function TourQueryVariantsPanel({
  queryId,
  embedded = false,
}: {
  queryId: string;
  embedded?: boolean;
}) {
  return (
    <PermissionGate permission="salesTrips.read">
      <TourQueryVariantsPanelInner queryId={queryId} embedded={embedded} />
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

function TourQueryVariantsPanelInner({
  queryId,
  embedded,
}: {
  queryId: string;
  embedded: boolean;
}) {
  const router = useRouter();
  const id = queryId;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const { permissions } = useCurrentUser();
  const canWriteSales = permissions.includes("salesTrips.write");
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
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [buildSavingVariantId, setBuildSavingVariantId] = useState<string | null>(null);
  const [activeBuildDirty, setActiveBuildDirty] = useState(false);

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

  useEffect(() => {
    const variants = data?.variants ?? [];
    if (variants.length === 0) {
      if (activeVariantId) setActiveVariantId(null);
      return;
    }
    if (!activeVariantId || !variants.some((variant) => variant.id === activeVariantId)) {
      setActiveVariantId(variants[0].id);
    }
  }, [activeVariantId, data?.variants]);

  const saveVariantBuild = useCallback(
    async (
      variant: VariantComparisonItem,
      draft: VariantBuildDraft
    ) => {
      if (!id || buildSavingVariantId) return;
      setBuildSavingVariantId(variant.id);
      try {
        const res = await client.updateVariantBuild(id, variant.id, draft);
        setData((prev) =>
          prev?.build
            ? {
                ...prev,
                build: {
                  ...prev.build,
                  variantRoomAllocations: res.build.variantRoomAllocations,
                  variantTransportDetails: res.build.variantTransportDetails,
                },
              }
            : prev
        );
        await load("refresh");
        setActiveBuildDirty(false);
        Alert.alert(
          "Saved",
          `Room allocations and transport saved for "${variant.name}".`
        );
      } catch (err) {
        Alert.alert(
          "Save failed",
          err instanceof ApiError
            ? err.message
            : "Could not save room allocations and transport."
        );
      } finally {
        setBuildSavingVariantId(null);
      }
    },
    [buildSavingVariantId, client, id, load]
  );

  const onVariantPress = async (v: VariantComparisonItem) => {
    if (!id || updating) return;

    if (v.isConfirmed) {
      Alert.alert(
        "Clear confirmation?",
        `Do you want to clear the confirmation for "${v.name}" and return this query to draft status?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: async () => {
              setUpdating(v.id);
              try {
                await client.confirmVariant(id, null);
                const fresh = await client.compare(id);
                setData(fresh);
                Alert.alert("Success", "Confirmation cleared successfully.");
              } catch (err) {
                Alert.alert(
                  "Error",
                  err instanceof ApiError ? err.message : "Could not clear confirmation."
                );
              } finally {
                setUpdating(null);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Confirm this variant?",
        `Do you want to confirm "${v.name}" as the chosen variant for this query? This will mark the query as confirmed.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              setUpdating(v.id);
              try {
                await client.confirmVariant(id, v.sourceVariantId || v.id);
                const fresh = await client.compare(id);
                setData(fresh);
                Alert.alert("Success", `Variant "${v.name}" confirmed successfully.`);
              } catch (err) {
                Alert.alert(
                  "Error",
                  err instanceof ApiError ? err.message : "Could not confirm variant."
                );
              } finally {
                setUpdating(null);
              }
            },
          },
        ]
      );
    }
  };

  const cheapest = useMemo(
    () =>
      data?.variants?.reduce<VariantComparisonItem | null>((best, v) => {
        if (!v.pricing) return best;
        if (!best?.pricing || v.pricing.totalCost < best.pricing!.totalCost) return v;
        return best;
      }, null) ?? null,
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
        subtitle: "Add variant pricing here or calculate from saved rooms and transport.",
        tone: "low" as const,
      };
    return { title: "Compare options", subtitle: "Review totals before confirming.", tone: "medium" as const };
  }, [data, cheapest]);

  const [compareA, compareB] =
    data && data.variants.length
      ? pickComparePair(data.variants, cheapest ?? null)
      : [null, null];

  const activeVariant = useMemo(() => {
    const variants = data?.variants ?? [];
    return (
      variants.find((variant) => variant.id === activeVariantId) ??
      variants[0] ??
      null
    );
  }, [activeVariantId, data?.variants]);

  const changeActiveVariant = useCallback(
    (nextVariantId: string) => {
      if (nextVariantId === activeVariantId) return;
      if (!activeBuildDirty) {
        setActiveVariantId(nextVariantId);
        return;
      }
      Alert.alert(
        "Discard unsaved variant edits?",
        "Room allocation or transport changes have not been saved.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setActiveBuildDirty(false);
              setActiveVariantId(nextVariantId);
            },
          },
        ]
      );
    },
    [activeBuildDirty, activeVariantId]
  );

  const openHotelsWeb = () => {
    if (!hotelEditUrl) return;
    Linking.openURL(hotelEditUrl).catch(() => {
      Alert.alert("Could not open page", "Open the hotel editor from a signed-in browser.");
    });
  };

  if (loading) {
    return <AdminLoadingState label="Loading variants…" testID="trip-variants-loading" />;
  }
  if (error || !data) {
    return (
      <AdminScreen testID="trip-variants-error">
        <Stack.Screen options={{ title: "Variants", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Variants not found"}
          onRetry={() => void load()}
          testID="trip-variants-error-state"
        />
      </AdminScreen>
    );
  }

  const body = (
    <>
      {!embedded ? (
        <>
          <Stack.Screen options={{ title: "Variants", headerShown: false }} />
          <AdminTopBar
            title="Variants"
            subtitle={`${data.variants.length} options${data.hasPricing ? "" : " · pricing not computed"}`}
            onBackPress={() => router.back()}
            testID="trip-variants-header"
          />
        </>
      ) : null}
        <View style={styles.decisionCard} testID="trip-variant-decision-summary">
          <View style={[styles.dot, decision.tone === "high" ? styles.dotGreen : decision.tone === "medium" ? styles.dotWarn : styles.dotMuted]} accessibilityElementsHidden />
          <Text style={styles.decisionTitle}>{decision.title}</Text>
          <Text style={styles.decisionSub}>{decision.subtitle}</Text>
        </View>

        {!data.hasPricing ? (
          <View style={styles.emptyPricingBanner}>
            <Text style={styles.emptyPricingTitle}>Variant pricing has not been computed yet.</Text>
            {canWriteSales && data.variants[0] ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add pricing for first variant"
                  accessibilityHint="Opens the native variant pricing editor."
                  style={styles.emptyPricingBtn}
                  onPress={() =>
                    router.push(
                      `/admin/tour-queries/${id}/variants/${data.variants[0].id}/pricing` as never
                    )
                  }
                >
                  <Text style={styles.emptyPricingBtnText}>Add variant pricing</Text>
                  <Ionicons name="calculator-outline" size={16} color="#fff" />
                </Pressable>
              ) : hotelEditUrl ?
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
          <>
            <View style={styles.variantTabsCard} testID="trip-variant-tabs">
              <Text style={styles.variantTabsLabel}>Variant options</Text>
              <AdminSegmentedControl
                options={data.variants.map((variant) => ({
                  id: variant.id,
                  label: variant.name || "Unnamed",
                }))}
                value={activeVariantId ?? data.variants[0].id}
                onChange={changeActiveVariant}
                testIDPrefix="trip-variant-tab"
                scrollable
              />
            </View>
            {activeVariant ? (
            <Pressable
              key={activeVariant.id}
              testID={`variant-card-${activeVariant.id}`}
              style={({ pressed }) => [
                styles.card,
                activeVariant.isConfirmed ? styles.cardConfirmed : null,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={undefined}
              disabled={updating !== null}
              accessibilityLabel={`Variant ${activeVariant.name}, cost ${activeVariant.pricing ? formatINR(activeVariant.pricing.totalCost) : "pending"}`}
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {activeVariant.name || "Unnamed"}
                </Text>
                <View style={styles.badges}>
                  {updating === activeVariant.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />
                  ) : null}
                  {activeVariant.isConfirmed ? (
                    <View style={[styles.badge, styles.badgeConfirmed]}>
                      <Text style={styles.badgeConfirmedText}>Confirmed</Text>
                    </View>
                  ) : null}
                  {!activeVariant.isConfirmed && cheapest && cheapest.id === activeVariant.id && activeVariant.pricing ? (
                    <View style={[styles.badge, styles.badgeCheap]}>
                      <Text style={styles.badgeCheapText}>Lowest</Text>
                    </View>
                  ) : null}
                  {!activeVariant.pricing ?
                    (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={styles.badgeWarnText}>No price</Text>
                      </View>
                    )
                    : null}
                </View>
              </View>
              {activeVariant.pricing ?
                (
                  <>
                    <Text style={styles.total}>{formatINR(activeVariant.pricing.totalCost)}</Text>
                    <Text style={styles.marginHint}>
                      {methodLabel(activeVariant.pricing.calculationMethod)} - Markup{" "}
                      {formatINR(activeVariant.pricing.markupAmount)} ({activeVariant.pricing.markupPercentage}%)
                    </Text>
                    <View style={styles.split}>
                      <View style={styles.splitCol}>
                        <Text style={styles.splitLabel}>Accommodation</Text>
                        <Text style={styles.splitVal}>{formatINR(activeVariant.pricing.accommodation)}</Text>
                      </View>
                      <View style={styles.splitCol}>
                        <Text style={styles.splitLabel}>Transport</Text>
                        <Text style={styles.splitVal}>{formatINR(activeVariant.pricing.transport)}</Text>
                      </View>
                    </View>
                    {activeVariant.pricing.components.length ? (
                      <View style={styles.componentPreview}>
                        {activeVariant.pricing.components.slice(0, 4).map((component, idx) => (
                          <View key={`${activeVariant.id}-component-${idx}`} style={styles.componentRow}>
                            <View style={styles.componentText}>
                              <Text style={styles.componentName} numberOfLines={1}>
                                {component.name || "Pricing item"}
                              </Text>
                              {component.description ? (
                                <Text style={styles.componentDescription} numberOfLines={2}>
                                  {component.description}
                                </Text>
                              ) : null}
                            </View>
                            <Text style={styles.componentPrice}>
                              {formatINR(Number.parseFloat(component.price || "0"))}
                            </Text>
                          </View>
                        ))}
                        {activeVariant.pricing.components.length > 4 ? (
                          <Text style={styles.moreComponents}>
                            +{activeVariant.pricing.components.length - 4} more pricing items
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {activeVariant.pricing.remarks ? (
                      <Text style={styles.remarks} numberOfLines={3}>
                        {activeVariant.pricing.remarks}
                      </Text>
                    ) : null}
                  </>
                )
                : (
                  <Text style={styles.shortNoPricing}>
                    Pricing pending. Refresh after editing on web.
                  </Text>
                )}
              {data.build ? (
                <VariantBuildPanel
                  key={activeVariant.id}
                  queryId={id}
                  variant={activeVariant}
                  variants={data.variants}
                  build={data.build}
                  canWriteSales={canWriteSales}
                  onSaveBuild={canWriteSales ? saveVariantBuild : undefined}
                  onDirtyChange={setActiveBuildDirty}
                  savingBuild={buildSavingVariantId === activeVariant.id}
                />
              ) : null}
              {canWriteSales ? (
                <View style={styles.cardActions}>
                  <Pressable
                    testID={`variant-pricing-edit-${activeVariant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${activeVariant.pricing ? "Edit" : "Add"} pricing for ${activeVariant.name}`}
                    style={styles.actionButton}
                    onPress={() =>
                      router.push(
                        `/admin/tour-queries/${id}/variants/${activeVariant.id}/pricing` as never
                      )
                    }
                  >
                    <Ionicons name="calculator-outline" size={15} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>
                      {activeVariant.pricing ? "Edit pricing" : "Add pricing"}
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`variant-confirm-${activeVariant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={activeVariant.isConfirmed ? `Clear ${activeVariant.name}` : `Confirm ${activeVariant.name}`}
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => void onVariantPress(activeVariant)}
                    disabled={updating !== null}
                  >
                    <Ionicons
                      name={activeVariant.isConfirmed ? "close-circle-outline" : "checkmark-circle-outline"}
                      size={15}
                      color={Colors.textInverse}
                    />
                    <Text style={styles.actionButtonPrimaryText}>
                      {activeVariant.isConfirmed ? "Clear" : "Confirm"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
            ) : null}
          </>
        )}
    </>
  );

  if (embedded) {
    return (
      <View testID="tq-variants-embedded" style={{ gap: Spacing.md }}>
        {body}
      </View>
    );
  }

  return (
    <AdminScreen
      testID="trip-variants-screen"
      contentContainerStyle={{
        paddingHorizontal: Spacing.lg,
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
      {body}
    </AdminScreen>
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
  variantTabsCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingTop: Spacing.sm,
    overflow: "hidden",
  },
  variantTabsLabel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
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
  componentPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  componentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  componentText: { flex: 1, minWidth: 0 },
  componentName: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.text },
  componentDescription: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textTertiary,
    lineHeight: 14,
  },
  componentPrice: {
    flexShrink: 0,
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
  },
  moreComponents: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textTertiary,
  },
  remarks: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
  },
  actionButtonPrimaryText: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textInverse,
  },
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
