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
import { createFinanceClient, type FinanceParty } from "@/lib/finance";

type Mode = "sale" | "purchase";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayIso = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function FinanceInvoiceScreen() {
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
  const [docNumber, setDocNumber] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [gstPct, setGstPct] = useState("");
  const [isGst, setIsGst] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [picker, setPicker] = useState(false);
  const [partySearch, setPartySearch] = useState("");
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
    if (!picker) return;
    const t = setTimeout(() => void loadParties(partySearch.trim()), 250);
    return () => clearTimeout(t);
  }, [picker, partySearch, loadParties]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Sale / Purchase", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="finance-invoice-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Record sale / purchase</Text>
      </View>

      <View style={styles.modeRow}>
        {(["sale", "purchase"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              testID={`finance-invoice-mode-${m}`}
              accessibilityRole="button"
              accessibilityLabel={m === "sale" ? "Sale" : "Purchase"}
              style={[styles.modeChip, active ? styles.modeChipActive : null]}
              onPress={() => setMode(m)}
            >
              <Ionicons
                name={m === "sale" ? "receipt-outline" : "cart-outline"}
                size={16}
                color={active ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[styles.modeText, active ? styles.modeTextActive : null]}
              >
                {m === "sale" ? "Sale (invoice)" : "Purchase (bill)"}
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
          testID="finance-invoice-party"
          accessibilityRole="button"
          accessibilityLabel="Choose party"
          style={styles.pickerBtn}
          onPress={() => {
            setPicker(true);
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
          {mode === "sale" ? "Invoice number" : "Bill number"}
        </Text>
        <TextInput
          testID="finance-invoice-number"
          style={styles.input}
          value={docNumber}
          onChangeText={setDocNumber}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Base amount (₹) *</Text>
        <TextInput
          testID="finance-invoice-amount"
          style={styles.input}
          value={baseAmount}
          onChangeText={setBaseAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
        />

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
          <>
            <Text style={styles.label}>GST %</Text>
            <TextInput
              testID="finance-invoice-gstpct"
              style={styles.input}
              value={gstPct}
              onChangeText={setGstPct}
              keyboardType="decimal-pad"
              placeholder="e.g. 5"
              placeholderTextColor={Colors.textTertiary}
            />
          </>
        ) : null}

        <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
        <TextInput
          testID="finance-invoice-date"
          style={styles.input}
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!dateOk ? <Text style={styles.helpErr}>Use YYYY-MM-DD.</Text> : null}

        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="finance-invoice-description"
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />

        <View style={styles.totalCard}>
          <Text style={styles.totalRow}>
            Base: ₹{baseOk ? base.toLocaleString("en-IN") : "0"}
          </Text>
          {isGst ? (
            <Text style={styles.totalRow}>
              GST: ₹{gstAmount.toLocaleString("en-IN")}
            </Text>
          ) : null}
          <Text style={styles.totalValue}>
            Total: ₹{total.toLocaleString("en-IN")}
          </Text>
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
                  : ` · CGST ₹${serverTax.cgst.toLocaleString(
                      "en-IN"
                    )} · SGST ₹${serverTax.sgst.toLocaleString("en-IN")}`}
              </Text>
              <Text style={styles.serverLine}>
                Server total ₹{serverTax.total.toLocaleString("en-IN")}
                {Math.abs(serverTax.total - total) > 0.5
                  ? " — differs from local!"
                  : " ✓ matches"}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="finance-invoice-submit"
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
                Save {mode === "sale" ? "sale" : "purchase"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={picker}
        animationType="slide"
        onRequestClose={() => setPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Choose {partyType}</Text>
            <Pressable
              testID="finance-invoice-picker-close"
              accessibilityLabel="Close picker"
              onPress={() => setPicker(false)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={partySearch}
            onChangeText={setPartySearch}
            placeholder={`Search ${partyType}…`}
            placeholderTextColor={Colors.textTertiary}
          />
          {partyLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
            <FlatList
              data={partyResults}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>No matches.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`finance-invoice-party-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setParty(item);
                    setPicker(false);
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  toggleText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  totalCard: {
    marginTop: Spacing.lg,
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
