import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
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
import { createFinanceClient, type FinanceAccount } from "@/lib/finance";

type Kind = "transfer" | "expense" | "income";

const KIND_OPTIONS: { id: Kind; label: string }[] = [
  { id: "transfer", label: "Transfer" },
  { id: "expense", label: "Expense" },
  { id: "income", label: "Income" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function accountKey(a: FinanceAccount): string {
  return `${a.kind}-${a.id}`;
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

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        id: accountKey(a),
        label: a.name,
        subtitle: `${a.subtitle ?? ""} · ₹${Math.round(a.currentBalance).toLocaleString("en-IN")}`.trim(),
      })),
    [accounts]
  );

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

  function pickAccount(optId: string) {
    const found = accounts.find((a) => accountKey(a) === optId);
    if (!found) return;
    if (picker === "account") setAccount(found);
    else if (picker === "from") setFromAccount(found);
    else if (picker === "to") setToAccount(found);
  }

  const selectedPickerId =
    picker === "account"
      ? account
        ? accountKey(account)
        : null
      : picker === "from"
        ? fromAccount
          ? accountKey(fromAccount)
          : null
        : picker === "to"
          ? toAccount
            ? accountKey(toAccount)
            : null
          : null;

  return (
    <AdminScreen
      keyboardAvoiding
      testID="finance-record-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel="Save"
          primaryIcon="save-outline"
          primaryTestID="finance-record-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !amountOk
              ? "Enter a positive amount."
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
      <Stack.Screen options={{ title: "Record", headerShown: false }} />

      <AdminTopBar
        title="Record transaction"
        subtitle="Transfer, expense, or income"
        onBackPress={() => router.back()}
        testID="finance-record"
      />

      <AdminFormSection title="Type" testID="finance-record-kind-section">
        <AdminSegmentedControl
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          testIDPrefix="finance-record-kind"
          scrollable={false}
        />
      </AdminFormSection>

      <AdminFormSection title="Details" testID="finance-record-details">
        <AdminFormField label="Amount (₹)" required error={!amountOk && amount.length > 0 ? "Enter a positive amount." : undefined}>
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
        </AdminFormField>

        <AdminFormField label="Date" required>
          <DateField
            testID="finance-record-date"
            accessibilityLabel="Date"
            style={styles.input}
            value={date}
            onChange={setDate}
            allowClear={false}
          />
        </AdminFormField>

        {kind === "transfer" ? (
          <>
            <AdminFormField label="From account" required>
              <AccountButton
                account={fromAccount}
                onPress={() => setPicker("from")}
                testID="finance-record-from"
              />
            </AdminFormField>
            <AdminFormField label="To account" required>
              <AccountButton
                account={toAccount}
                onPress={() => setPicker("to")}
                testID="finance-record-to"
              />
            </AdminFormField>
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
              <AdminFormField label="Paid from account" required>
                <AccountButton
                  account={account}
                  onPress={() => setPicker("account")}
                  testID="finance-record-account"
                />
              </AdminFormField>
            ) : null}
          </>
        ) : null}

        {kind === "income" ? (
          <AdminFormField label="Received in account" required>
            <AccountButton
              account={account}
              onPress={() => setPicker("account")}
              testID="finance-record-account"
            />
          </AdminFormField>
        ) : null}

        <AdminFormField label="Description">
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
        </AdminFormField>
      </AdminFormSection>

      <AdminPickerSheet
        visible={picker !== null}
        title="Choose account"
        options={accountOptions}
        selectedId={selectedPickerId}
        loading={!accountsLoaded}
        onClose={() => setPicker(null)}
        onSelect={(opt) => pickAccount(opt.id)}
        emptyLabel="No active accounts."
        testID="finance-record-acct"
      />
    </AdminScreen>
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
    </Pressable>
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  pickerBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  pickerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  accruedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  accruedText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
});
