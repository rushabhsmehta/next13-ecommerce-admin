import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
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
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createAssociatePartnersClient,
  type AssociatePartnerInput,
} from "@/lib/associate-partners";

interface InitialValues {
  name: string;
  mobileNumber: string;
  email: string;
  gmail: string;
  isActive: boolean;
}

const EMPTY: InitialValues = {
  name: "",
  mobileNumber: "",
  email: "",
  gmail: "",
  isActive: true,
};

interface Props {
  mode: "create" | "edit";
  partnerId?: string;
  initial?: InitialValues;
}

export function AssociatePartnerForm({ mode, partnerId, initial }: Props) {
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
  const client = useMemo(
    () => createAssociatePartnersClient(authRequest),
    [authRequest]
  );

  const seed = initial ?? EMPTY;
  const [name, setName] = useState(seed.name);
  const [mobileNumber, setMobileNumber] = useState(seed.mobileNumber);
  const [email, setEmail] = useState(seed.email);
  const [gmail, setGmail] = useState(seed.gmail);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);

  const screenTitle = mode === "create" ? "New partner" : "Edit partner";
  const canSubmit =
    name.trim().length > 0 && mobileNumber.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: AssociatePartnerInput = {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || null,
        gmail: gmail.trim() || null,
        ...(mode === "edit" ? { isActive } : {}),
      };
      if (mode === "create") {
        const saved = await client.create(payload);
        router.replace(`/admin/crm/associate-partners/${saved.id}` as never);
      } else if (partnerId) {
        await client.update(partnerId, payload);
        router.back();
      } else {
        throw new Error("Missing partner id for edit mode");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the partner.`;
      Alert.alert("Save failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "partner-new-screen" : "partner-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create partner" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="partner-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim()
              ? "Enter a partner name."
              : !mobileNumber.trim()
                ? "Enter a mobile number."
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
        subtitle="Associate partner"
        onBackPress={() => router.back()}
        testID="partner-form"
      />

      <AdminFormSection title="Contact" testID="partner-form-contact">
        <AdminFormField label="Partner name" required>
          <TextInput
            testID="partner-form-name"
            accessibilityLabel="Partner name"
            style={styles.input}
            placeholder="Travel agency or contact name"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Mobile number" required>
          <TextInput
            testID="partner-form-mobile"
            accessibilityLabel="Mobile number"
            style={styles.input}
            placeholder="+91 9XXXXXXXXX"
            placeholderTextColor={Colors.textTertiary}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="Email">
          <TextInput
            testID="partner-form-email"
            accessibilityLabel="Email"
            style={styles.input}
            placeholder="partner@example.com"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="Gmail (Clerk login)" hint="Used to match the partner's Clerk login.">
          <TextInput
            testID="partner-form-gmail"
            accessibilityLabel="Gmail"
            style={styles.input}
            placeholder="partner@gmail.com"
            placeholderTextColor={Colors.textTertiary}
            value={gmail}
            onChangeText={setGmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
      </AdminFormSection>

      {mode === "edit" ? (
        <AdminFormSection title="Status" testID="partner-form-status">
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Active</Text>
              <Text style={styles.help}>
                Inactive partners are hidden from pickers and cannot sign in.
              </Text>
            </View>
            <Switch
              testID="partner-form-active"
              value={isActive}
              onValueChange={setIsActive}
              accessibilityLabel="Toggle active status"
            />
          </View>
        </AdminFormSection>
      ) : null}
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
});
