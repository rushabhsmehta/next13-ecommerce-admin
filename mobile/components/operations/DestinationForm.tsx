import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type DestinationInput,
  type OpsLocation,
} from "@/lib/operations";
import { OperationsImagePicker } from "@/components/operations/OperationsImagePicker";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

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
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [locationId, setLocationId] = useState(
    seed.locationId || defaultLocationId || ""
  );
  const [locationLabel, setLocationLabel] = useState(seed.locationLabel);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<InquiryLookupOption[]>([]);
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

  const canSubmit =
    name.trim().length > 0 && locationId.length > 0 && !submitting;

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New destination" : "Edit destination",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="destination-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New destination" : "Edit destination"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Location *</Text>
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

        <Text style={styles.label}>Name *</Text>
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

        <Text style={styles.label}>Image</Text>
        <OperationsImagePicker
          testID="destination-form-image"
          accessibilityLabel="Destination image"
          value={imageUrl}
          onChange={setImageUrl}
          getToken={() => getTokenRef.current()}
        />

        <Text style={styles.label}>Description</Text>
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="destination-form-active"
            accessibilityLabel="Active destination"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="destination-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create destination" : "Save changes"}
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
                {mode === "create" ? "Create destination" : "Save changes"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LookupPickerModal
        visible={showLocationPicker}
        title="Location"
        options={locationOptions}
        testID="destination-location-picker"
        onClose={() => setShowLocationPicker(false)}
        onSelect={(id) => {
          const opt = locationOptions.find((o) => o.id === id);
          setLocationId(id);
          setLocationLabel(opt?.label ?? "");
        }}
      />
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
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
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
