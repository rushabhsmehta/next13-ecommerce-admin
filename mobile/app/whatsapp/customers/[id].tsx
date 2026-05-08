import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

interface Customer {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string | null;
  phoneNumber: string;
  email: string | null;
  tags: string[];
  notes: string | null;
  isOptedIn: boolean;
  importedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
}

export default function WhatsAppCustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = id ? decodeURIComponent(id) : "";
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [isOptedIn, setIsOptedIn] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Customer",
      headerBackTitle: "Customers",
    });
  }, [navigation]);

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await api<{ customer: Customer | null }>(
        `/api/mobile/whatsapp/customers/${encodeURIComponent(customerId)}`,
      );
      const c = data.customer;
      setCustomer(c);
      if (c) {
        setTags(c.tags ?? []);
        setNotes(c.notes ?? "");
        setIsOptedIn(c.isOptedIn);
        setFirstName(c.firstName);
        setLastName(c.lastName ?? "");
        setEmail(c.email ?? "");
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not load customer.";
      Alert.alert("WhatsApp", message);
    } finally {
      setLoading(false);
    }
  }, [api, customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  function addTag() {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) {
      setTagDraft("");
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function save() {
    if (!customer) return;
    if (!firstName.trim()) {
      Alert.alert("First name required");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/mobile/whatsapp/customers/${encodeURIComponent(customer.id)}`, {
        method: "PATCH",
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          tags,
          notes,
          isOptedIn,
        },
      });
      Alert.alert("Saved", "Customer updated.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save.";
      Alert.alert("WhatsApp", message);
    } finally {
      setSaving(false);
    }
  }

  function startChat() {
    if (!customer) return;
    router.push(`/whatsapp/${encodeURIComponent(customer.phoneNumber)}`);
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-customer-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>Customer not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={[styles.avatar, !isOptedIn && styles.avatarOptOut]}>
            <Text style={styles.avatarText}>
              {(firstName || customer.phoneNumber).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>
            {[firstName, lastName].filter(Boolean).join(" ") || customer.phoneNumber}
          </Text>
          <Text style={styles.phone}>{customer.phoneNumber}</Text>
          {!isOptedIn && (
            <View style={styles.optBadge}>
              <Text style={styles.optBadgeText}>Opted out of marketing</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={startChat}
            accessibilityLabel="Start chat"
            testID="wa-customer-start-chat"
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.chatBtnText}>Start chat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity</Text>
          <Field label="First name">
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={Colors.textTertiary}
              testID="wa-customer-first-name"
            />
          </Field>
          <Field label="Last name">
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={Colors.textTertiary}
              testID="wa-customer-last-name"
            />
          </Field>
          <Field label="Email">
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="wa-customer-email"
            />
          </Field>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opt-in</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              Customer can receive WhatsApp marketing
            </Text>
            <Switch
              value={isOptedIn}
              onValueChange={setIsOptedIn}
              trackColor={{ true: "#25D366", false: "#cbd5e1" }}
              testID="wa-customer-optin"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagList}>
            {tags.map((t) => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagText}>{t}</Text>
                <TouchableOpacity
                  onPress={() => removeTag(t)}
                  hitSlop={6}
                  accessibilityLabel={`Remove tag ${t}`}
                  testID={`wa-customer-tag-remove-${t}`}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
            {tags.length === 0 && <Text style={styles.helper}>No tags yet.</Text>}
          </View>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.input}
              value={tagDraft}
              onChangeText={setTagDraft}
              placeholder="Add a tag"
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={addTag}
              returnKeyType="done"
              testID="wa-customer-tag-input"
            />
            <TouchableOpacity
              onPress={addTag}
              style={styles.tagAddBtn}
              accessibilityLabel="Add tag"
              testID="wa-customer-tag-add"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Internal notes"
            placeholderTextColor={Colors.textTertiary}
            textAlignVertical="top"
            testID="wa-customer-notes"
          />
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Imported from</Text>
          <Text style={styles.metaValue}>{customer.importedFrom ?? "—"}</Text>
          <Text style={styles.metaLabel}>Last contacted</Text>
          <Text style={styles.metaValue}>
            {customer.lastContactedAt
              ? new Date(customer.lastContactedAt).toLocaleString("en-IN")
              : "—"}
          </Text>
          <Text style={styles.metaLabel}>Updated</Text>
          <Text style={styles.metaValue}>
            {new Date(customer.updatedAt).toLocaleString("en-IN")}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityLabel="Save customer"
          testID="wa-customer-save"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  scroll: { padding: 16, gap: 16 },
  headerCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarOptOut: { backgroundColor: "#94a3b8" },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: Colors.text },
  phone: { fontSize: 14, color: Colors.textTertiary },
  optBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  optBadgeText: { fontSize: 11, fontWeight: "700", color: "#b91c1c" },
  chatBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: "600" },
  input: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.text },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { fontSize: 13, color: "#075E54", fontWeight: "600" },
  helper: { fontSize: 13, color: Colors.textTertiary },
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    minHeight: 96,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
  },
  metaCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 4 },
  metaLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 8,
  },
  metaValue: { fontSize: 14, color: Colors.text },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
