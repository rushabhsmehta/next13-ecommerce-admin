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
  type FinanceParty,
  type AllocatableItem,
} from "@/lib/finance";

type Mode = "sale" | "purchase";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FinanceReturnScreen() {
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

  const [picker, setPicker] = useState<null | "party" | "doc">(null);
  const [partySearch, setPartySearch] = useState("");
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
    if (picker !== "party") return;
    const t = setTimeout(() => void loadParties(partySearch.trim()), 250);
    return () => clearTimeout(t);
  }, [picker, partySearch, loadParties]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Return", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="finance-return-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Record return</Text>
      </View>

      <View style={styles.modeRow}>
        {(["sale", "purchase"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              testID={`finance-return-mode-${m}`}
              accessibilityRole="button"
              accessibilityLabel={m === "sale" ? "Sale return" : "Purchase return"}
              style={[styles.modeChip, active ? styles.modeChipActive : null]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[styles.modeText, active ? styles.modeTextActive : null]}
              >
                {m === "sale" ? "Sale return" : "Purchase return"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          {mode === "sale" ? "Customer *" : "Supplier *"}
        </Text>
        <Pressable
          testID="finance-return-party"
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

        <Text style={styles.label}>
          {mode === "sale" ? "Against invoice *" : "Against bill *"}
        </Text>
        <Pressable
          testID="finance-return-doc"
          accessibilityRole="button"
          accessibilityLabel="Choose source document"
          style={styles.pickerBtn}
          disabled={!party}
          onPress={() => setPicker("doc")}
        >
          <Text style={styles.pickerText} numberOfLines={1}>
            {doc
              ? `${doc.reference} · due ₹${Math.round(
                  doc.balanceDue
                ).toLocaleString("en-IN")}`
              : party
              ? "Tap to choose"
              : "Choose a party first"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Pressable>

        <Text style={styles.label}>Return amount (₹) *</Text>
        <TextInput
          testID="finance-return-amount"
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>GST amount (optional)</Text>
        <TextInput
          testID="finance-return-gst"
          style={styles.input}
          value={gst}
          onChangeText={setGst}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>
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
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}
                >
                  {ct.replace(/_/g, " ")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Reference</Text>
        <TextInput
          testID="finance-return-reference"
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>Reason</Text>
        <TextInput
          testID="finance-return-reason"
          style={[styles.input, styles.textarea]}
          value={reason}
          onChangeText={setReason}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="finance-return-submit"
          accessibilityRole="button"
          accessibilityLabel="Save return"
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit ? styles.submitDisabled : null]}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.submitText}>Save return</Text>
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
              {picker === "party"
                ? `Choose ${partyType}`
                : mode === "sale"
                ? "Choose invoice"
                : "Choose bill"}
            </Text>
            <Pressable
              testID="finance-return-picker-close"
              accessibilityLabel="Close picker"
              onPress={() => setPicker(null)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>

          {picker === "party" ? (
            <>
              <TextInput
                style={styles.modalSearch}
                value={partySearch}
                onChangeText={setPartySearch}
                placeholder={`Search ${partyType}…`}
                placeholderTextColor={Colors.textTertiary}
              />
              {partyLoading ? (
                <ActivityIndicator
                  style={{ marginTop: 24 }}
                  color={Colors.primary}
                />
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
                      testID={`finance-return-party-${item.id}`}
                      style={styles.modalRow}
                      onPress={() => {
                        setParty(item);
                        setDoc(null);
                        setPicker(null);
                      }}
                    >
                      <Text style={styles.modalName}>{item.name}</Text>
                    </Pressable>
                  )}
                />
              )}
            </>
          ) : (
            <FlatList
              data={docs}
              keyExtractor={(d) => d.id}
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>
                  No documents for this party.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`finance-return-doc-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setDoc(item);
                    setPicker(null);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.reference}</Text>
                    <Text style={styles.modalSub}>
                      Due ₹
                      {Math.round(item.balanceDue).toLocaleString("en-IN")}
                      {item.tourPackageQueryName
                        ? ` · ${item.tourPackageQueryName}`
                        : ""}
                    </Text>
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
    alignItems: "center",
    justifyContent: "center",
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
  chipRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs },
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
