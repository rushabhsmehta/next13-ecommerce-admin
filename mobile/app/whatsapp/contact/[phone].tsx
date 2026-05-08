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
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  isOptedIn: boolean;
  importedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
}

export default function WhatsAppContactScreen() {
  const { phone: rawPhone } = useLocalSearchParams<{ phone: string }>();
  const phone = decodeURIComponent(rawPhone ?? "");
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

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ customer: Customer | null }>(
        `/api/mobile/whatsapp/customers/${encodeURIComponent(phone)}`,
      );
      const c = data.customer;
      setCustomer(c);
      if (c) {
        setTags(c.tags ?? []);
        setNotes(c.notes ?? "");
        setIsOptedIn(c.isOptedIn);
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not load contact.";
      Alert.alert("WhatsApp", message);
    } finally {
      setLoading(false);
    }
  }, [api, phone]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Contact info",
      headerBackTitle: "Chat",
    });
  }, [navigation]);

  function addTag() {
    const t = tagDraft.trim();
    if (!t) return;
    if (tags.includes(t)) {
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
    setSaving(true);
    try {
      await api(`/api/mobile/whatsapp/customers/${encodeURIComponent(phone)}`, {
        method: "PATCH",
        body: { tags, notes, isOptedIn },
      });
      Alert.alert("Saved", "Contact updated.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save.";
      Alert.alert("WhatsApp", message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-contact-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No contact record</Text>
        <Text style={styles.emptyText}>
          {phone} hasn&apos;t been added to your WhatsApp customers yet.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
      >
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(customer.firstName ?? phone).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{customer.fullName ?? phone}</Text>
          <Text style={styles.phone}>{customer.phoneNumber ?? phone}</Text>
          {customer.email ? (
            <Text style={styles.subline}>{customer.email}</Text>
          ) : null}
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
              testID="wa-contact-optin"
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
                  testID={`wa-contact-tag-remove-${t}`}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
            {tags.length === 0 && (
              <Text style={styles.emptyTag}>No tags yet</Text>
            )}
          </View>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add a tag"
              placeholderTextColor={Colors.textTertiary}
              value={tagDraft}
              onChangeText={setTagDraft}
              onSubmitEditing={addTag}
              returnKeyType="done"
              testID="wa-contact-tag-input"
            />
            <TouchableOpacity
              onPress={addTag}
              style={styles.tagAddBtn}
              accessibilityLabel="Add tag"
              testID="wa-contact-tag-add"
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
            placeholder="Internal notes about this contact"
            placeholderTextColor={Colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
            testID="wa-contact-notes"
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
        </View>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityLabel="Save contact"
          testID="wa-contact-save"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
  },
  scroll: { padding: 16, gap: 16 },
  headerCard: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
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
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: Colors.text },
  phone: { fontSize: 14, color: Colors.textTertiary },
  subline: { fontSize: 13, color: Colors.textTertiary },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  emptyTag: { fontSize: 13, color: Colors.textTertiary },
  tagInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    color: Colors.text,
  },
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
  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
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
