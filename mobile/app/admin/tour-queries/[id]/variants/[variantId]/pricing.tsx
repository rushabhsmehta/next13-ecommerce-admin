import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { Colors, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminBottomActionBar,
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import {
  createTourQueryPricingClient,
  type AppliedVariantDiscountPayload,
  type VariantCalculationMethod,
  type VariantPackageComponentsResponse,
  type VariantPricingCalculationResponse,
  type VariantPricingDetailResponse,
} from "@/lib/tour-query-pricing";
import { cloneDefaultPricingSection } from "@/lib/variant-pricing-defaults";
import {
  applyPercentDiscountToPricingComponents,
  clonePricingComponents,
  computeVariantDiscount,
  type VariantDiscountType,
} from "@/lib/variant-pricing-discount";
import { parseMoney, pricingRowsTotal } from "@/lib/variant-pricing-utils";
import {
  VariantAutoCalculateSection,
  VariantDiscountSection,
  VariantPackagePricingSection,
  VariantPricingBreakdown,
  VariantPricingMethodPicker,
  VariantPricingTotalSection,
  makePricingRow,
  methodLabel,
  normalizeCalculationMethod,
  type LocalPricingRow,
} from "@/components/tour-queries/variant-pricing";

function rowsFromDetail(data: VariantPricingDetailResponse): LocalPricingRow[] {
  const saved = data.pricing?.components ?? [];
  if (saved.length) return saved.map((item, index) => makePricingRow(item, index));
  return cloneDefaultPricingSection().map((item, index) => makePricingRow(item, index));
}

export default function VariantPricingScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <VariantPricingScreenInner />
    </PermissionGate>
  );
}

function VariantPricingScreenInner() {
  const router = useRouter();
  const { id, variantId } = useLocalSearchParams<{ id: string; variantId: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const client = useMemo(() => createTourQueryPricingClient(authRequest), [authRequest]);

  const [data, setData] = useState<VariantPricingDetailResponse | null>(null);
  const [rows, setRows] = useState<LocalPricingRow[]>([makePricingRow()]);
  const [totalCost, setTotalCost] = useState("");
  const [subtotalBeforeDiscount, setSubtotalBeforeDiscount] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [markup, setMarkup] = useState("0");
  const [calculationMethod, setCalculationMethod] =
    useState<VariantCalculationMethod>("manual");
  const [calculation, setCalculation] =
    useState<VariantPricingCalculationResponse | null>(null);
  const [appliedDiscount, setAppliedDiscount] =
    useState<AppliedVariantDiscountPayload | null>(null);
  const [componentsBeforeDiscount, setComponentsBeforeDiscount] = useState<
    LocalPricingRow[] | null
  >(null);
  const [discountType, setDiscountType] = useState<VariantDiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [mealPlanId, setMealPlanId] = useState("");
  const [roomCount, setRoomCount] = useState(1);
  const [fetchingComponents, setFetchingComponents] = useState(false);
  const [fetchResult, setFetchResult] = useState<VariantPackageComponentsResponse | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [componentQuantities, setComponentQuantities] = useState<Record<string, number>>({});
  const [mealPlans, setMealPlans] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatingFromRooms, setCalculatingFromRooms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = useCallback(async () => {
    try {
      const res = await authRequest<{ mealPlans: Array<{ id: string; name: string }> }>(
        "/api/mobile/operations/pricing-lookups"
      );
      setMealPlans(res.mealPlans ?? []);
    } catch {
      setMealPlans([]);
    }
  }, [authRequest]);

  const hydrateFromDetail = useCallback((res: VariantPricingDetailResponse) => {
    setData(res);
    setRows(rowsFromDetail(res));
    setTotalCost(res.pricing?.totalCost ? String(Math.round(res.pricing.totalCost)) : "");
    setSubtotalBeforeDiscount(
      res.pricing?.subtotalBeforeDiscount != null
        ? Number(res.pricing.subtotalBeforeDiscount)
        : null
    );
    setRemarks(res.pricing?.remarks ?? "");
    setCalculationMethod(normalizeCalculationMethod(res.pricing?.calculationMethod));
    setAppliedDiscount(res.pricing?.appliedDiscount ?? null);
    if (res.pricing?.appliedDiscount) {
      setDiscountType(res.pricing.appliedDiscount.type);
      setDiscountValue(String(res.pricing.appliedDiscount.inputValue ?? ""));
      setDiscountReason(res.pricing.appliedDiscount.reason ?? "");
    }
    if (res.pricing?.componentsBeforeDiscount?.length) {
      setComponentsBeforeDiscount(
        res.pricing.componentsBeforeDiscount.map((item, index) => makePricingRow(item, index))
      );
    } else {
      setComponentsBeforeDiscount(null);
    }
    setCalculation(null);
    setFetchResult(null);
    setSelectedComponentIds([]);
    setComponentQuantities({});
  }, []);

  const load = useCallback(async () => {
    if (!id || !variantId) return;
    setLoading(true);
    setError(null);
    try {
      const [res] = await Promise.all([client.getVariantPricing(id, variantId), loadLookups()]);
      hydrateFromDetail(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load variant pricing.");
    } finally {
      setLoading(false);
    }
  }, [client, hydrateFromDetail, id, loadLookups, variantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemTotal = useMemo(() => pricingRowsTotal(rows), [rows]);

  const currentSubtotal = useMemo(() => {
    if (subtotalBeforeDiscount != null && subtotalBeforeDiscount > 0) {
      return subtotalBeforeDiscount;
    }
    const explicit = parseMoney(totalCost);
    if (explicit > 0) return explicit;
    return itemTotal > 0 ? Math.round(itemTotal) : 0;
  }, [itemTotal, subtotalBeforeDiscount, totalCost]);

  const updateRows = useCallback((next: LocalPricingRow[]) => {
    setRows(next);
    setComponentsBeforeDiscount(null);
    setAppliedDiscount(null);
    setSubtotalBeforeDiscount(null);
  }, []);

  const updateRow = useCallback(
    (localId: string, field: "name" | "price" | "description", value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.localId === localId ? { ...row, [field]: value } : row))
      );
      setComponentsBeforeDiscount(null);
      setAppliedDiscount(null);
      setSubtotalBeforeDiscount(null);
      setCalculationMethod("manual");
    },
    []
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makePricingRow(undefined, prev.length)]);
    setCalculationMethod("manual");
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length ? next : [makePricingRow()];
    });
    setCalculationMethod("manual");
  }, []);

  const applySubtotal = useCallback(
    (
      subtotal: number,
      method: VariantCalculationMethod,
      nextRows: LocalPricingRow[],
      calc?: VariantPricingCalculationResponse | null
    ) => {
      setRows(nextRows);
      setCalculationMethod(method);
      setCalculation(calc ?? null);
      setSubtotalBeforeDiscount(Math.round(subtotal));
      setAppliedDiscount(null);
      setComponentsBeforeDiscount(null);
      setDiscountValue("");
      setDiscountReason("");
      setTotalCost(String(Math.round(subtotal)));
    },
    []
  );

  const calculateFromVariantSetup = useCallback(async () => {
    if (!id || !variantId || calculating) return;
    setCalculating(true);
    try {
      const result = await client.calculateVariantPricing(id, variantId, {
        markup: parseMoney(markup),
      });
      const nextRows = result.pricingSection.map((item, index) => makePricingRow(item, index));
      applySubtotal(
        result.subtotalBeforeDiscount ?? result.totalCost,
        "autoHotelTransport",
        nextRows,
        result
      );
    } catch (err) {
      Alert.alert(
        "Calculation failed",
        err instanceof ApiError ? err.message : "Could not calculate variant pricing."
      );
    } finally {
      setCalculating(false);
    }
  }, [applySubtotal, calculating, client, id, markup, variantId]);

  const calculateFromRooms = useCallback(async () => {
    if (!id || !variantId || calculatingFromRooms) return;
    setCalculatingFromRooms(true);
    try {
      const result = await client.calculateVariantPricing(id, variantId, {
        markup: parseMoney(markup),
      });
      const nextRows = result.pricingSection.map((item, index) => makePricingRow(item, index));
      setRows(nextRows);
      setCalculation(result);
      if (subtotalBeforeDiscount == null) {
        setSubtotalBeforeDiscount(result.subtotalBeforeDiscount ?? result.totalCost);
      }
    } catch (err) {
      Alert.alert(
        "Calculation failed",
        err instanceof ApiError ? err.message : "Could not refresh pricing rows from rooms."
      );
    } finally {
      setCalculatingFromRooms(false);
    }
  }, [calculatingFromRooms, client, id, markup, subtotalBeforeDiscount, variantId]);

  const fetchPackageComponents = useCallback(async () => {
    if (!id || !variantId || fetchingComponents || !mealPlanId) return;
    setFetchingComponents(true);
    try {
      const result = await client.fetchPackagePricingComponents(id, variantId, {
        mealPlanId,
        numberOfRooms: roomCount,
      });
      setFetchResult(result);
      const allIds = result.components.map((comp) => comp.id);
      setSelectedComponentIds(allIds);
      const initialQuantities: Record<string, number> = {};
      for (const comp of result.components) {
        initialQuantities[comp.id] = 1;
      }
      setComponentQuantities(initialQuantities);
    } catch (err) {
      setFetchResult(null);
      Alert.alert(
        "Fetch failed",
        err instanceof ApiError ? err.message : "Could not fetch package pricing components."
      );
    } finally {
      setFetchingComponents(false);
    }
  }, [client, fetchingComponents, id, mealPlanId, roomCount, variantId]);

  const applyPackageRows = useCallback(
    (nextRows: LocalPricingRow[], subtotal: number) => {
      applySubtotal(subtotal, "useTourPackagePricing", nextRows, null);
    },
    [applySubtotal]
  );

  const handleApplyDiscount = useCallback(() => {
    const subtotal =
      subtotalBeforeDiscount != null && subtotalBeforeDiscount > 0
        ? subtotalBeforeDiscount
        : itemTotal > 0
          ? Math.round(itemTotal)
          : parseMoney(totalCost);

    const result = computeVariantDiscount(subtotal, {
      type: discountType,
      inputValue: parseMoney(discountValue),
      reason: discountReason.trim() || undefined,
    });

    const baseComponents = clonePricingComponents(
      (componentsBeforeDiscount ?? rows).map(({ localId: _localId, ...row }) => row)
    );

    let nextRows = rows;
    if (result.appliedDiscount?.type === "percent") {
      const snapshot = clonePricingComponents(baseComponents);
      setComponentsBeforeDiscount(snapshot.map((item, index) => makePricingRow(item, index)));
      const discounted = applyPercentDiscountToPricingComponents(
        snapshot,
        result.appliedDiscount.inputValue
      );
      nextRows = discounted.map((item, index) => makePricingRow(item, index));
      setRows(nextRows);
    } else if (result.appliedDiscount?.type === "fixed" && componentsBeforeDiscount?.length) {
      nextRows = componentsBeforeDiscount;
      setRows(nextRows);
      setComponentsBeforeDiscount(null);
    }

    setAppliedDiscount(result.appliedDiscount);
    setSubtotalBeforeDiscount(result.subtotalBeforeDiscount);
    setTotalCost(String(result.totalCost));
  }, [
    componentsBeforeDiscount,
    discountReason,
    discountType,
    discountValue,
    itemTotal,
    rows,
    subtotalBeforeDiscount,
    totalCost,
  ]);

  const handleClearDiscount = useCallback(() => {
    if (componentsBeforeDiscount?.length) {
      setRows(componentsBeforeDiscount);
    }
    setComponentsBeforeDiscount(null);
    setAppliedDiscount(null);
    if (subtotalBeforeDiscount != null) {
      setTotalCost(String(subtotalBeforeDiscount));
    }
    setDiscountValue("");
    setDiscountReason("");
  }, [componentsBeforeDiscount, subtotalBeforeDiscount]);

  const save = useCallback(async () => {
    if (!id || !variantId || saving) return;
    const components = rows
      .map((row) => ({
        name: String(row.name ?? "").trim(),
        price: String(row.price ?? "").trim(),
        description: String(row.description ?? "").trim(),
      }))
      .filter((row) => row.name || row.price || row.description);
    const componentsSnapshot = (componentsBeforeDiscount ?? []).map((row) => ({
      name: String(row.name ?? "").trim(),
      price: String(row.price ?? "").trim(),
      description: String(row.description ?? "").trim(),
    }));
    const explicitTotal = totalCost.trim();
    const totalForSave = explicitTotal
      ? parseMoney(explicitTotal)
      : itemTotal > 0
        ? Math.round(itemTotal)
        : 0;

    setSaving(true);
    try {
      await client.updateVariantPricing(id, variantId, {
        calculationMethod,
        components,
        totalCost: totalForSave,
        remarks: remarks.trim() || null,
        subtotalBeforeDiscount:
          subtotalBeforeDiscount != null ? subtotalBeforeDiscount : totalForSave,
        appliedDiscount: appliedDiscount ?? null,
        componentsBeforeDiscount: componentsSnapshot,
        ...(calculation && calculationMethod === "autoHotelTransport"
          ? {
              basePrice: calculation.basePrice,
              appliedMarkup: calculation.appliedMarkup,
              breakdown: calculation.breakdown,
              itineraryBreakdown: calculation.itineraryBreakdown,
              transportDetails: calculation.transportDetails,
              perPersonRates: calculation.perPersonRates,
            }
          : {}),
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save variant pricing."
      );
    } finally {
      setSaving(false);
    }
  }, [
    appliedDiscount,
    calculation,
    calculationMethod,
    client,
    componentsBeforeDiscount,
    id,
    itemTotal,
    remarks,
    router,
    rows,
    saving,
    subtotalBeforeDiscount,
    totalCost,
    variantId,
  ]);

  if (loading) {
    return <AdminLoadingState label="Loading variant pricing..." testID="variant-pricing-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="variant-pricing-error">
        <Stack.Screen options={{ title: "Variant Pricing", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Variant pricing not found"}
          onRetry={() => void load()}
          testID="variant-pricing-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID="variant-pricing-screen"
      bottomInset={Spacing.xxl}
      footer={
        <AdminBottomActionBar
          primaryLabel={saving ? "Saving..." : "Save pricing"}
          primaryIcon="save-outline"
          primaryTestID="variant-pricing-save"
          primaryDisabled={saving || calculating || calculatingFromRooms}
          onPrimaryPress={() => void save()}
          secondaryLabel="Use sum"
          secondaryIcon="calculator-outline"
          secondaryTestID="variant-pricing-use-sum"
          onSecondaryPress={() => {
            const sum = itemTotal > 0 ? Math.round(itemTotal) : 0;
            setSubtotalBeforeDiscount(sum);
            setTotalCost(sum > 0 ? String(sum) : "");
          }}
        />
      }
    >
      <Stack.Screen options={{ title: "Variant Pricing", headerShown: false }} />
      <AdminTopBar
        title="Variant Pricing"
        subtitle={data.variant.name}
        onBackPress={() => router.back()}
        testID="variant-pricing-header"
      />

      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Saved total</Text>
          <Text style={styles.summaryValue}>
            Rs. {Math.round(data.pricing?.totalCost ?? 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Current</Text>
          <Text style={styles.summaryValue}>
            Rs. {currentSubtotal.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Method</Text>
          <Text style={styles.summaryValueSmall}>{methodLabel(calculationMethod)}</Text>
        </View>
      </View>

      <VariantPricingMethodPicker
        value={calculationMethod}
        onChange={(method) => setCalculationMethod(method)}
      />

      {calculationMethod === "autoHotelTransport" ? (
        <VariantAutoCalculateSection
          markup={markup}
          onMarkupChange={setMarkup}
          calculating={calculating}
          calculation={calculation}
          onCalculate={() => void calculateFromVariantSetup()}
        />
      ) : null}

      {calculationMethod === "useTourPackagePricing" ? (
        <VariantPackagePricingSection
          queryContext={data.queryContext}
          mealPlans={mealPlans}
          mealPlanId={mealPlanId}
          onMealPlanIdChange={(nextId) => {
            setMealPlanId(nextId);
            setFetchResult(null);
          }}
          roomCount={roomCount}
          onRoomCountChange={(count) => {
            setRoomCount(count);
            setFetchResult(null);
          }}
          fetching={fetchingComponents}
          fetchResult={fetchResult}
          selectedComponentIds={selectedComponentIds}
          onToggleComponent={(componentId) => {
            setSelectedComponentIds((prev) =>
              prev.includes(componentId)
                ? prev.filter((rowId) => rowId !== componentId)
                : [...prev, componentId]
            );
          }}
          componentQuantities={componentQuantities}
          onComponentQuantityChange={(componentId, quantity) => {
            setComponentQuantities((prev) => ({ ...prev, [componentId]: quantity }));
          }}
          onFetch={() => void fetchPackageComponents()}
          onApplySelected={applyPackageRows}
          onApplyAll={applyPackageRows}
        />
      ) : null}

      <VariantPricingBreakdown
        rows={rows}
        calculatingFromRooms={calculatingFromRooms}
        onLoadDefault={() => updateRows(cloneDefaultPricingSection().map((item, index) => makePricingRow(item, index)))}
        onCalculateFromRooms={() => void calculateFromRooms()}
        onAddRow={addRow}
        onRemoveRow={removeRow}
        onUpdateRow={updateRow}
      />

      <VariantDiscountSection
        discountType={discountType}
        onDiscountTypeChange={setDiscountType}
        discountValue={discountValue}
        onDiscountValueChange={setDiscountValue}
        discountReason={discountReason}
        onDiscountReasonChange={setDiscountReason}
        appliedDiscount={appliedDiscount}
        onApplyDiscount={handleApplyDiscount}
        onClearDiscount={handleClearDiscount}
      />

      <VariantPricingTotalSection
        totalCost={totalCost}
        onTotalCostChange={(value) => {
          setTotalCost(value);
          setAppliedDiscount(null);
        }}
        remarks={remarks}
        onRemarksChange={setRemarks}
        roomCount={calculationMethod === "useTourPackagePricing" ? roomCount : undefined}
        rowsTotal={itemTotal}
      />

      {saving ? (
        <View style={styles.savingLine}>
          <ActivityIndicator size="small" />
          <Text style={styles.savingText}>Saving variant pricing</Text>
        </View>
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  summaryCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    padding: 8,
    gap: 3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.text,
  },
  summaryValueSmall: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.text,
  },
  savingLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  savingText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
