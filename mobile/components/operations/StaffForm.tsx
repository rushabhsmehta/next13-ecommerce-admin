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
  const [email, setEmail] = useState(seed.email);
  const [role, setRole] = useState<OperationalStaffRole>(seed.role);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const pwOk =
    mode === "create"
      ? password.trim().length >= 6
      : password.length === 0 || password.trim().length >= 6;
  const canSubmit =
    name.trim().length > 0 && emailOk && pwOk && !submitting;

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New staff" : "Edit staff",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="staff-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New staff" : "Edit staff"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Full name *</Text>
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

        <Text style={styles.label}>Email *</Text>
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
        {!emailOk && email.length > 0 ? (
          <Text style={styles.helpErr}>Enter a valid email.</Text>
        ) : null}

        <Text style={styles.label}>
          {mode === "create" ? "Password *" : "New password (optional)"}
        </Text>
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
        {!pwOk ? (
          <Text style={styles.helpErr}>Password must be at least 6 characters.</Text>
        ) : null}

        <Text style={styles.label}>Role</Text>
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
                <Text
                  style={[
                    styles.roleText,
                    active ? styles.roleTextActive : null,
                  ]}
                >
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="staff-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create staff" : "Save changes"}
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
                {mode === "create" ? "Create staff" : "Save changes"}
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
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  roleRow: { flexDirection: "row", gap: Spacing.sm, marginTop: 4 },
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
