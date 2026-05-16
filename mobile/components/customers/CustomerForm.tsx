import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createCustomersClient,
  type CustomerInput,
  type CustomerRecord,
} from "@/lib/customers";
import {
  fetchAssociatePartners,
  type AssociatePartnerOption,
} from "@/lib/associate-partners";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface InitialValues {
  name: string;
  contact: string;
  email: string;
  associatePartnerId: string | null;
  associatePartnerName: string | null;
  birthdate: string;
  marriageAnniversary: string;
}

const EMPTY: InitialValues = {
  name: "",
  contact: "",
  email: "",
  associatePartnerId: null,
  associatePartnerName: null,
  birthdate: "",
  marriageAnniversary: "",
};

interface Props {
  mode: "create" | "edit";
  customerId?: string;
  initial?: InitialValues;
  /** Header title; defaults to "New customer" / "Edit customer". */
  title?: string;
}

/**
 * Shared customer form used by /admin/customers/new and
 * /admin/customers/[id]/edit. CRM module offlinePolicy is `draft_only` —
 * we do not flag `requireOnline` on the underlying client; instead the
 * mobile API client surfaces a clear error if the device cannot reach
 * the server, and screens render the error inline.
 */
export function CustomerForm({ mode, customerId, initial, title }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createCustomersClient(authRequest), [authRequest]);

  const seed = initial ?? EMPTY;
  const [name, setName] = useState(seed.name);
  const [contact, setContact] = useState(seed.contact);
  const [email, setEmail] = useState(seed.email);
  const [associatePartnerId, setAssociatePartnerId] = useState<string | null>(
    seed.associatePartnerId
  );
  const [associatePartnerName, setAssociatePartnerName] = useState<string | null>(
    seed.associatePartnerName
  );
  const [birthdate, setBirthdate] = useState(seed.birthdate);
  const [marriageAnniversary, setMarriageAnniversary] = useState(
    seed.marriageAnniversary
  );
  const [submitting, setSubmitting] = useState(false);

  const [partnerModal, setPartnerModal] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerList, setPartnerList] = useState<AssociatePartnerOption[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);

  const birthdateOk = !birthdate || ISO_DATE.test(birthdate);
  const anniversaryOk = !marriageAnniversary || ISO_DATE.test(marriageAnniversary);
  const canSubmit =
    name.trim().length > 0 && birthdateOk && anniversaryOk && !submitting;

  async function openPartnerModal() {
    setPartnerModal(true);
    setPartnerSearch("");
    setPartnerLoading(true);
    try {
      const rows = await fetchAssociatePartners(authRequest, { activeOnly: true });
      setPartnerList(rows);
    } catch {
      setPartnerList([]);
      Alert.alert(
        "Partners",
        "Could not load associate partners. You may need admin access."
      );
    } finally {
      setPartnerLoading(false);
    }
  }

  const filteredPartners = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    if (!q) return partnerList;
    return partnerList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.gmail ?? "").toLowerCase().includes(q)
    );
  }, [partnerList, partnerSearch]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: CustomerInput = {
        name: name.trim(),
        contact: contact.trim() || null,
        email: email.trim() || null,
        associatePartnerId: associatePartnerId,
        birthdate: birthdate || null,
        marriageAnniversary: marriageAnniversary || null,
      };
      let saved: CustomerRecord;
      if (mode === "create") {
        saved = await client.create(payload);
      } else if (customerId) {
        saved = await client.update(customerId, payload);
      } else {
        throw new Error("Missing customer id for edit mode");
      }
      if (mode === "create") {
        router.replace(`/admin/customers/${saved.id}` as never);
      } else {
        router.back();
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the customer.`;
      Alert.alert("Save failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: title ?? (mode === "create" ? "New customer" : "Edit customer"),
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="customer-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {title ?? (mode === "create" ? "New customer" : "Edit customer")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Full name *</Text>
        <TextInput
          testID="customer-form-name"
          accessibilityLabel="Customer name"
          style={styles.input}
          placeholder="e.g. Ravi Sharma"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={200}
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          testID="customer-form-contact"
          accessibilityLabel="Mobile number"
          style={styles.input}
          placeholder="+91 9XXXXXXXXX"
          placeholderTextColor={Colors.textTertiary}
          value={contact}
          onChangeText={setContact}
          keyboardType="phone-pad"
          autoCorrect={false}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="customer-form-email"
          accessibilityLabel="Email"
          style={styles.input}
          placeholder="customer@example.com"
          placeholderTextColor={Colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Associate partner</Text>
        <Pressable
          testID="customer-form-partner-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose associate partner"
          style={styles.pickerBtn}
          onPress={() => void openPartnerModal()}
        >
          <Text style={styles.pickerText} numberOfLines={2}>
            {associatePartnerName ?? "Optional — direct customer"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </Pressable>
        {associatePartnerId ? (
          <Pressable
            testID="customer-form-partner-clear"
            accessibilityRole="button"
            accessibilityLabel="Clear associate partner"
            onPress={() => {
              setAssociatePartnerId(null);
              setAssociatePartnerName(null);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>Clear partner</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Birthdate</Text>
        <TextInput
          testID="customer-form-birthdate"
          accessibilityLabel="Birthdate YYYY-MM-DD"
          style={styles.input}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={birthdate}
          onChangeText={setBirthdate}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!birthdateOk ? (
          <Text style={styles.helpError}>Use the format YYYY-MM-DD.</Text>
        ) : null}

        <Text style={styles.label}>Marriage anniversary</Text>
        <TextInput
          testID="customer-form-anniversary"
          accessibilityLabel="Marriage anniversary YYYY-MM-DD"
          style={styles.input}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={marriageAnniversary}
          onChangeText={setMarriageAnniversary}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!anniversaryOk ? (
          <Text style={styles.helpError}>Use the format YYYY-MM-DD.</Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="customer-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create customer" : "Save changes"}
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
                {mode === "create" ? "Create customer" : "Save changes"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={partnerModal}
        animationType="slide"
        onRequestClose={() => setPartnerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.modalTitle}>Choose associate partner</Text>
            <Pressable
              testID="customer-form-partner-modal-close"
              accessibilityRole="button"
              accessibilityLabel="Close partner picker"
              onPress={() => setPartnerModal(false)}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={partnerSearch}
            onChangeText={setPartnerSearch}
            placeholder="Search name or email…"
            placeholderTextColor={Colors.textTertiary}
          />
          {partnerLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={filteredPartners}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.help, { padding: 16 }]}>No partners found.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`customer-form-partner-option-${item.id}`}
                  style={styles.modalRow}
                  onPress={() => {
                    setAssociatePartnerId(item.id);
                    setAssociatePartnerName(item.name);
                    setPartnerModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalEmail}>
                      {item.email ?? item.gmail ?? item.mobileNumber}
                    </Text>
                  </View>
                  {associatePartnerId === item.id ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  ) : null}
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
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
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
    marginTop: 4,
  },
  pickerText: { flex: 1, fontSize: FontSize.md, color: Colors.text, marginRight: 8 },
  clearBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  clearText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpError: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
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
  modalEmail: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
