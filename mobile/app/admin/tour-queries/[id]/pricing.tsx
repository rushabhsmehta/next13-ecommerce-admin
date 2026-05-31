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
import { useAuth } from "@clerk/clerk-expo";
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
  createTourQueryEditClient,
  type TourQueryPricingItemEdit,
} from "@/lib/tour-query-edit";

interface TourQueryPricingDetail {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  price: string | null;
  pricePerAdult: string | null;
  pricePerChildOrExtraBed: string | null;
  pricePerChild5to12YearsNoBed: string | null;
  pricePerChildwithSeatBelow5Years: string | null;
  totalPrice: string | null;
  pricingSection: TourQueryPricingItemEdit[] | null;
  pricingCalculationMethod: string | null;
}

interface TourQueryPricingCalculationResponse {
  totalCost: number;
  basePrice: number;
  appliedMarkup: { percentage: number; amount: number };
  breakdown: { accommodation: number; transport: number };
  pricingSection: TourQueryPricingItemEdit[];
  calculationMethod: string;
}

type LocalPricingRow = TourQueryPricingItemEdit & { localId: string };

function makeRow(seed?: TourQueryPricingItemEdit, index = 0): LocalPricingRow {
  return {
    localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: seed?.name ? String(seed.name) : "",
    price: seed?.price ? String(seed.price) : "",
    description: seed?.description ? String(seed.description) : "",
  };
}

function rowsFromDetail(data: TourQueryPricingDetail): LocalPricingRow[] {
  const saved = Array.isArray(data.pricingSection)
    ? data.pricingSection.filter((item) =>
        Boolean(
          String(item?.name ?? "").trim() ||
            String(item?.price ?? "").trim() ||
            String(item?.description ?? "").trim()
        )
      )
    : [];
  if (saved.length) return saved.map((item, index) => makeRow(item, index));

  const legacyRows: TourQueryPricingItemEdit[] = [
    { name: "Per adult", price: data.pricePerAdult ?? "" },
    { name: "Per child (extra bed)", price: data.pricePerChildOrExtraBed ?? "" },
    { name: "Per child 5-12", price: data.pricePerChild5to12YearsNoBed ?? "" },
    { name: "Per child under 5", price: data.pricePerChildwithSeatBelow5Years ?? "" },
  ].filter((item) => String(item.price ?? "").trim());

  if (legacyRows.length) return legacyRows.map((item, index) => makeRow(item, index));
  return [makeRow()];
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

export default function TourQueryPricingScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <TourQueryPricingScreenInner />
    </PermissionGate>
  );
}

function TourQueryPricingScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const editClient = useMemo(() => createTourQueryEditClient(authRequest), [authRequest]);

  const [data, setData] = useState<TourQueryPricingDetail | null>(null);
  const [rows, setRows] = useState<LocalPricingRow[]>([makeRow()]);
  const [totalPrice, setTotalPrice] = useState("");
  const [calculationMethod, setCalculationMethod] = useState("manual");
  const [markup, setMarkup] = useState("0");
  const [calculation, setCalculation] =
    useState<TourQueryPricingCalculationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authRequest<TourQueryPricingDetail>(
        `/api/mobile/tour-queries/${encodeURIComponent(id)}`,
        { retries: 1 }
      );
      setData(res);
      setRows(rowsFromDetail(res));
      setTotalPrice(res.totalPrice ?? "");
      setCalculationMethod(res.pricingCalculationMethod || "manual");
      setCalculation(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load pricing.");
    } finally {
      setLoading(false);
    }
  }, [authRequest, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemTotal = useMemo(
    () => rows.reduce((sum, row) => sum + parseMoney(row.price), 0),
    [rows]
  );

  const updateRow = useCallback(
    (localId: string, field: "name" | "price" | "description", value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.localId === localId ? { ...row, [field]: value } : row))
      );
      setCalculationMethod("manual");
    },
    []
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeRow(undefined, prev.length)]);
    setCalculationMethod("manual");
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length ? next : [makeRow()];
    });
    setCalculationMethod("manual");
  }, []);

  const calculateFromRooms = useCallback(async () => {
    if (!id || calculating) return;
    setCalculating(true);
    try {
      const result = await authRequest<TourQueryPricingCalculationResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(id)}/pricing/calculate`,
        {
          method: "POST",
          body: { markup: parseMoney(markup) },
          timeout: 90000,
        }
      );
      setCalculation(result);
      setRows(result.pricingSection.map((item, index) => makeRow(item, index)));
      setTotalPrice(String(Math.round(result.totalCost || 0)));
      setCalculationMethod(result.calculationMethod || "autoHotelTransport");
    } catch (err) {
      Alert.alert(
        "Calculation failed",
        err instanceof ApiError ? err.message : "Could not calculate pricing."
      );
    } finally {
      setCalculating(false);
    }
  }, [authRequest, calculating, id, markup]);

  const save = useCallback(async () => {
    if (!id || saving) return;
    const cleanRows = rows
      .map((row) => ({
        name: String(row.name ?? "").trim(),
        price: String(row.price ?? "").trim(),
        description: String(row.description ?? "").trim(),
      }))
      .filter((row) => row.name || row.price || row.description);
    const explicitTotal = totalPrice.trim();
    const totalForSave = explicitTotal || (itemTotal > 0 ? String(Math.round(itemTotal)) : null);

    setSaving(true);
    try {
      await editClient.update(id, {
        pricingCalculationMethod: calculationMethod || "manual",
        pricingSection: cleanRows,
        totalPrice: totalForSave,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save pricing."
      );
    } finally {
      setSaving(false);
    }
  }, [calculationMethod, editClient, id, itemTotal, router, rows, saving, totalPrice]);

  if (loading) {
    return <AdminLoadingState label="Loading pricing..." testID="tq-pricing-loading" />;
  }

  if (error || !data) {
    return (
      <AdminScreen testID="tq-pricing-error">
        <Stack.Screen options={{ title: "Pricing", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Pricing not found"}
          onRetry={() => void load()}
          testID="tq-pricing-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID="tq-pricing-screen"
      bottomInset={Spacing.xxl}
      footer={
        <AdminBottomActionBar
          primaryLabel={saving ? "Saving..." : "Save pricing"}
          primaryIcon="save-outline"
          primaryTestID="tq-pricing-save"
          primaryDisabled={saving || calculating}
          onPrimaryPress={() => void save()}
          secondaryLabel="Use sum"
          secondaryIcon="calculator-outline"
          secondaryTestID="tq-pricing-use-sum"
          onSecondaryPress={() => setTotalPrice(itemTotal > 0 ? String(Math.round(itemTotal)) : "")}
        />
      }
    >
      <Stack.Screen options={{ title: "Pricing", headerShown: false }} />
      <AdminTopBar
        title="Pricing"
        subtitle={data.tourPackageQueryName || data.tourPackageQueryNumber || undefined}
        onBackPress={() => router.back()}
        testID="tq-pricing-header"
      />

      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Saved total</Text>
          <Text style={styles.summaryValue}>{formatINR(data.totalPrice)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Rows total</Text>
          <Text style={styles.summaryValue}>{formatINR(itemTotal)}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Method</Text>
          <Text style={styles.summaryValueSmall}>
            {methodLabel(calculationMethod)}
          </Text>
        </View>
      </View>

      <AdminFormSection title="Calculate" testID="tq-pricing-calculate-section">
        <View style={styles.calculateRow}>
          <TextInput
            testID="tq-pricing-markup"
            accessibilityLabel="Markup percentage"
            value={markup}
            onChangeText={setMarkup}
            placeholder="Markup %"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            style={[styles.input, styles.markupInput]}
          />
          <Pressable
            testID="tq-pricing-calculate"
            accessibilityRole="button"
            accessibilityLabel="Calculate from rooms and transport"
            disabled={calculating}
            style={({ pressed }) => [
              styles.calculateButton,
              calculating ? styles.calculateButtonDisabled : null,
              pressed && !calculating ? styles.pressed : null,
            ]}
            onPress={() => void calculateFromRooms()}
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

      <AdminFormSection title="Line Items" testID="tq-pricing-line-items">
        {rows.map((row, index) => (
          <View key={row.localId} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowIndex}>Item {index + 1}</Text>
              <Pressable
                testID={`tq-pricing-remove-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove pricing item ${index + 1}`}
                style={styles.removeButton}
                onPress={() => removeRow(row.localId)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
            <TextInput
              testID={`tq-pricing-name-${index}`}
              accessibilityLabel={`Pricing item ${index + 1} name`}
              value={String(row.name ?? "")}
              onChangeText={(value) => updateRow(row.localId, "name", value)}
              placeholder="Item name"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
            <TextInput
              testID={`tq-pricing-price-${index}`}
              accessibilityLabel={`Pricing item ${index + 1} price`}
              value={String(row.price ?? "")}
              onChangeText={(value) => updateRow(row.localId, "price", value)}
              placeholder="Price"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              testID={`tq-pricing-description-${index}`}
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
          testID="tq-pricing-add-item"
          accessibilityRole="button"
          accessibilityLabel="Add pricing item"
          style={styles.addButton}
          onPress={addRow}
        >
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add item</Text>
        </Pressable>
      </AdminFormSection>

      <AdminFormSection title="Total" testID="tq-pricing-total-section">
        <TextInput
          testID="tq-pricing-total"
          accessibilityLabel="Total price"
          value={totalPrice}
          onChangeText={setTotalPrice}
          placeholder="Total price"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
          style={styles.input}
        />
        {saving ? (
          <View style={styles.savingLine}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.savingText}>Saving pricing</Text>
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
