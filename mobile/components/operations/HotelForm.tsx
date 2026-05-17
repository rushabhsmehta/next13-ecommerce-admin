import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
  type HotelInput,
  type OpsDestination,
  type OpsLocation,
} from "@/lib/operations";
import { OperationsImageGallery } from "@/components/operations/OperationsImageGallery";
import { LookupPickerModal } from "@/components/inquiry/LookupPickerModal";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";

interface InitialValues {
  name: string;
  locationId: string;
  locationLabel: string;
  destinationId: string;
  destinationLabel: string;
  link: string;
  images: { url: string }[];
}

const EMPTY: InitialValues = {
  name: "",
  locationId: "",
  locationLabel: "",
  destinationId: "",
  destinationLabel: "",
  link: "",
  images: [],
};

interface Props {
  mode: "create" | "edit";
  hotelId?: string;
  initial?: InitialValues;
  defaultLocationId?: string;
}

export function HotelForm({ mode, hotelId, initial, defaultLocationId }: Props) {
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
  const [locationId, setLocationId] = useState(
    seed.locationId || defaultLocationId || ""
  );
  const [locationLabel, setLocationLabel] = useState(seed.locationLabel);
  const [destinationId, setDestinationId] = useState(seed.destinationId);
  const [destinationLabel, setDestinationLabel] = useState(seed.destinationLabel);
  const [link, setLink] = useState(seed.link);
  const [images, setImages] = useState<{ url: string }[]>(seed.images);
  const [submitting, setSubmitting] = useState(false);

  const [locationOptions, setLocationOptions] = useState<InquiryLookupOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<InquiryLookupOption[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

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
      // ignore
    }
  }, [client, defaultLocationId, locationLabel]);

  const loadDestinations = useCallback(
    async (locId: string) => {
      if (!locId) {
        setDestinationOptions([]);
        return;
      }
      try {
        const res = await client.listDestinations({ locationId: locId, limit: 100 });
        setDestinationOptions(
          res.items.map((d: OpsDestination) => ({ id: d.id, label: d.name }))
        );
      } catch {
        setDestinationOptions([]);
      }
    },
    [client]
  );

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    void loadDestinations(locationId);
  }, [locationId, loadDestinations]);

  function onLocationSelect(id: string) {
    const opt = locationOptions.find((o) => o.id === id);
    setLocationId(id);
    setLocationLabel(opt?.label ?? "");
    setDestinationId("");
    setDestinationLabel("");
  }

  const canSubmit =
    name.trim().length > 0 &&
    locationId.length > 0 &&
    images.length > 0 &&
    !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: HotelInput = {
        name: name.trim(),
        locationId,
        destinationId: destinationId || null,
        link: link.trim() || null,
        images,
      };
      if (mode === "create") {
        const saved = await client.createHotel(payload);
        router.replace(`/admin/operations/hotels/${saved.id}` as never);
      } else if (hotelId) {
        await client.updateHotel(hotelId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the hotel.`
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
          title: mode === "create" ? "New hotel" : "Edit hotel",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="hotel-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New hotel" : "Edit hotel"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Photos *</Text>
        <OperationsImageGallery
          testID="hotel-form-gallery"
          images={images}
          onChange={setImages}
          getToken={() => getTokenRef.current()}
        />

        <Text style={styles.label}>Hotel name *</Text>
        <TextInput
          testID="hotel-form-name"
          accessibilityLabel="Hotel name"
          style={styles.input}
          placeholder="e.g. Taj Exotica"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={200}
        />

        <Text style={styles.label}>Location *</Text>
        <Pressable
          testID="hotel-form-location"
          accessibilityRole="button"
          accessibilityLabel="Choose location"
          style={styles.pickerBtn}
          onPress={() => setShowLocationPicker(true)}
        >
          <Text style={locationId ? styles.pickerValue : styles.pickerPlaceholder}>
            {locationLabel || "Select location…"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
        </Pressable>

        <Text style={styles.label}>Destination (optional)</Text>
        <Pressable
          testID="hotel-form-destination"
          accessibilityRole="button"
          accessibilityLabel="Choose destination"
          style={[styles.pickerBtn, !locationId ? styles.pickerDisabled : null]}
          onPress={() => locationId && setShowDestinationPicker(true)}
          disabled={!locationId}
        >
          <Text
            style={
              destinationId || destinationLabel
                ? styles.pickerValue
                : styles.pickerPlaceholder
            }
          >
            {destinationLabel || "None / select destination…"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
        </Pressable>
        {destinationId ? (
          <Pressable
            testID="hotel-form-clear-destination"
            accessibilityRole="button"
            accessibilityLabel="Clear destination"
            onPress={() => {
              setDestinationId("");
              setDestinationLabel("");
            }}
          >
            <Text style={styles.clearLink}>Clear destination</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Booking link</Text>
        <TextInput
          testID="hotel-form-link"
          accessibilityLabel="Booking link URL"
          style={styles.input}
          placeholder="https://… (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="hotel-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create hotel" : "Save changes"}
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
                {mode === "create" ? "Create hotel" : "Save changes"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <LookupPickerModal
        visible={showLocationPicker}
        title="Location"
        options={locationOptions}
        testID="hotel-location-picker"
        onClose={() => setShowLocationPicker(false)}
        onSelect={(id) => {
          onLocationSelect(id);
        }}
      />
      <LookupPickerModal
        visible={showDestinationPicker}
        title="Destination"
        options={destinationOptions}
        testID="hotel-destination-picker"
        onClose={() => setShowDestinationPicker(false)}
        onSelect={(id) => {
          const opt = destinationOptions.find((o) => o.id === id);
          setDestinationId(id);
          setDestinationLabel(opt?.label ?? "");
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
  pickerDisabled: { opacity: 0.5 },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  clearLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
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
