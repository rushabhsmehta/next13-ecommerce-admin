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
import {
  createFinanceClient,
  type FinanceAccount,
  type FinanceParty,
  type AllocatableItem,
} from "@/lib/finance";

type Mode = "receipt" | "payment";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const MODE_OPTIONS: { id: Mode; label: string }[] = [
  { id: "receipt", label: "Receipt (in)" },
  { id: "payment", label: "Payment (out)" },
];

function accountKey(a: FinanceAccount): string {
  return `${a.kind}-${a.id}`;
}

export default function FinanceCollectScreen() {
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
    params.mode === "payment" ? "payment" : "receipt"
  );
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [account, setAccount] = useState<FinanceAccount | null>(null);
  const [party, setParty] = useState<FinanceParty | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [allocatable, setAllocatable] = useState<AllocatableItem[]>([]);
  const [allocs, setAllocs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [partyPickerOpen, setPartyPickerOpen] = useState(false);
  const [partyResults, setPartyResults] = useState<FinanceParty[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);

  const partyType = mode === "receipt" ? "customer" : "supplier";
  const allocKind = mode === "receipt" ? "sales" : "purchases";

  useEffect(() => {
    client.listAccounts().then(
      (r) => setAccounts(r.accounts),
      () => setAccounts([])
    );
  }, [client]);

  useEffect(() => {
    setParty(null);
    setAllocatable([]);
    setAllocs({});
  }, [mode]);

  useEffect(() => {
    if (!party) {
      setAllocatable([]);
      return;
    }
    client.listAllocatable(allocKind, party.id).then(
      (r) => setAllocatable(r.items),
      () => setAllocatable([])
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

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        id: accountKey(a),
        label: a.name,
        subtitle: `${a.subtitle ?? ""} · ${fmt(a.currentBalance)}`.trim(),
      })),
    [accounts]
  );

  const partyOptions = useMemo(
    () =>
      partyResults.map((p) => ({
        id: p.id,
        label: p.name,
        subtitle: p.subtitle ?? undefined,
      })),
    [partyResults]
  );

  const amountNum = Number(amount);
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;
  const dateOk = ISO.test(date);
  const allocTotal = Object.values(allocs).reduce(
    (s, v) => s + (Number(v) || 0),
    0
  );
  const allocOk = allocTotal <= amountNum + 0.01;
  const canSubmit =
    amountOk && dateOk && !!account && !!party && allocOk && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit || !account || !party) return;
    setSubmitting(true);
    try {
      const builtAllocs = Object.entries(allocs)
        .map(([id, val]) => ({ id, amt: Number(val) }))
        .filter((a) => a.amt > 0);
      if (mode === "receipt") {
        await client.createReceipt({
          customerId: party.id,
          receiptType: "customer_payment",
          receiptDate: date,
          amount: amountNum,
          accountKind: account.kind,
          accountId: account.id,
          note: note.trim() || undefined,
          saleAllocations: builtAllocs.map((a) => ({
            saleDetailId: a.id,
            allocatedAmount: a.amt,
          })),
        });
      } else {
        await client.createPayment({
          supplierId: party.id,
          paymentType: "supplier_payment",
          paymentDate: date,
          amount: amountNum,
          accountKind: account.kind,
          accountId: account.id,
          note: note.trim() || undefined,
          purchaseAllocations: builtAllocs.map((a) => ({
            purchaseDetailId: a.id,
            allocatedAmount: a.amt,
          })),
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
    account,
    party,
    allocs,
    mode,
    date,
    amountNum,
    note,
    client,
    router,
  ]);

  return (
    <AdminScreen
      keyboardAvoiding
      testID="finance-collect-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel={`Save ${mode === "receipt" ? "receipt" : "payment"}`}
          primaryIcon="save-outline"
          primaryTestID="finance-collect-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !party
              ? `Choose a ${partyType}.`
              : !account
                ? "Choose an account."
                : !amountOk
                  ? "Enter a positive amount."
                  : !dateOk
                    ? "Choose a date."
                    : !allocOk
                      ? "Allocated total exceeds the amount."
                      : submitting
                        ? "Saving…"
                        : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: "Receipt / Payment", headerShown: false }} />

      <AdminTopBar
        title="Record money"
        subtitle="Receipt / payment"
        onBackPress={() => router.back()}
        testID="finance-collect"
      />

      <AdminFormSection title="Type" testID="finance-collect-mode-section">
        <AdminSegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          testIDPrefix="finance-collect-mode"
          scrollable={false}
        />
      </AdminFormSection>

      <AdminFormSection title="Details" testID="finance-collect-details">
        <AdminFormField label={mode === "receipt" ? "Customer" : "Supplier"} required>
          <Pressable
            testID="finance-collect-party"
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

        <AdminFormField label="Amount (₹)" required error={!amountOk && amount.length > 0 ? "Enter a positive amount." : undefined}>
          <TextInput
            testID="finance-collect-amount"
            accessibilityLabel="Amount"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </AdminFormField>

        <AdminFormField label="Date" required>
          <DateField
            testID="finance-collect-date"
            accessibilityLabel="Date"
            style={styles.input}
            value={date}
            onChange={setDate}
            allowClear={false}
          />
        </AdminFormField>

        <AdminFormField label={mode === "receipt" ? "Into account" : "From account"} required>
          <Pressable
            testID="finance-collect-account"
            accessibilityRole="button"
            accessibilityLabel="Choose account"
            style={styles.pickerBtn}
            onPress={() => setAccountPickerOpen(true)}
          >
            <Text style={styles.pickerText} numberOfLines={1}>
              {account ? account.name : "Tap to choose"}
            </Text>
          </Pressable>
        </AdminFormField>

        <AdminFormField label="Note">
          <TextInput
            testID="finance-collect-note"
            accessibilityLabel="Note"
            style={[styles.input, styles.textarea]}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </AdminFormField>
      </AdminFormSection>

      {party && allocatable.length > 0 ? (
        <AdminFormSection
          title={`Allocate to open ${mode === "receipt" ? "invoices" : "bills"}`}
          testID="finance-collect-alloc"
        >
          <Text style={styles.help}>
            Optional. Allocated total must not exceed the amount ({fmt(allocTotal)} /{" "}
            {fmt(amountNum || 0)}).
          </Text>
          {allocatable.map((it) => (
            <View key={it.id} style={styles.allocRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.allocRef} numberOfLines={1}>
                  {it.reference}
                </Text>
                <Text style={styles.allocMeta}>
                  Due {fmt(it.balanceDue)}
                  {it.tourPackageQueryName ? ` · ${it.tourPackageQueryName}` : ""}
                </Text>
              </View>
              <TextInput
                testID={`finance-collect-alloc-${it.id}`}
                accessibilityLabel={`Allocate to ${it.reference}`}
                style={styles.allocInput}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                value={allocs[it.id] ?? ""}
                onChangeText={(t) => setAllocs((a) => ({ ...a, [it.id]: t }))}
              />
            </View>
          ))}
          {!allocOk ? (
            <Text style={styles.helpErr}>Allocated total exceeds the amount.</Text>
          ) : null}
        </AdminFormSection>
      ) : null}

      <AdminPickerSheet
        visible={accountPickerOpen}
        title="Choose account"
        options={accountOptions}
        selectedId={account ? accountKey(account) : null}
        onClose={() => setAccountPickerOpen(false)}
        onSelect={(opt) => {
          const found = accounts.find((a) => accountKey(a) === opt.id);
          if (found) setAccount(found);
        }}
        emptyLabel="No active accounts."
        testID="finance-collect-acct"
      />

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
            setAllocs({});
          }
        }}
        searchPlaceholder={`Search ${partyType}…`}
        emptyLabel="No matches."
        testID="finance-collect-party-sheet"
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  helpErr: { color: Colors.error, fontSize: FontSize.xs },
  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  allocRef: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  allocMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  allocInput: {
    width: 96,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: "right",
  },
});
