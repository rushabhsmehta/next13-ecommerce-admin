import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { OfflineGate } from "@/components/auth/PermissionGate";
import {
  createFinanceClient,
  type FinanceAccount,
  type FinanceParty,
  type AllocatableItem,
} from "@/lib/finance";

type Mode = "receipt" | "payment";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function FinanceCollectScreen() {
  return (
    <OfflineGate policy="online_only">
      <Inner />
    </OfflineGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const [picker, setPicker] = useState<null | "account" | "party">(null);
  const [partySearch, setPartySearch] = useState("");
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

  // Reset party/allocations when the mode flips.
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
    if (picker !== "party") return;
    const t = setTimeout(() => void loadParties(partySearch.trim()), 250);
    return () => clearTimeout(t);
  }, [picker, partySearch, loadParties]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{ title: "Receipt / Payment", headerShown: false }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="finance-collect-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Record money</Text>
      </View>

      <View style={styles.modeRow}>
        {(["receipt", "payment"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              testID={`finance-collect-mode-${m}`}
              accessibilityRole="button"
              accessibilityLabel={m === "receipt" ? "Receipt" : "Payment"}
              style={[styles.modeChip, active ? styles.modeChipActive : null]}
              onPress={() => setMode(m)}
            >
              <Ionicons
                name={
                  m === "receipt"
                    ? "arrow-down-circle-outline"
                    : "arrow-up-circle-outline"
                }
                size={16}
                color={active ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeText,
                  active ? styles.modeTextActive : null,
                ]}
              >
                {m === "receipt" ? "Receipt (in)" : "Payment (out)"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          {mode === "receipt" ? "Customer *" : "Supplier *"}
        </Text>
        <Pressable
          testID="finance-collect-party"
          accessibilityRole="button"
          accessibilityLabel="Choose party"
          style={styles.pickerBtn}
          onPress={() => {
            setPicker("party");
            setPartySearch("");
            void loadParties("");
          }}
        >
          <Text style={styles.pickerText} numberOfLines={1}>
            {party ? party.name : "Tap to choose"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Pressable>

        <Text style={styles.label}>Amount (₹) *</Text>
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
        {!amountOk && amount.length > 0 ? (
          <Text style={styles.helpErr}>Enter a positive amount.</Text>
        ) : null}

        <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
        <TextInput
          testID="finance-collect-date"
          accessibilityLabel="Date"
          style={styles.input}
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!dateOk ? <Text style={styles.helpErr}>Use YYYY-MM-DD.</Text> : null}

        <Text style={styles.label}>
          {mode === "receipt" ? "Into account *" : "From account *"}
        </Text>
        <Pressable
          testID="finance-collect-account"
          accessibilityRole="button"
          accessibilityLabel="Choose account"
          style={styles.pickerBtn}
          onPress={() => setPicker("account")}
        >
          <Text style={styles.pickerText} numberOfLines={1}>
            {account ? account.name : "Tap to choose"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Pressable>

        {party && allocatable.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              Allocate to open {mode === "receipt" ? "invoices" : "bills"}
            </Text>
            <Text style={styles.help}>
              Optional. Allocated total must not exceed the amount
              ({fmt(allocTotal)} / {fmt(amountNum || 0)}).
            </Text>
            {allocatable.map((it) => (
              <View key={it.id} style={styles.allocRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allocRef} numberOfLines={1}>
                    {it.reference}
                  </Text>
                  <Text style={styles.allocMeta}>
                    Due {fmt(it.balanceDue)}
                    {it.tourPackageQueryName
                      ? ` · ${it.tourPackageQueryName}`
                      : ""}
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
                  onChangeText={(t) =>
                    setAllocs((a) => ({ ...a, [it.id]: t }))
                  }
                />
              </View>
            ))}
            {!allocOk ? (
              <Text style={styles.helpErr}>
                Allocated total exceeds the amount.
              </Text>
            ) : null}
          </>
        ) : null}

        <Text style={styles.label}>Note</Text>
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="finance-collect-submit"
          accessibilityRole="button"
          accessibilityLabel="Save"
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit ? styles.submitDisabled : null]}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>
                Save {mode === "receipt" ? "receipt" : "payment"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={picker !== null}
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>
              {picker === "account" ? "Choose account" : `Choose ${partyType}`}
            </Text>
            <Pressable
              testID="finance-collect-picker-close"
              accessibilityLabel="Close picker"
              onPress={() => setPicker(null)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>

          {picker === "party" ? (
            <TextInput
              style={styles.modalSearch}
              value={partySearch}
              onChangeText={setPartySearch}
              placeholder={`Search ${partyType}…`}
              placeholderTextColor={Colors.textTertiary}
            />
          ) : null}

          {picker === "account" ? (
            <FlatList
              data={accounts}
              keyExtractor={(a) => `${a.kind}-${a.id}`}
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>
                  No active accounts.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`finance-collect-acct-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setAccount(item);
                    setPicker(null);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalSub}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.modalSub}>
                    {fmt(item.currentBalance)}
                  </Text>
                </Pressable>
              )}
            />
          ) : partyLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
            <FlatList
              data={partyResults}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>
                  No matches.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`finance-collect-party-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setParty(item);
                    setAllocs({});
                    setPicker(null);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    {item.subtitle ? (
                      <Text style={styles.modalSub}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  modeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modeChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  modeText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  modeTextActive: { color: Colors.primary },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerText: { flex: 1, fontSize: FontSize.md, color: Colors.text, marginRight: 8 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginTop: Spacing.xl,
  },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  allocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginTop: Spacing.sm,
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
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  modalClose: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  modalSearch: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  modalName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  modalSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
