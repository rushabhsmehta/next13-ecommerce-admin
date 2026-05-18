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
import { OfflineGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import { createFinanceClient, type FinanceParty } from "@/lib/finance";

type Mode = "sale" | "purchase";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

const MODE_OPTIONS: { id: Mode; label: string }[] = [
  { id: "sale", label: "Sale (invoice)" },
  { id: "purchase", label: "Purchase (bill)" },
];

export default function FinanceInvoiceScreen() {
  return (
    <OfflineGate policy="online_only">
      <Inner />
    </OfflineGate>
  );
}

function Inner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFinanceClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [mode, setMode] = useState<Mode>(
    params.mode === "purchase" ? "purchase" : "sale"
  );
  const [party, setParty] = useState<FinanceParty | null>(null);
  const [docNumber, setDocNumber] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [gstPct, setGstPct] = useState("");
  const [isGst, setIsGst] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [partyPickerOpen, setPartyPickerOpen] = useState(false);
  const [partyResults, setPartyResults] = useState<FinanceParty[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);

  const partyType = mode === "sale" ? "customer" : "supplier";

  useEffect(() => {
    setParty(null);
  }, [mode]);

  const loadParties = useCallback(
    async (term: string) => {
      setPartyLoading(true);
      try {
        const r = await client.listParties(partyType, term || undefined);
        setPartyResults(r.parties);
      } catch {
        setPartyResults([]);
      } finally {
        setPartyLoading(false);
      }
    },
    [client, partyType]
  );

  useEffect(() => {
    if (!partyPickerOpen) return;
    void loadParties("");
  }, [partyPickerOpen, loadParties]);

  const partyOptions = useMemo(
    () =>
      partyResults.map((p) => ({
        id: p.id,
        label: p.name,
        subtitle: p.subtitle ?? undefined,
      })),
    [partyResults]
  );

  const base = Number(baseAmount);
  const pct = Number(gstPct);
  const baseOk = Number.isFinite(base) && base > 0;
  const gstAmount =
    isGst && Number.isFinite(pct) && pct > 0 ? round2((base * pct) / 100) : 0;
  const total = round2(base + gstAmount);
  const dateOk = ISO.test(date);
  const canSubmit = baseOk && dateOk && !!party && !submitting;

  const [serverTax, setServerTax] = useState<{
    gstAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyTax = useCallback(async () => {
    if (!baseOk) return;
    setVerifying(true);
    try {
      const r = await client.computeTax({
        baseAmount: base,
        gstPercentage: isGst ? pct || 0 : 0,
      });
      setServerTax({
        gstAmount: r.gstAmount,
        cgst: r.cgst,
        sgst: r.sgst,
        igst: r.igst,
        total: r.total,
      });
    } catch {
      Alert.alert(
        "Could not verify",
        "The server tax check failed. Your local total still applies."
      );
    } finally {
      setVerifying(false);
    }
  }, [baseOk, base, isGst, pct, client]);

  const submit = useCallback(async () => {
    if (!canSubmit || !party) return;
    setSubmitting(true);
    try {
      if (mode === "sale") {
        await client.createSale({
          customerId: party.id,
          saleDate: date,
          invoiceNumber: docNumber.trim() || null,
          salePrice: base,
          gstAmount: isGst ? gstAmount : null,
          gstPercentage: isGst && pct > 0 ? pct : null,
          isGst,
          description: description.trim() || null,
        });
      } else {
        await client.createPurchase({
          supplierId: party.id,
          purchaseDate: date,
          billNumber: docNumber.trim() || null,
          price: base,
          gstAmount: isGst ? gstAmount : null,
          gstPercentage: isGst && pct > 0 ? pct : null,
          isGst,
          description: description.trim() || null,
        });
      }
      router.back();
    } catch (err) {
      Alert.alert(
        "Could not save",
        err instanceof ApiError ? err.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    party,
    mode,
    date,
    docNumber,
    base,
    isGst,
    gstAmount,
    pct,
    description,
    client,
    router,
  ]);

  return (
    <AdminScreen
      keyboardAvoiding
      testID="finance-invoice-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel={`Save ${mode === "sale" ? "sale" : "purchase"}`}
          primaryIcon="save-outline"
          primaryTestID="finance-invoice-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !party
              ? `Choose a ${partyType}.`
              : !baseOk
                ? "Enter a positive base amount."
                : !dateOk
                    ? "Choose a date."
                  : submitting
                    ? "Saving…"
                    : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: "Sale / Purchase", headerShown: false }} />

      <AdminTopBar
        title="Record sale / purchase"
        subtitle="Invoice or bill"
        onBackPress={() => router.back()}
        testID="finance-invoice"
      />

      <AdminFormSection title="Type" testID="finance-invoice-mode-section">
        <AdminSegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          testIDPrefix="finance-invoice-mode"
          scrollable={false}
        />
      </AdminFormSection>

      <AdminFormSection title="Document" testID="finance-invoice-document">
        <AdminFormField label={mode === "sale" ? "Customer" : "Supplier"} required>
          <Pressable
            testID="finance-invoice-party"
            accessibilityRole="button"
            accessibilityLabel="Choose party"
            style={styles.pickerBtn}
            onPress={() => setPartyPickerOpen(true)}
          >
            <Text style={styles.pickerText} numberOfLines={1}>
              {party ? party.name : "Tap to choose"}
            </Text>
          </Pressable>
        </AdminFormField>

        <AdminFormField label={mode === "sale" ? "Invoice number" : "Bill number"}>
          <TextInput
            testID="finance-invoice-number"
            style={styles.input}
            value={docNumber}
            onChangeText={setDocNumber}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
          />
        </AdminFormField>

        <AdminFormField label="Base amount (₹)" required>
          <TextInput
            testID="finance-invoice-amount"
            style={styles.input}
            value={baseAmount}
            onChangeText={setBaseAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>

        <Pressable
          testID="finance-invoice-gst-toggle"
          accessibilityRole="button"
          accessibilityLabel="Toggle GST"
          style={styles.toggleRow}
          onPress={() => setIsGst((v) => !v)}
        >
          <Ionicons
            name={isGst ? "checkbox" : "square-outline"}
            size={20}
            color={isGst ? Colors.primary : Colors.textSecondary}
          />
          <Text style={styles.toggleText}>GST applicable</Text>
        </Pressable>

        {isGst ? (
          <AdminFormField label="GST %">
            <TextInput
              testID="finance-invoice-gstpct"
              style={styles.input}
              value={gstPct}
              onChangeText={setGstPct}
              keyboardType="decimal-pad"
              placeholder="e.g. 5"
              placeholderTextColor={Colors.textTertiary}
            />
          </AdminFormField>
        ) : null}

        <AdminFormField label="Date" required>
          <DateField
            testID="finance-invoice-date"
            style={styles.input}
            value={date}
            onChange={setDate}
            accessibilityLabel="Document date"
            allowClear={false}
          />
        </AdminFormField>

        <AdminFormField label="Description">
          <TextInput
            testID="finance-invoice-description"
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </AdminFormField>
      </AdminFormSection>

      <View style={styles.totalCard}>
        <Text style={styles.totalRow}>
          Base: ₹{baseOk ? base.toLocaleString("en-IN") : "0"}
        </Text>
        {isGst ? (
          <Text style={styles.totalRow}>GST: ₹{gstAmount.toLocaleString("en-IN")}</Text>
        ) : null}
        <Text style={styles.totalValue}>Total: ₹{total.toLocaleString("en-IN")}</Text>
        <Pressable
          testID="finance-invoice-verify"
          accessibilityRole="button"
          accessibilityLabel="Verify tax on server"
          accessibilityHint="Recomputes GST and the CGST/SGST/IGST split using the server's authoritative tax helpers."
          disabled={!baseOk || verifying}
          style={styles.verifyBtn}
          onPress={verifyTax}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.verifyText}>Verify tax on server</Text>
          )}
        </Pressable>
        {serverTax ? (
          <View style={styles.serverBox}>
            <Text style={styles.serverLine}>
              Server GST ₹{serverTax.gstAmount.toLocaleString("en-IN")}
              {serverTax.igst > 0
                ? ` · IGST ₹${serverTax.igst.toLocaleString("en-IN")}`
                : ` · CGST ₹${serverTax.cgst.toLocaleString("en-IN")} · SGST ₹${serverTax.sgst.toLocaleString("en-IN")}`}
            </Text>
            <Text style={styles.serverLine}>
              Server total ₹{serverTax.total.toLocaleString("en-IN")}
              {Math.abs(serverTax.total - total) > 0.5 ? " — differs from local!" : " ✓ matches"}
            </Text>
          </View>
        ) : null}
      </View>

      <AdminPickerSheet
        visible={partyPickerOpen}
        title={`Choose ${partyType}`}
        options={partyOptions}
        selectedId={party?.id ?? null}
        loading={partyLoading}
        onClose={() => setPartyPickerOpen(false)}
        onSelect={(opt) => {
          const found = partyResults.find((p) => p.id === opt.id);
          if (found) setParty(found);
        }}
        searchPlaceholder={`Search ${partyType}…`}
        emptyLabel="No matches."
        testID="finance-invoice-party-sheet"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  pickerBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  pickerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  toggleText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  totalCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: Spacing.md,
  },
  totalRow: { fontSize: FontSize.sm, color: Colors.textSecondary },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  verifyBtn: {
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surface,
  },
  verifyText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.primary },
  serverBox: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.sm,
  },
  serverLine: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
