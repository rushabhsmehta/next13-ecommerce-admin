import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminBottomActionBar,
  AdminErrorState,
  AdminFormSection,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import {
  createTourQueryPricingClient,
  type VariantPricingCalculationResponse,
  type VariantPricingComponent,
  type VariantPricingDetailResponse,
} from "@/lib/tour-query-pricing";

type LocalPricingRow = VariantPricingComponent & { localId: string };

function makeRow(seed?: Partial<VariantPricingComponent>, index = 0): LocalPricingRow {
  return {
    localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: seed?.name ? String(seed.name) : "",
    price: seed?.price ? String(seed.price) : "",
    description: seed?.description ? String(seed.description) : "",
  };
}

function parseMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatINR(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseMoney(value) : value ?? 0;
  if (!Number.isFinite(n) || n <= 0) return "Rs. 0";
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

function methodLabel(method: string | null | undefined): string {
  if (method === "manual") return "Manual pricing";
  if (method === "autoHotelTransport") return "Hotel + transport";
  if (method === "autoTourPackage" || method === "useTourPackagePricing") {
    return "Package pricing";
  }
  return "No method";
}

function rowsFromDetail(data: VariantPricingDetailResponse): LocalPricingRow[] {
  const saved = data.pricing?.components ?? [];
  if (saved.length) return saved.map((item, index) => makeRow(item, index));
  return [makeRow()];
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
  const [rows, setRows] = useState<LocalPricingRow[]>([makeRow()]);
  const [totalCost, setTotalCost] = useState("");
  const [remarks, setRemarks] = useState("");
  const [markup, setMarkup] = useState("0");
  const [calculationMethod, setCalculationMethod] = useState("manual");
  const [calculation, setCalculation] =
    useState<VariantPricingCalculationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !variantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.getVariantPricing(id, variantId);
      setData(res);
      setRows(rowsFromDetail(res));
      setTotalCost(res.pricing?.totalCost ? String(Math.round(res.pricing.totalCost)) : "");
      setRemarks(res.pricing?.remarks ?? "");
      setCalculationMethod(res.pricing?.calculationMethod || "manual");
      setCalculation(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load variant pricing.");
    } finally {
      setLoading(false);
    }
  }, [client, id, variantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemTotal = useMemo(
    () => rows.reduce((sum, row) => sum + parseMoney(row.price), 0),
    [rows]
  );

  const markManual = useCallback(() => {
    setCalculation(null);
    setCalculationMethod("manual");
  }, []);

  const updateRow = useCallback(
    (localId: string, field: "name" | "price" | "description", value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.localId === localId ? { ...row, [field]: value } : row))
      );
      markManual();
    },
    [markManual]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeRow(undefined, prev.length)]);
    markManual();
  }, [markManual]);

  const removeRow = useCallback(
    (localId: string) => {
      setRows((prev) => {
        const next = prev.filter((row) => row.localId !== localId);
        return next.length ? next : [makeRow()];
      });
      markManual();
    },
    [markManual]
  );

  const calculateFromVariantSetup = useCallback(async () => {
    if (!id || !variantId || calculating) return;
    setCalculating(true);
    try {
      const result = await client.calculateVariantPricing(id, variantId, {
        markup: parseMoney(markup),
      });
      setCalculation(result);
      setRows(result.pricingSection.map((item, index) => makeRow(item, index)));
      setTotalCost(String(Math.round(result.totalCost || 0)));
      setCalculationMethod(result.calculationMethod || "autoHotelTransport");
    } catch (err) {
      Alert.alert(
        "Calculation failed",
        err instanceof ApiError ? err.message : "Could not calculate variant pricing."
      );
    } finally {
      setCalculating(false);
    }
  }, [calculating, client, id, markup, variantId]);

  const save = useCallback(async () => {
    if (!id || !variantId || saving) return;
    const components = rows
      .map((row) => ({
        name: String(row.name ?? "").trim(),
        price: String(row.price ?? "").trim(),
        description: String(row.description ?? "").trim(),
      }))
      .filter((row) => row.name || row.price || row.description);
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
    calculation,
    calculationMethod,
    client,
    id,
    itemTotal,
    remarks,
    router,
    rows,
    saving,
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
          primaryDisabled={saving || calculating}
          onPrimaryPress={() => void save()}
          secondaryLabel="Use sum"
          secondaryIcon="calculator-outline"
          secondaryTestID="variant-pricing-use-sum"
          onSecondaryPress={() => setTotalCost(itemTotal > 0 ? String(Math.round(itemTotal)) : "")}
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
          <Text style={styles.summaryValue}>{formatINR(data.pricing?.totalCost)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Rows total</Text>
          <Text style={styles.summaryValue}>{formatINR(itemTotal)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Method</Text>
          <Text style={styles.summaryValueSmall}>{methodLabel(calculationMethod)}</Text>
        </View>
      </View>

      <AdminFormSection title="Calculate" testID="variant-pricing-calculate-section">
        <View style={styles.calculateRow}>
          <TextInput
            testID="variant-pricing-markup"
            accessibilityLabel="Markup percentage"
            value={markup}
            onChangeText={setMarkup}
            placeholder="Markup %"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            style={[styles.input, styles.markupInput]}
          />
          <Pressable
            testID="variant-pricing-calculate"
            accessibilityRole="button"
            accessibilityLabel="Calculate from variant rooms and transport"
            disabled={calculating}
            style={({ pressed }) => [
              styles.calculateButton,
              calculating ? styles.calculateButtonDisabled : null,
              pressed && !calculating ? styles.pressed : null,
            ]}
            onPress={() => void calculateFromVariantSetup()}
          >
            {calculating ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Ionicons name="calculator-outline" size={16} color={Colors.textInverse} />
            )}
            <Text style={styles.calculateButtonText}>
              {calculating ? "Calculating" : "Calculate"}
            </Text>
          </Pressable>
        </View>
        {calculation ? (
          <View style={styles.calcResult}>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Base</Text>
              <Text style={styles.calcMetricValue}>{formatINR(calculation.basePrice)}</Text>
            </View>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Stay</Text>
              <Text style={styles.calcMetricValue}>
                {formatINR(calculation.breakdown.accommodation)}
              </Text>
            </View>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Transport</Text>
              <Text style={styles.calcMetricValue}>
                {formatINR(calculation.breakdown.transport)}
              </Text>
            </View>
          </View>
        ) : null}
      </AdminFormSection>

      <AdminFormSection title="Line Items" testID="variant-pricing-line-items">
        {rows.map((row, index) => (
          <View key={row.localId} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowIndex}>Item {index + 1}</Text>
              <Pressable
                testID={`variant-pricing-remove-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove pricing item ${index + 1}`}
                style={styles.removeButton}
                onPress={() => removeRow(row.localId)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
            <TextInput
              testID={`variant-pricing-name-${index}`}
              accessibilityLabel={`Pricing item ${index + 1} name`}
              value={String(row.name ?? "")}
              onChangeText={(value) => updateRow(row.localId, "name", value)}
              placeholder="Item name"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
            <TextInput
              testID={`variant-pricing-price-${index}`}
              accessibilityLabel={`Pricing item ${index + 1} price`}
              value={String(row.price ?? "")}
              onChangeText={(value) => updateRow(row.localId, "price", value)}
              placeholder="Price"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              testID={`variant-pricing-description-${index}`}
              accessibilityLabel={`Pricing item ${index + 1} description`}
              value={String(row.description ?? "")}
              onChangeText={(value) => updateRow(row.localId, "description", value)}
              placeholder="Calculation"
              placeholderTextColor={Colors.textTertiary}
              multiline
              style={[styles.input, styles.multiline]}
            />
          </View>
        ))}
        <Pressable
          testID="variant-pricing-add-item"
          accessibilityRole="button"
          accessibilityLabel="Add pricing item"
          style={styles.addButton}
          onPress={addRow}
        >
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add item</Text>
        </Pressable>
      </AdminFormSection>

      <AdminFormSection title="Total And Remarks" testID="variant-pricing-total-section">
        <TextInput
          testID="variant-pricing-total"
          accessibilityLabel="Total price"
          value={totalCost}
          onChangeText={(value) => {
            setTotalCost(value);
            markManual();
          }}
          placeholder="Total price"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          testID="variant-pricing-remarks"
          accessibilityLabel="Pricing remarks"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Remarks"
          placeholderTextColor={Colors.textTertiary}
          multiline
          style={[styles.input, styles.multiline]}
        />
        {saving ? (
          <View style={styles.savingLine}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.savingText}>Saving variant pricing</Text>
          </View>
        ) : null}
      </AdminFormSection>
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
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: 3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  summaryValueSmall: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
  },
  calculateRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.sm,
  },
  markupInput: { flex: 1 },
  calculateButton: {
    minHeight: 46,
    minWidth: 132,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  calculateButtonDisabled: { opacity: 0.55 },
  calculateButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.textInverse,
  },
  calcResult: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  calcMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    gap: 2,
  },
  calcMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  calcMetricValue: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
  },
  rowCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowIndex: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  removeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  multiline: {
    minHeight: 78,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  addButton: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.primary,
  },
  savingLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  savingText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  pressed: { opacity: 0.88 },
});
