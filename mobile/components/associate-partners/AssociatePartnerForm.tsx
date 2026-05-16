import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New partner" : "Edit partner",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="partner-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New partner" : "Edit partner"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Partner name *</Text>
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

        <Text style={styles.label}>Mobile number *</Text>
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

        <Text style={styles.label}>Email</Text>
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

        <Text style={styles.label}>Gmail (Clerk login)</Text>
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
        <Text style={styles.help}>
          Used to match the partner's Clerk login so they can see their inquiries.
        </Text>

        {mode === "edit" ? (
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
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="partner-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create partner" : "Save changes"}
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
                {mode === "create" ? "Create partner" : "Save changes"}
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
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
