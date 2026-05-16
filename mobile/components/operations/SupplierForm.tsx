import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { createOperationsClient, type SupplierInput } from "@/lib/operations";

interface InitialValues {
  name: string;
  contact: string;
  email: string;
  gstNumber: string;
  address: string;
}

const EMPTY: InitialValues = {
  name: "",
  contact: "",
  email: "",
  gstNumber: "",
  address: "",
};

interface Props {
  mode: "create" | "edit";
  supplierId?: string;
  initial?: InitialValues;
}

/** Shared supplier form for /admin/operations/suppliers/new and [id] edit. */
export function SupplierForm({ mode, supplierId, initial }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const seed = initial ?? EMPTY;
  const [name, setName] = useState(seed.name);
  const [contact, setContact] = useState(seed.contact);
  const [email, setEmail] = useState(seed.email);
  const [gstNumber, setGstNumber] = useState(seed.gstNumber);
  const [address, setAddress] = useState(seed.address);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: SupplierInput = {
        name: name.trim(),
        contact: contact.trim() || null,
        email: email.trim() || null,
        gstNumber: gstNumber.trim() || null,
        address: address.trim() || null,
      };
      if (mode === "create") {
        const saved = await client.createSupplier(payload);
        router.replace(`/admin/operations/suppliers/${saved.id}` as never);
      } else if (supplierId) {
        await client.updateSupplier(supplierId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the supplier.`
      );
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
          title: mode === "create" ? "New supplier" : "Edit supplier",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="supplier-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New supplier" : "Edit supplier"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Supplier name *</Text>
        <TextInput
          testID="supplier-form-name"
          accessibilityLabel="Supplier name"
          style={styles.input}
          placeholder="e.g. Himalaya Transports"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={200}
        />

        <Text style={styles.label}>Contact number</Text>
        <TextInput
          testID="supplier-form-contact"
          accessibilityLabel="Contact number"
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor={Colors.textTertiary}
          value={contact}
          onChangeText={setContact}
          keyboardType="phone-pad"
          autoCorrect={false}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="supplier-form-email"
          accessibilityLabel="Email"
          style={styles.input}
          placeholder="supplier@example.com"
          placeholderTextColor={Colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>GST number</Text>
        <TextInput
          testID="supplier-form-gst"
          accessibilityLabel="GST number"
          style={styles.input}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          value={gstNumber}
          onChangeText={setGstNumber}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          testID="supplier-form-address"
          accessibilityLabel="Address"
          style={[styles.input, styles.textarea]}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          value={address}
          onChangeText={setAddress}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="supplier-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create supplier" : "Save changes"}
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
                {mode === "create" ? "Create supplier" : "Save changes"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: 4 },
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
});
