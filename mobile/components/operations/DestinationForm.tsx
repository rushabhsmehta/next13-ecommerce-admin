import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type DestinationInput,
  type OpsLocation,
} from "@/lib/operations";
import { OperationsImagePicker } from "@/components/operations/OperationsImagePicker";

interface InitialValues {
  name: string;
  description: string;
  imageUrl: string;
  locationId: string;
  locationLabel: string;
  isActive: boolean;
}

const EMPTY: InitialValues = {
  name: "",
  description: "",
  imageUrl: "",
  locationId: "",
  locationLabel: "",
  isActive: true,
};

interface Props {
  mode: "create" | "edit";
  destinationId?: string;
  initial?: InitialValues;
  /** Pre-select parent location when creating from a location context. */
  defaultLocationId?: string;
}

export function DestinationForm({
  mode,
  destinationId,
  initial,
  defaultLocationId,
}: Props) {
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
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [locationId, setLocationId] = useState(
    seed.locationId || defaultLocationId || ""
  );
  const [locationLabel, setLocationLabel] = useState(seed.locationLabel);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{ id: string; label: string }[]>(
    []
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const res = await client.listLocations({ limit: 100 });
      setLocationOptions(res.items.map((l: OpsLocation) => ({ id: l.id, label: l.label })));
      if (defaultLocationId && !locationLabel) {
        const match = res.items.find((l) => l.id === defaultLocationId);
        if (match) {
          setLocationId(match.id);
          setLocationLabel(match.label);
        }
      }
    } catch {
      // picker may still work if initial values are set
    }
  }, [client, defaultLocationId, locationLabel]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const screenTitle = mode === "create" ? "New destination" : "Edit destination";
  const canSubmit = name.trim().length > 0 && locationId.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: DestinationInput = {
        name: name.trim(),
        locationId,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        isActive,
      };
      if (mode === "create") {
        const saved = await client.createDestination(payload);
        router.replace(`/admin/operations/destinations/${saved.id}` as never);
      } else if (destinationId) {
        await client.updateDestination(destinationId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the destination.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "destination-new-screen" : "destination-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create destination" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="destination-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !locationId
              ? "Select a parent location."
              : !name.trim()
                ? "Enter a destination name."
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
        subtitle="Destination"
        onBackPress={() => router.back()}
        testID="destination-form"
      />

      <AdminFormSection title="Location" testID="destination-form-location-section">
        <AdminFormField label="Parent location" required>
          <Pressable
            testID="destination-form-location"
            accessibilityRole="button"
            accessibilityLabel="Choose parent location"
            style={styles.pickerBtn}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={locationId ? styles.pickerValue : styles.pickerPlaceholder}>
              {locationLabel || "Select location…"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Details" testID="destination-form-details">
        <AdminFormField label="Name" required>
          <TextInput
            testID="destination-form-name"
            accessibilityLabel="Destination name"
            style={styles.input}
            placeholder="e.g. North Goa"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Image">
          <OperationsImagePicker
            testID="destination-form-image"
            accessibilityLabel="Destination image"
            value={imageUrl}
            onChange={setImageUrl}
            getToken={() => getTokenRef.current()}
          />
        </AdminFormField>
        <AdminFormField label="Description">
          <TextInput
            testID="destination-form-description"
            accessibilityLabel="Description"
            style={[styles.input, styles.textarea]}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="destination-form-active"
            accessibilityLabel="Active destination"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </AdminFormSection>

      <AdminPickerSheet
        visible={showLocationPicker}
        title="Location"
        options={locationOptions}
        selectedId={locationId}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(opt) => {
          setLocationId(opt.id);
          setLocationLabel(opt.label);
        }}
        testID="destination-location-picker"
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
