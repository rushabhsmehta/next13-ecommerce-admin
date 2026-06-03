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
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  createOperationsClient,
  type HotelInput,
  type OpsDestination,
  type OpsLocation,
} from "@/lib/operations";
import { OperationsImageGallery } from "@/components/operations/OperationsImageGallery";

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

  const [locationOptions, setLocationOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [destinationOptions, setDestinationOptions] = useState<
    { id: string; label: string }[]
  >([]);
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

  const screenTitle = mode === "create" ? "New hotel" : "Edit hotel";
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
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "hotel-new-screen" : "hotel-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create hotel" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="hotel-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !name.trim()
              ? "Enter a hotel name."
              : !locationId
                ? "Select a location."
                : images.length === 0
                  ? "Add at least one photo."
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
        subtitle="Hotel"
        onBackPress={() => router.back()}
        testID="hotel-form"
      />

      <AdminFormSection title="Photos" testID="hotel-form-photos">
        <OperationsImageGallery
          testID="hotel-form-gallery"
          images={images}
          onChange={setImages}
          getToken={() => getTokenRef.current()}
        />
      </AdminFormSection>

      <AdminFormSection title="Details" testID="hotel-form-details">
        <AdminFormField label="Hotel name" required>
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
        </AdminFormField>

        <AdminFormField label="Location" required>
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
        </AdminFormField>

        <AdminFormField label="Destination" hint="Optional.">
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
              style={styles.clearBtn}
            >
              <Text style={styles.clearLink}>Clear destination</Text>
            </Pressable>
          ) : null}
        </AdminFormField>

        <AdminFormField label="Booking link">
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
        </AdminFormField>
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
          setDestinationId("");
          setDestinationLabel("");
        }}
        testID="hotel-location-picker"
      />
      <AdminPickerSheet
        visible={showDestinationPicker}
        title="Destination"
        options={destinationOptions}
        selectedId={destinationId}
        onClose={() => setShowDestinationPicker(false)}
        onSelect={(opt) => {
          setDestinationId(opt.id);
          setDestinationLabel(opt.label);
        }}
        testID="hotel-destination-picker"
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
  pickerDisabled: { opacity: 0.5 },
  pickerValue: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: "600" },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textTertiary },
  clearBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  clearLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },
});
