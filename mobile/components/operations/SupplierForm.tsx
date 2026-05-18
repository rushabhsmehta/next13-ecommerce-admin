import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function isValidPhone(value: string): boolean {
  if (!/^[0-9+\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

interface Props {
  mode: "create" | "edit";
  supplierId?: string;
  initial?: InitialValues;
}

/** Shared supplier form for /admin/operations/suppliers/new and [id] edit. */
export function SupplierForm({ mode, supplierId, initial }: Props) {
  const router = useRouter();
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

  const screenTitle = mode === "create" ? "New supplier" : "Edit supplier";

  const nameError = name.trim().length === 0 ? "Enter a supplier name." : undefined;
  const emailError =
    email.trim().length > 0 && !EMAIL_RE.test(email.trim())
      ? "Enter a valid email address."
      : undefined;
  const contactError =
    contact.trim().length > 0 && !isValidPhone(contact.trim())
      ? "Enter a valid phone number."
      : undefined;
  const gstError =
    gstNumber.trim().length > 0 && !GSTIN_RE.test(gstNumber.trim().toUpperCase())
      ? "Enter a valid 15-character GSTIN."
      : undefined;

  const disabledReason = nameError
    ? nameError
    : emailError
      ? emailError
      : contactError
        ? contactError
        : gstError
          ? gstError
          : submitting
            ? "Saving…"
            : undefined;
  const canSubmit =
    !nameError && !emailError && !contactError && !gstError && !submitting;

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
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "supplier-new-screen" : "supplier-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create supplier" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="supplier-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={disabledReason}
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />

      <AdminTopBar
        title={screenTitle}
        subtitle="Supplier"
        onBackPress={() => router.back()}
        testID="supplier-form"
      />

      <AdminFormSection title="Details" testID="supplier-form-details">
        <AdminFormField label="Supplier name" required>
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
        </AdminFormField>
        <AdminFormField
          label="Contact number"
          error={contact.trim().length > 0 ? contactError : undefined}
        >
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
        </AdminFormField>
        <AdminFormField
          label="Email"
          error={email.trim().length > 0 ? emailError : undefined}
        >
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
        </AdminFormField>
        <AdminFormField
          label="GST number"
          error={gstNumber.trim().length > 0 ? gstError : undefined}
        >
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
        </AdminFormField>
        <AdminFormField label="Address">
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
        </AdminFormField>
      </AdminFormSection>
    </AdminScreen>
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
});
