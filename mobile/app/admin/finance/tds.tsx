import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
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

  const depositPending = useCallback(async () => {
    // Deposit = the web tds/deposit flow: dated challan + mark the loaded
    // pending TDS transactions deposited. No bank/cash movement (mirrors web).
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "TDS & Credits", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>TDS & Credits</Text>
        {tab === "tds" ? (
          <Pressable
            testID="tds-deposit"
            accessibilityRole="button"
            accessibilityLabel="Record TDS deposit for pending transactions"
            style={[styles.newBtn, depositing ? { opacity: 0.5 } : null]}
            disabled={depositing}
            onPress={() => void depositPending()}
          >
            {depositing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            )}
          </Pressable>
        ) : null}
        {tab === "challans" ? (
          <Pressable
            testID="tds-new-challan"
            accessibilityRole="button"
            accessibilityLabel="New challan"
            style={styles.newBtn}
            onPress={() => setChallanModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`tds-tab-${t.id}`}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              style={[styles.tab, active ? styles.tabActive : null]}
              onPress={() => setTab(t.id)}
            >
              <Text
                style={[styles.tabText, active ? styles.tabTextActive : null]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 24,
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginTop: Spacing.xxl }}
            />
          ) : (
            <Text style={styles.muted}>Nothing here yet.</Text>
          )
        }
        renderItem={renderItem}
      />

      <Modal
        visible={challanModal}
        animationType="slide"
        onRequestClose={() => setChallanModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>New TDS challan</Text>
            <Pressable
              testID="tds-challan-close"
              accessibilityLabel="Close"
              onPress={() => setChallanModal(false)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <View style={{ padding: Spacing.lg }}>
            <Text style={styles.label}>BSR code</Text>
            <TextInput
              testID="tds-challan-bsr"
              style={styles.input}
              value={bsr}
              onChangeText={setBsr}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.label}>Challan serial no.</Text>
            <TextInput
              testID="tds-challan-serial"
              style={styles.input}
              value={serial}
              onChangeText={setSerial}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.label}>Bank name</Text>
            <TextInput
              testID="tds-challan-bank"
              style={styles.input}
              value={bank}
              onChangeText={setBank}
              placeholder="Optional"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.help}>
              Records a challan dated today. Linking specific TDS transactions
              and the government deposit (bank movement) stays on the web.
            </Text>
            <Pressable
              testID="tds-challan-submit"
              accessibilityRole="button"
              accessibilityLabel="Create challan"
              disabled={challanSubmitting}
              style={[
                styles.submit,
                challanSubmitting ? styles.submitDisabled : null,
              ]}
              onPress={createChallan}
            >
              {challanSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Create challan</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tabActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  tabText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  errorCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  muted: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.xxl,
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  modalClose: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
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
  help: {
    color: Colors.textTertiary,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
});
