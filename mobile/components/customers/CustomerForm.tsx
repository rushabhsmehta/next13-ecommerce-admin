import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminQuickCreateModal,
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
  createAssociatePartnersClient,
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
  const partnersClient = useMemo(
    () => createAssociatePartnersClient(authRequest),
    [authRequest]
  );

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
  const [partnerCreateOpen, setPartnerCreateOpen] = useState(false);
  const [creatingPartner, setCreatingPartner] = useState(false);

  const screenTitle = title ?? (mode === "create" ? "New customer" : "Edit customer");
  const birthdateOk = !birthdate || ISO_DATE.test(birthdate);
  const anniversaryOk = !marriageAnniversary || ISO_DATE.test(marriageAnniversary);
  const canSubmit =
    name.trim().length > 0 && birthdateOk && anniversaryOk && !submitting;

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

  async function createPartnerQuick(values: Record<string, string>) {
    const partnerName = values.name?.trim();
    const mobileNumber = values.mobileNumber?.trim();
    if (!partnerName || !mobileNumber) return;
    setCreatingPartner(true);
    try {
      const saved = await partnersClient.create({
        name: partnerName,
        mobileNumber,
      });
      setPartnerList((prev) =>
        prev.some((p) => p.id === saved.id) ? prev : [saved, ...prev]
      );
      setAssociatePartnerId(saved.id);
      setAssociatePartnerName(saved.name);
      setPartnerCreateOpen(false);
      setPartnerPickerOpen(false);
    } catch (err) {
      Alert.alert(
        "Create failed",
        err instanceof ApiError ? err.message : "Could not create the partner."
      );
    } finally {
      setCreatingPartner(false);
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
        <AdminFormField label="Mobile number">
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
        <AdminFormField label="Email">
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
        footerAction={{
          label: "Add partner",
          testID: "customer-form-partner-add",
          onPress: () => setPartnerCreateOpen(true),
        }}
        testID="customer-form-partner-sheet"
      />
      <AdminQuickCreateModal
        visible={partnerCreateOpen}
        title="Add associate partner"
        hint="Creates a partner and selects them for this customer."
        fields={[
          {
            key: "name",
            label: "Partner name",
            placeholder: "e.g. Travel Partners Co",
            required: true,
            autoCapitalize: "words",
            maxLength: 200,
          },
          {
            key: "mobileNumber",
            label: "Mobile number",
            placeholder: "+91 9XXXXXXXXX",
            required: true,
            keyboardType: "phone-pad",
            autoCapitalize: "none",
            maxLength: 20,
          },
        ]}
        submitLabel="Create partner"
        loading={creatingPartner}
        onClose={() => setPartnerCreateOpen(false)}
        onSubmit={createPartnerQuick}
        testID="customer-form-partner-quick-create"
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
