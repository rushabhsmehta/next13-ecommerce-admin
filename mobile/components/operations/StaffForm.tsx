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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type OperationalStaffRole,
} from "@/lib/operations";

interface InitialValues {
  name: string;
  email: string;
  role: OperationalStaffRole;
  isActive: boolean;
}

const EMPTY: InitialValues = {
  name: "",
  email: "",
  role: "OPERATIONS",
  isActive: true,
};

interface Props {
  mode: "create" | "edit";
  staffId?: string;
  initial?: InitialValues;
}

export function StaffForm({ mode, staffId, initial }: Props) {
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
  const [email, setEmail] = useState(seed.email);
  const [role, setRole] = useState<OperationalStaffRole>(seed.role);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const screenTitle = mode === "create" ? "New staff" : "Edit staff";
  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const pwOk =
    mode === "create"
      ? password.trim().length >= 6
      : password.length === 0 || password.trim().length >= 6;
  const canSubmit = name.trim().length > 0 && emailOk && pwOk && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        const saved = await client.createStaff({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          isActive,
        });
        router.replace(`/admin/operations/staff/${saved.id}` as never);
      } else if (staffId) {
        await client.updateStaff(staffId, {
          name: name.trim(),
          email: email.trim(),
          role,
          isActive,
          ...(password.trim().length >= 6 ? { password: password.trim() } : {}),
        });
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} staff.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "staff-new-screen" : "staff-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create staff" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="staff-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim()
              ? "Enter a full name."
              : !emailOk
                ? "Enter a valid email."
                : !pwOk
                  ? "Password must be at least 6 characters."
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
        subtitle="Operational staff"
        onBackPress={() => router.back()}
        testID="staff-form"
      />

      <AdminFormSection title="Account" testID="staff-form-account">
        <AdminFormField label="Full name" required>
          <TextInput
            testID="staff-form-name"
            accessibilityLabel="Staff name"
            style={styles.input}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField
          label="Email"
          required
          error={!emailOk && email.length > 0 ? "Enter a valid email." : undefined}
        >
          <TextInput
            testID="staff-form-email"
            accessibilityLabel="Email"
            style={styles.input}
            placeholder="staff@example.com"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField
          label={mode === "create" ? "Password" : "New password"}
          required={mode === "create"}
          hint={mode === "edit" ? "Leave blank to keep current." : "Min 6 characters."}
          error={!pwOk ? "Password must be at least 6 characters." : undefined}
        >
          <TextInput
            testID="staff-form-password"
            accessibilityLabel="Password"
            style={styles.input}
            placeholder={
              mode === "create" ? "Min 6 characters" : "Leave blank to keep current"
            }
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Role" testID="staff-form-role">
        <View style={styles.roleRow}>
          {(["OPERATIONS", "ADMIN"] as OperationalStaffRole[]).map((r) => {
            const active = role === r;
            return (
              <Pressable
                key={r}
                testID={`staff-form-role-${r}`}
                style={[styles.roleChip, active ? styles.roleChipActive : null]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, active ? styles.roleTextActive : null]}>
                  {r === "OPERATIONS" ? "Operations" : "Admin"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Active</Text>
            <Text style={styles.help}>
              Inactive staff can't sign in or be assigned new work.
            </Text>
          </View>
          <Switch
            testID="staff-form-active"
            value={isActive}
            onValueChange={setIsActive}
            accessibilityLabel="Toggle active status"
          />
        </View>
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  roleRow: { flexDirection: "row", gap: Spacing.sm },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  roleChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryLight,
  },
  roleText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  roleTextActive: { color: Colors.primary },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  toggleLabel: { fontSize: FontSize.md, fontWeight: "800", color: Colors.text },
});
