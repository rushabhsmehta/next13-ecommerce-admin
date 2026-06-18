import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
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
  type AdminPickerOption,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type SupplierInput,
  type SupplierLocationRef,
} from "@/lib/operations";

interface InitialValues {
  name: string;
  contact: string;
  email: string;
  gstNumber: string;
  address: string;
  locations?: SupplierLocationRef[];
}

const EMPTY: InitialValues = {
  name: "",
  contact: "",
  email: "",
  gstNumber: "",
  address: "",
  locations: [],
};

interface Props {
  mode: "create" | "edit";
  supplierId?: string;
  initial?: InitialValues;
}

/** Shared supplier form for /admin/operations/suppliers/new and [id] edit. */
export function SupplierForm({ mode, supplierId, initial }: Props) {
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
  const [contact, setContact] = useState(seed.contact);
  const [email, setEmail] = useState(seed.email);
  const [gstNumber, setGstNumber] = useState(seed.gstNumber);
  const [address, setAddress] = useState(seed.address);
  const [locationIds, setLocationIds] = useState<string[]>(
    () => seed.locations?.map((loc) => loc.id) ?? []
  );
  const [locationOptions, setLocationOptions] = useState<AdminPickerOption[]>([]);
  const [pickersLoading, setPickersLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of seed.locations ?? []) map.set(loc.id, loc.label);
    for (const opt of locationOptions) map.set(opt.id, opt.label);
    return map;
  }, [seed.locations, locationOptions]);

  const availableLocationOptions = useMemo(
    () => locationOptions.filter((opt) => !locationIds.includes(opt.id)),
    [locationOptions, locationIds]
  );

  const loadLocations = useCallback(async () => {
    setPickersLoading(true);
    try {
      const res = await client.listLocations({ limit: 100 });
      setLocationOptions(res.items.map((loc) => ({ id: loc.id, label: loc.label })));
    } catch {
      // Existing selections still display from seed labels.
    } finally {
      setPickersLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const screenTitle = mode === "create" ? "New supplier" : "Edit supplier";
  const canSubmit = name.trim().length > 0 && !submitting;

  function addLocation(id: string) {
    setLocationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeLocation(id: string) {
    setLocationIds((prev) => prev.filter((item) => item !== id));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: SupplierInput = {
        name: name.trim(),
        contact: contact.trim() || null,
        email: email.trim() || null,
        gstNumber: gstNumber.trim() || null,
        address: address.trim() || null,
        locationIds,
      };
      if (mode === "create") {
        const saved = await client.createSupplier(payload);
        router.replace(`/admin/operations/suppliers/${saved.id}` as never);
      } else if (supplierId) {
        await client.updateSupplier(supplierId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the supplier.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "supplier-new-screen" : "supplier-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create supplier" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="supplier-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim() ? "Enter a supplier name." : submitting ? "Saving…" : undefined
          }
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: screenTitle, headerShown: false }} />

      <AdminTopBar
        title={screenTitle}
        subtitle="Supplier"
        onBackPress={() => router.back()}
        testID="supplier-form"
      />

      <AdminFormSection title="Details" testID="supplier-form-details">
        <AdminFormField label="Supplier name" required>
          <TextInput
            testID="supplier-form-name"
            accessibilityLabel="Supplier name"
            style={styles.input}
            placeholder="e.g. Himalaya Transports"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Contact number">
          <TextInput
            testID="supplier-form-contact"
            accessibilityLabel="Contact number"
            style={styles.input}
            placeholder="Phone"
            placeholderTextColor={Colors.textTertiary}
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="Email">
          <TextInput
            testID="supplier-form-email"
            accessibilityLabel="Email"
            style={styles.input}
            placeholder="supplier@example.com"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="GST number">
          <TextInput
            testID="supplier-form-gst"
            accessibilityLabel="GST number"
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={gstNumber}
            onChangeText={setGstNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="Address">
          <TextInput
            testID="supplier-form-address"
            accessibilityLabel="Address"
            style={[styles.input, styles.textarea]}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Coverage" testID="supplier-form-locations">
        <AdminFormField
          label="Locations"
          hint="Tour regions this supplier serves (e.g. Kashmir, Goa)."
        >
          {locationIds.length > 0 ? (
            <View style={styles.chipRow}>
              {locationIds.map((id) => (
                <Pressable
                  key={id}
                  testID={`supplier-form-location-chip-${id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${labelById.get(id) ?? "location"}`}
                  style={styles.chip}
                  onPress={() => removeLocation(id)}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {labelById.get(id) ?? "Location"}
                  </Text>
                  <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyLocations}>No locations selected yet.</Text>
          )}
          <Pressable
            testID="supplier-form-add-location"
            accessibilityRole="button"
            accessibilityLabel="Add location"
            accessibilityHint="Opens a list of tour locations to link to this supplier"
            style={[
              styles.addLocationBtn,
              availableLocationOptions.length === 0 && !pickersLoading
                ? styles.addLocationBtnDisabled
                : null,
            ]}
            onPress={() => setShowLocationPicker(true)}
            disabled={pickersLoading || availableLocationOptions.length === 0}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addLocationText}>
              {pickersLoading
                ? "Loading locations…"
                : availableLocationOptions.length === 0
                  ? locationIds.length > 0
                    ? "All locations added"
                    : "No locations available"
                  : "Add location"}
            </Text>
          </Pressable>
        </AdminFormField>
      </AdminFormSection>

      <AdminPickerSheet
        visible={showLocationPicker}
        title="Add location"
        options={availableLocationOptions}
        loading={pickersLoading}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(opt) => addLocation(opt.id)}
        testID="supplier-form-location-picker"
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    flexShrink: 1,
  },
  emptyLocations: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  addLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  addLocationBtnDisabled: { opacity: 0.5 },
  addLocationText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
});
