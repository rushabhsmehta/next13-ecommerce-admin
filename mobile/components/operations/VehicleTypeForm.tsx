import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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

  const screenTitle = mode === "create" ? "New vehicle type" : "Edit vehicle type";
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
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "vehicle-type-new-screen" : "vehicle-type-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create vehicle type" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="vehicle-type-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim() ? "Enter a vehicle type name." : submitting ? "Saving…" : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />

      <AdminTopBar
        title={screenTitle}
        subtitle="Vehicle type"
        onBackPress={() => router.back()}
        testID="vehicle-type-form"
      />

      <AdminFormSection title="Details" testID="vehicle-type-form-details">
        <AdminFormField label="Name" required>
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
        </AdminFormField>
        <AdminFormField label="Description">
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
        </AdminFormField>
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
