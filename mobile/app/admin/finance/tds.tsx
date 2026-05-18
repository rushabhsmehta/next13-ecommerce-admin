import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import {
  AdminBottomActionBar,
  AdminEmptyState,
  AdminErrorState,
  AdminFormField,
  AdminFormSection,
  AdminScreen,
  AdminSegmentedControl,
  AdminTopBar,
  AdminTopBarIconButton,
  AdminTopBarPrimaryButton,
} from "@/components/admin";
import { createFinanceClient } from "@/lib/finance";

type Tab = "tds" | "challans" | "credit-notes" | "supplier-credits";
const TABS: { id: Tab; label: string }[] = [
  { id: "tds", label: "TDS" },
  { id: "challans", label: "Challans" },
  { id: "credit-notes", label: "Credit notes" },
  { id: "supplier-credits", label: "Supplier credits" },
];

const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export default function FinanceTdsScreen() {
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

  const [tab, setTab] = useState<Tab>("tds");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [challanModal, setChallanModal] = useState(false);
  const [bsr, setBsr] = useState("");
  const [serial, setSerial] = useState("");
  const [bank, setBank] = useState("");
  const [challanSubmitting, setChallanSubmitting] = useState(false);
  const [depositing, setDepositing] = useState(false);

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      setError(null);
      try {
        if (t === "tds") {
          const r = await client.listTds();
          setRows(r.transactions);
        } else if (t === "challans") {
          const r = await client.listChallans();
          setRows(r.challans);
        } else if (t === "credit-notes") {
          const r = await client.listSaleReturns(true);
          setRows(r.saleReturns);
        } else {
          const r = await client.listPurchaseReturns(true);
          setRows(r.purchaseReturns);
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load data."
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const depositPending = useCallback(async () => {
    const pendingIds = rows
      .filter((r) => r && r.status === "pending" && r.id)
      .map((r) => r.id as string);
    if (pendingIds.length === 0) {
      Alert.alert(
        "Nothing to deposit",
        "There are no pending TDS transactions in the current list."
      );
      return;
    }
    Alert.alert(
      "Record TDS deposit",
      `Mark ${pendingIds.length} pending TDS transaction(s) as deposited under a challan dated today?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deposit",
          onPress: async () => {
            setDepositing(true);
            try {
              await client.depositTds({
                depositDate: new Date().toISOString().slice(0, 10),
                transactionIds: pendingIds,
              });
              void load("tds");
              Alert.alert("Deposit recorded", "TDS transactions marked deposited.");
            } catch (err) {
              Alert.alert(
                "Deposit failed",
                err instanceof ApiError ? err.message : "Please try again."
              );
            } finally {
              setDepositing(false);
            }
          },
        },
      ]
    );
  }, [rows, client, load]);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const createChallan = useCallback(async () => {
    setChallanSubmitting(true);
    try {
      await client.createChallan({
        bsrCode: bsr.trim() || null,
        challanSerialNo: serial.trim() || null,
        bankName: bank.trim() || null,
        depositDate: new Date().toISOString().slice(0, 10),
      });
      setChallanModal(false);
      setBsr("");
      setSerial("");
      setBank("");
      void load("challans");
    } catch (err) {
      Alert.alert(
        "Could not create challan",
        err instanceof ApiError ? err.message : "Please try again."
      );
    } finally {
      setChallanSubmitting(false);
    }
  }, [client, bsr, serial, bank, load]);

  function renderItem({ item }: { item: any }) {
    if (tab === "tds") {
      return (
        <View style={styles.row} testID={`tds-row-${item.id}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {item.tdsType} · {fmt(item.tdsAmount)}
            </Text>
            <Text style={styles.rowSub}>
              base {fmt(item.baseAmount)} @ {item.appliedRate}% ·{" "}
              {item.financialYear ?? "—"} {item.quarter ?? ""}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{item.status}</Text>
          </View>
        </View>
      );
    }
    if (tab === "challans") {
      return (
        <View style={styles.row} testID={`challan-row-${item.id}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {item.challanSerialNo || item.bsrCode || "Challan"}
            </Text>
            <Text style={styles.rowSub}>
              {fmtDate(item.depositDate)} · {item.transactions} txns ·{" "}
              {fmt(item.totalTds)}
            </Text>
          </View>
        </View>
      );
    }
    if (tab === "credit-notes") {
      return (
        <View style={styles.row} testID={`cn-row-${item.id}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {item.creditNoteNumber || item.reference || "Credit note"}
            </Text>
            <Text style={styles.rowSub}>
              {fmtDate(item.returnDate)} ·{" "}
              {item.creditType?.replace(/_/g, " ")} ·{" "}
              {item.saleDetail?.invoiceNumber ?? "—"}
            </Text>
          </View>
          <Text style={styles.amount}>
            {fmt(item.creditNoteAmount ?? item.amount)}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.row} testID={`sc-row-${item.id}`}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>
            {item.reference || "Supplier credit"}
          </Text>
          <Text style={styles.rowSub}>
            {fmtDate(item.returnDate)} ·{" "}
            {item.supplierCreditType?.replace(/_/g, " ")} ·{" "}
            {item.purchaseDetail?.billNumber ?? "—"}
          </Text>
        </View>
        <Text style={styles.amount}>{fmt(item.amount)}</Text>
      </View>
    );
  }

  return (
    <AdminScreen scroll={false} testID="finance-tds-screen">
      <Stack.Screen options={{ title: "TDS & Credits", headerShown: false }} />

      <AdminTopBar
        title="TDS & Credits"
        onBackPress={() => router.back()}
        testID="finance-tds-header"
        rightSlot={
          <>
            {tab === "tds" ? (
              depositing ? (
                <View style={styles.headerSpinner}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                <AdminTopBarIconButton
                  icon="cloud-upload-outline"
                  label="Record TDS deposit for pending transactions"
                  testID="tds-deposit"
                  onPress={() => void depositPending()}
                />
              )
            ) : null}
            {tab === "challans" ? (
              <AdminTopBarPrimaryButton
                label="New"
                icon="add"
                testID="tds-new-challan"
                onPress={() => setChallanModal(true)}
              />
            ) : null}
          </>
        }
      />

      <AdminSegmentedControl
        options={TABS}
        value={tab}
        onChange={setTab}
        testIDPrefix="tds-tab"
      />

      {error ? (
        <AdminErrorState
          message={error}
          onRetry={() => void load(tab)}
          testID="finance-tds-error"
        />
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r, idx) => `${tab}-${r?.id ?? idx}`}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={styles.listLoader}
            />
          ) : (
            <AdminEmptyState
              icon="document-text-outline"
              title="Nothing here yet"
              testID="finance-tds-empty"
            />
          )
        }
        renderItem={renderItem}
      />

      <Modal
        visible={challanModal}
        animationType="slide"
        onRequestClose={() => setChallanModal(false)}
      >
        <AdminScreen
          keyboardAvoiding
          testID="tds-challan-screen"
          footer={
            <AdminBottomActionBar
              primaryLabel="Create challan"
              primaryIcon="save-outline"
              primaryTestID="tds-challan-submit"
              primaryDisabled={challanSubmitting}
              disabledReason={challanSubmitting ? "Saving…" : undefined}
              onPrimaryPress={createChallan}
            >
              {challanSubmitting ? (
                <ActivityIndicator color={Colors.primary} />
              ) : null}
            </AdminBottomActionBar>
          }
        >
          <AdminTopBar
            title="New TDS challan"
            onBackPress={() => setChallanModal(false)}
            testID="tds-challan-header"
          />

          <AdminFormSection
            title="Challan details"
            description="Records a challan dated today. Linking specific TDS transactions and the government deposit (bank movement) stays on the web."
            testID="tds-challan-section"
          >
            <AdminFormField label="BSR code">
              <TextInput
                testID="tds-challan-bsr"
                accessibilityLabel="BSR code"
                style={styles.input}
                value={bsr}
                onChangeText={setBsr}
                placeholder="Optional"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
            <AdminFormField label="Challan serial no.">
              <TextInput
                testID="tds-challan-serial"
                accessibilityLabel="Challan serial number"
                style={styles.input}
                value={serial}
                onChangeText={setSerial}
                placeholder="Optional"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
            <AdminFormField label="Bank name">
              <TextInput
                testID="tds-challan-bank"
                accessibilityLabel="Bank name"
                style={styles.input}
                value={bank}
                onChangeText={setBank}
                placeholder="Optional"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
          </AdminFormSection>
        </AdminScreen>
      </Modal>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  listLoader: { marginTop: Spacing.xxl },
  headerSpinner: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowTitle: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  pillText: { fontSize: 10, fontWeight: "800", color: Colors.textSecondary },
  amount: { fontSize: FontSize.md, fontWeight: "900", color: Colors.text },
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
});
