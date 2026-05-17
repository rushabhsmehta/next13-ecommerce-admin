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
  type VehicleTypeInput,
  type VehicleTypeUpdateInput,
} from "@/lib/operations";

interface InitialValues {
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY: InitialValues = { name: "", description: "", isActive: true };

interface Props {
  mode: "create" | "edit";
  vehicleTypeId?: string;
  initial?: InitialValues;
}

/** Shared vehicle-type form for create and edit flows. */
export function VehicleTypeForm({ mode, vehicleTypeId, initial }: Props) {
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
  const [description, setDescription] = useState(seed.description);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        const payload: VehicleTypeInput = {
          name: name.trim(),
          description: description.trim() || null,
        };
        const saved = await client.createVehicleType(payload);
        router.replace(`/admin/operations/vehicle-types/${saved.id}` as never);
      } else if (vehicleTypeId) {
        const payload: VehicleTypeUpdateInput = {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        };
        await client.updateVehicleType(vehicleTypeId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the vehicle type.`
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
          title: mode === "create" ? "New vehicle type" : "Edit vehicle type",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="vehicle-type-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New vehicle type" : "Edit vehicle type"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Name *</Text>
        <TextInput
          testID="vehicle-type-form-name"
          accessibilityLabel="Vehicle type name"
          style={styles.input}
          placeholder="e.g. Innova Crysta"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={200}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="vehicle-type-form-description"
          accessibilityLabel="Description"
          style={[styles.input, styles.textarea]}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {mode === "edit" ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              testID="vehicle-type-form-active"
              accessibilityLabel="Active vehicle type"
              value={isActive}
              onValueChange={setIsActive}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="vehicle-type-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create vehicle type" : "Save changes"}
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
                {mode === "create" ? "Create vehicle type" : "Save changes"}
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
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
