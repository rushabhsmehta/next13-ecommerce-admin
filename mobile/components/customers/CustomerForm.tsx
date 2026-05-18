import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { DateField } from "@/components/ui/DateField";
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPhone(value: string): boolean {
  if (!/^[0-9+\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

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
  title?: string;
}

export function CustomerForm({ mode, customerId, initial, title }: Props) {
  const router = useRouter();
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

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [partnerList, setPartnerList] = useState<AssociatePartnerOption[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);

  const screenTitle = title ?? (mode === "create" ? "New customer" : "Edit customer");
  const birthdateOk = !birthdate || ISO_DATE.test(birthdate);
  const anniversaryOk = !marriageAnniversary || ISO_DATE.test(marriageAnniversary);
  const emailError =
    email.trim().length > 0 && !EMAIL_RE.test(email.trim())
      ? "Enter a valid email address."
      : undefined;
  const contactError =
    contact.trim().length > 0 && !isValidPhone(contact.trim())
      ? "Enter a valid phone number."
      : undefined;
  const canSubmit =
    name.trim().length > 0 &&
    birthdateOk &&
    anniversaryOk &&
    !emailError &&
    !contactError &&
    !submitting;

  const partnerOptions = useMemo(
    () =>
      partnerList.map((p) => ({
        id: p.id,
        label: p.name,
        subtitle: p.email ?? p.gmail ?? p.mobileNumber ?? undefined,
      })),
    [partnerList]
  );

  async function openPartnerPicker() {
    setPartnerPickerOpen(true);
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
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "customer-new-screen" : "customer-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create customer" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="customer-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim()
              ? "Enter a name to save."
              : contactError
                ? contactError
                : emailError
                  ? emailError
                  : !birthdateOk || !anniversaryOk
                    ? "Choose valid dates."
                    : submitting
                      ? "Saving…"
                      : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />

      <AdminTopBar
        title={screenTitle}
        subtitle="Customer"
        onBackPress={() => router.back()}
        testID="customer-form"
      />

      <AdminFormSection title="Contact" testID="customer-form-contact">
        <AdminFormField label="Full name" required>
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
        </AdminFormField>
        <AdminFormField
          label="Mobile number"
          error={contact.trim().length > 0 ? contactError : undefined}
        >
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
        </AdminFormField>
        <AdminFormField
          label="Email"
          error={email.trim().length > 0 ? emailError : undefined}
        >
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
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Partner" testID="customer-form-partner">
        <Pressable
          testID="customer-form-partner-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose associate partner"
          style={styles.pickerBtn}
          onPress={() => void openPartnerPicker()}
        >
          <Text style={styles.pickerText} numberOfLines={2}>
            {associatePartnerName ?? "Optional — direct customer"}
          </Text>
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
      </AdminFormSection>

      <AdminFormSection title="Dates" testID="customer-form-dates">
        <AdminFormField
          label="Birthdate"
          hint="Optional"
        >
          <DateField
            testID="customer-form-birthdate"
            accessibilityLabel="Birthdate"
            style={styles.input}
            placeholder="Choose birthdate"
            value={birthdate}
            onChange={setBirthdate}
            maximumDate={new Date()}
          />
        </AdminFormField>
        <AdminFormField
          label="Marriage anniversary"
          hint="Optional"
        >
          <DateField
            testID="customer-form-anniversary"
            accessibilityLabel="Marriage anniversary"
            style={styles.input}
            placeholder="Choose anniversary"
            value={marriageAnniversary}
            onChange={setMarriageAnniversary}
            maximumDate={new Date()}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminPickerSheet
        visible={partnerPickerOpen}
        title="Choose associate partner"
        options={partnerOptions}
        selectedId={associatePartnerId}
        loading={partnerLoading}
        onClose={() => setPartnerPickerOpen(false)}
        onSelect={(opt) => {
          setAssociatePartnerId(opt.id);
          setAssociatePartnerName(opt.label);
        }}
        testID="customer-form-partner-sheet"
      />
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
  pickerBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  pickerText: { fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  clearBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  clearText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
});
