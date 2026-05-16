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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { OfflineGate } from "@/components/auth/PermissionGate";
import { createFinanceClient, type FinanceAccount } from "@/lib/finance";

type Kind = "transfer" | "expense" | "income";

const KINDS: { id: Kind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "transfer", label: "Transfer", icon: "swap-horizontal-outline" },
  { id: "expense", label: "Expense", icon: "wallet-outline" },
  { id: "income", label: "Income", icon: "trending-up-outline" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FinanceRecordScreen() {
  return (
    <OfflineGate policy="online_only">
      <Inner />
    </OfflineGate>
  );
}

function Inner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFinanceClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [kind, setKind] = useState<Kind>("expense");
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [isAccrued, setIsAccrued] = useState(false);
  const [account, setAccount] = useState<FinanceAccount | null>(null);
  const [fromAccount, setFromAccount] = useState<FinanceAccount | null>(null);
  const [toAccount, setToAccount] = useState<FinanceAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [picker, setPicker] = useState<null | "account" | "from" | "to">(null);

  useEffect(() => {
    let cancelled = false;
    client
      .listAccounts()
      .then((r) => {
        if (!cancelled) {
          setAccounts(r.accounts);
          setAccountsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setAccountsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const amountNum = Number(amount);
  const amountOk = Number.isFinite(amountNum) && amountNum > 0;
  const dateOk = ISO.test(date);

  const canSubmit = (() => {
    if (!amountOk || !dateOk || submitting) return false;
    if (kind === "transfer")
      return (
        !!fromAccount &&
        !!toAccount &&
        !(fromAccount.kind === toAccount.kind && fromAccount.id === toAccount.id)
      );
    if (kind === "income") return !!account;
    // expense
    return isAccrued || !!account;
  })();

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (kind === "transfer" && fromAccount && toAccount) {
        await client.createTransfer({
          from: { kind: fromAccount.kind, id: fromAccount.id },
          to: { kind: toAccount.kind, id: toAccount.id },
          amount: amountNum,
          transferDate: date,
          description: description.trim() || undefined,
        });
      } else if (kind === "expense") {
        await client.createExpense({
          amount: amountNum,
          expenseDate: date,
          description: description.trim() || undefined,
          isAccrued,
          accountKind: isAccrued ? undefined : account?.kind,
          accountId: isAccrued ? undefined : account?.id,
        });
      } else {
        await client.createIncome({
          amount: amountNum,
          incomeDate: date,
          description: description.trim() || undefined,
          accountKind: account!.kind,
          accountId: account!.id,
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
    kind,
    fromAccount,
    toAccount,
    account,
    amountNum,
    date,
    description,
    isAccrued,
    client,
    router,
  ]);

  function pick(a: FinanceAccount) {
    if (picker === "account") setAccount(a);
    else if (picker === "from") setFromAccount(a);
    else if (picker === "to") setToAccount(a);
    setPicker(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Record", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="finance-record-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Record transaction</Text>
      </View>

      <View style={styles.kindRow}>
        {KINDS.map((k) => {
          const active = kind === k.id;
          return (
            <Pressable
              key={k.id}
              testID={`finance-record-kind-${k.id}`}
              accessibilityRole="button"
              accessibilityLabel={k.label}
              style={[styles.kindChip, active ? styles.kindChipActive : null]}
              onPress={() => setKind(k.id)}
            >
              <Ionicons
                name={k.icon}
                size={15}
                color={active ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.kindText,
                  active ? styles.kindTextActive : null,
                ]}
              >
                {k.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Amount (₹) *</Text>
        <TextInput
          testID="finance-record-amount"
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
          testID="finance-record-date"
          accessibilityLabel="Date"
          style={styles.input}
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!dateOk ? (
          <Text style={styles.helpErr}>Use YYYY-MM-DD.</Text>
        ) : null}

        {kind === "transfer" ? (
          <>
            <Text style={styles.label}>From account *</Text>
            <AccountButton
              account={fromAccount}
              onPress={() => setPicker("from")}
              testID="finance-record-from"
            />
            <Text style={styles.label}>To account *</Text>
            <AccountButton
              account={toAccount}
              onPress={() => setPicker("to")}
              testID="finance-record-to"
            />
          </>
        ) : null}

        {kind === "expense" ? (
          <>
            <Pressable
              testID="finance-record-accrued"
              accessibilityRole="button"
              accessibilityLabel="Toggle accrued expense"
              style={styles.accruedRow}
              onPress={() => setIsAccrued((v) => !v)}
            >
              <Ionicons
                name={isAccrued ? "checkbox" : "square-outline"}
                size={20}
                color={isAccrued ? Colors.primary : Colors.textSecondary}
              />
              <Text style={styles.accruedText}>
                Accrued (pay later — no account movement now)
              </Text>
            </Pressable>
            {!isAccrued ? (
              <>
                <Text style={styles.label}>Paid from account *</Text>
                <AccountButton
                  account={account}
                  onPress={() => setPicker("account")}
                  testID="finance-record-account"
                />
              </>
            ) : null}
          </>
        ) : null}

        {kind === "income" ? (
          <>
            <Text style={styles.label}>Received in account *</Text>
            <AccountButton
              account={account}
              onPress={() => setPicker("account")}
              testID="finance-record-account"
            />
          </>
        ) : null}

        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="finance-record-description"
          accessibilityLabel="Description"
          style={[styles.input, styles.textarea]}
          placeholder="Optional note"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="finance-record-submit"
          accessibilityRole="button"
          accessibilityLabel="Save transaction"
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit ? styles.submitDisabled : null]}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>Save</Text>
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
            <Text style={styles.modalTitle}>Choose account</Text>
            <Pressable
              testID="finance-record-picker-close"
              accessibilityLabel="Close account picker"
              onPress={() => setPicker(null)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          {!accountsLoaded ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
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
                  testID={`finance-record-acct-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => pick(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalSub}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.modalBal}>
                    ₹{Math.round(item.currentBalance).toLocaleString("en-IN")}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function AccountButton({
  account,
  onPress,
  testID,
}: {
  account: FinanceAccount | null;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Select account"
      style={styles.pickerBtn}
      onPress={onPress}
    >
      <Text style={styles.pickerText} numberOfLines={1}>
        {account ? account.name : "Tap to choose"}
      </Text>
      <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
    </Pressable>
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
  kindRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  kindChip: {
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
  kindChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  kindText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  kindTextActive: { color: Colors.primary },
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
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
  accruedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  accruedText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
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
  modalBal: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
});
