import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { OfflineGate } from "@/components/auth/PermissionGate";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
} from "@/components/admin";
import {
  createFinanceClient,
  type FinanceParty,
  type AllocatableItem,
} from "@/lib/finance";

type Mode = "sale" | "purchase";
const todayIso = () => new Date().toISOString().slice(0, 10);

const MODE_OPTIONS: { id: Mode; label: string }[] = [
  { id: "sale", label: "Sale return" },
  { id: "purchase", label: "Purchase return" },
];

export default function FinanceReturnScreen() {
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
  const [docs, setDocs] = useState<AllocatableItem[]>([]);
  const [doc, setDoc] = useState<AllocatableItem | null>(null);
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [creditType, setCreditType] = useState<string>(
    mode === "sale" ? "cash_refund" : "refund"
  );
  const [submitting, setSubmitting] = useState(false);

  const [partyPickerOpen, setPartyPickerOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [partyResults, setPartyResults] = useState<FinanceParty[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);

  const partyType = mode === "sale" ? "customer" : "supplier";
  const allocKind = mode === "sale" ? "sales" : "purchases";
  const saleCreditTypes = ["cash_refund", "credit_note", "adjustment"];
  const purchaseCreditTypes = ["refund", "credit", "adjustment"];

  useEffect(() => {
    setParty(null);
    setDoc(null);
    setDocs([]);
    setCreditType(mode === "sale" ? "cash_refund" : "refund");
  }, [mode]);

  useEffect(() => {
    if (!party) {
      setDocs([]);
      return;
    }
    client.listAllocatable(allocKind, party.id).then(
      (r) => setDocs(r.items),
      () => setDocs([])
    );
  }, [party, allocKind, client]);

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
    () => partyResults.map((p) => ({ id: p.id, label: p.name, subtitle: p.subtitle })),
    [partyResults]
  );

  const docOptions = useMemo(
    () =>
      docs.map((d) => ({
        id: d.id,
        label: d.reference,
        subtitle: `Due ₹${Math.round(d.balanceDue).toLocaleString("en-IN")}${d.tourPackageQueryName ? ` · ${d.tourPackageQueryName}` : ""}`,
      })),
    [docs]
  );

  const amt = Number(amount);
  const amtOk = Number.isFinite(amt) && amt > 0;
  const dateState = todayIso();
  const canSubmit = amtOk && !!party && !!doc && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit || !doc) return;
    setSubmitting(true);
    try {
      if (mode === "sale") {
        await client.createSaleReturn({
          saleDetailId: doc.id,
          returnDate: dateState,
          amount: amt,
          gstAmount: gst ? Number(gst) : null,
          reference: reference.trim() || null,
          returnReason: reason.trim() || null,
          creditType,
        });
      } else {
        await client.createPurchaseReturn({
          purchaseDetailId: doc.id,
          returnDate: dateState,
          amount: amt,
          gstAmount: gst ? Number(gst) : null,
          reference: reference.trim() || null,
          returnReason: reason.trim() || null,
          supplierCreditType: creditType,
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
    doc,
    mode,
    dateState,
    amt,
    gst,
    reference,
    reason,
    creditType,
    client,
    router,
  ]);

  const creditOptions = mode === "sale" ? saleCreditTypes : purchaseCreditTypes;

  return (
    <AdminScreen
      keyboardAvoiding
      testID="finance-return-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel="Save return"
          primaryIcon="save-outline"
          primaryTestID="finance-return-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !party
              ? `Choose a ${partyType}.`
              : !doc
                ? "Choose a source document."
                : !amtOk
                  ? "Enter a positive return amount."
                  : submitting
                    ? "Saving…"
                    : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: "Return", headerShown: false }} />

      <AdminTopBar
        title="Record return"
        subtitle="Sale or purchase return"
        onBackPress={() => router.back()}
        testID="finance-return"
      />

      <AdminFormSection title="Type" testID="finance-return-mode-section">
        <AdminSegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          testIDPrefix="finance-return-mode"
          scrollable={false}
        />
      </AdminFormSection>

      <AdminFormSection title="Source" testID="finance-return-source">
        <AdminFormField label={mode === "sale" ? "Customer" : "Supplier"} required>
          <Pressable
            testID="finance-return-party"
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

        <AdminFormField label={mode === "sale" ? "Against invoice" : "Against bill"} required>
          <Pressable
            testID="finance-return-doc"
            accessibilityRole="button"
            accessibilityLabel="Choose source document"
            style={styles.pickerBtn}
            disabled={!party}
            onPress={() => setDocPickerOpen(true)}
          >
            <Text style={styles.pickerText} numberOfLines={1}>
              {doc
                ? `${doc.reference} · due ₹${Math.round(doc.balanceDue).toLocaleString("en-IN")}`
                : party
                  ? "Tap to choose"
                  : "Choose a party first"}
            </Text>
          </Pressable>
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Amounts" testID="finance-return-amounts">
        <AdminFormField label="Return amount (₹)" required>
          <TextInput
            testID="finance-return-amount"
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>

        <AdminFormField label="GST amount (optional)">
          <TextInput
            testID="finance-return-gst"
            style={styles.input}
            value={gst}
            onChangeText={setGst}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>

        <Text style={styles.fieldLabel}>
          {mode === "sale" ? "Credit type" : "Supplier credit type"}
        </Text>
        <View style={styles.chipRow}>
          {creditOptions.map((ct) => {
            const active = creditType === ct;
            return (
              <Pressable
                key={ct}
                testID={`finance-return-credit-${ct}`}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => setCreditType(ct)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {ct.replace(/_/g, " ")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <AdminFormField label="Reference">
          <TextInput
            testID="finance-return-reference"
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
          />
        </AdminFormField>

        <AdminFormField label="Reason">
          <TextInput
            testID="finance-return-reason"
            style={[styles.input, styles.textarea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminPickerSheet
        visible={partyPickerOpen}
        title={`Choose ${partyType}`}
        options={partyOptions}
        selectedId={party?.id ?? null}
        loading={partyLoading}
        onClose={() => setPartyPickerOpen(false)}
        onSelect={(opt) => {
          const found = partyResults.find((p) => p.id === opt.id);
          if (found) {
            setParty(found);
            setDoc(null);
          }
        }}
        searchPlaceholder={`Search ${partyType}…`}
        emptyLabel="No matches."
        testID="finance-return-party-sheet"
      />

      <AdminPickerSheet
        visible={docPickerOpen}
        title={mode === "sale" ? "Choose invoice" : "Choose bill"}
        options={docOptions}
        selectedId={doc?.id ?? null}
        onClose={() => setDocPickerOpen(false)}
        onSelect={(opt) => {
          const found = docs.find((d) => d.id === opt.id);
          if (found) setDoc(found);
        }}
        emptyLabel="No documents for this party."
        testID="finance-return-doc-sheet"
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
  fieldLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  chipRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  chipTextActive: { color: Colors.primary },
});
