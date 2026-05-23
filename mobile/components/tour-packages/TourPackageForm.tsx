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
import { useAuth } from "@clerk/clerk-expo";
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
import { createOperationsClient, type OpsLocation } from "@/lib/operations";
import { OperationsImageGallery } from "@/components/operations/OperationsImageGallery";
import { PolicyListEditor } from "@/components/tour-packages/PolicyListEditor";
import {
  createTourPackagesClient,
  type TourPackageInput,
  type TourPackageItineraryDayInput,
  type TourPackagePricingSectionRow,
} from "@/lib/tour-packages";

export interface TourPackageFormInitial {
  locationId: string;
  locationLabel: string;
  tourPackageName: string;
  tourPackageType: string;
  tourCategory: string;
  numDaysNight: string;
  transport: string;
  pickup_location: string;
  drop_location: string;
  price: string;
  itineraries: TourPackageItineraryDayInput[];
  images: { url: string }[];
  pricingSection: TourPackagePricingSectionRow[];
  inclusions: string[];
  exclusions: string[];
  importantNotes: string[];
  paymentPolicy: string[];
  usefulTip: string[];
  cancellationPolicy: string[];
  airlineCancellationPolicy: string[];
  termsconditions: string[];
  kitchenGroupPolicy: string[];
}

const EMPTY: TourPackageFormInitial = {
  locationId: "",
  locationLabel: "",
  tourPackageName: "",
  tourPackageType: "",
  tourCategory: "Domestic",
  numDaysNight: "",
  transport: "",
  pickup_location: "",
  drop_location: "",
  price: "",
  itineraries: [],
  images: [],
  pricingSection: [],
  inclusions: [],
  exclusions: [],
  importantNotes: [],
  paymentPolicy: [],
  usefulTip: [],
  cancellationPolicy: [],
  airlineCancellationPolicy: [],
  termsconditions: [],
  kitchenGroupPolicy: [],
};

const CATEGORY_OPTIONS = [
  { id: "Domestic", label: "Domestic" },
  { id: "International", label: "International" },
];

interface Props {
  mode: "create" | "edit";
  packageId?: string;
  initial?: TourPackageFormInitial;
  defaultLocationId?: string;
}

export function TourPackageForm({
  mode,
  packageId,
  initial,
  defaultLocationId,
}: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const opsClient = useMemo(
    () => createOperationsClient(withAuth(() => getTokenRef.current())),
    []
  );
  const pkgClient = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const seed = initial ?? EMPTY;
  const [locationId, setLocationId] = useState(
    seed.locationId || defaultLocationId || ""
  );
  const [locationLabel, setLocationLabel] = useState(seed.locationLabel);
  const [tourPackageName, setTourPackageName] = useState(seed.tourPackageName);
  const [tourPackageType, setTourPackageType] = useState(seed.tourPackageType);
  const [tourCategory, setTourCategory] = useState(seed.tourCategory || "Domestic");
  const [numDaysNight, setNumDaysNight] = useState(seed.numDaysNight);
  const [transport, setTransport] = useState(seed.transport);
  const [pickupLocation, setPickupLocation] = useState(seed.pickup_location);
  const [dropLocation, setDropLocation] = useState(seed.drop_location);
  const [price, setPrice] = useState(seed.price);
  const [itineraries, setItineraries] = useState<TourPackageItineraryDayInput[]>(
    seed.itineraries
  );
  const [images, setImages] = useState<{ url: string }[]>(seed.images);
  const [pricingSection, setPricingSection] = useState<TourPackagePricingSectionRow[]>(
    seed.pricingSection
  );
  const [inclusions, setInclusions] = useState<string[]>(seed.inclusions);
  const [exclusions, setExclusions] = useState<string[]>(seed.exclusions);
  const [importantNotes, setImportantNotes] = useState<string[]>(seed.importantNotes);
  const [paymentPolicy, setPaymentPolicy] = useState<string[]>(seed.paymentPolicy);
  const [usefulTip, setUsefulTip] = useState<string[]>(seed.usefulTip);
  const [cancellationPolicy, setCancellationPolicy] = useState<string[]>(
    seed.cancellationPolicy
  );
  const [airlineCancellationPolicy, setAirlineCancellationPolicy] = useState<string[]>(
    seed.airlineCancellationPolicy
  );
  const [termsconditions, setTermsconditions] = useState<string[]>(seed.termsconditions);
  const [kitchenGroupPolicy, setKitchenGroupPolicy] = useState<string[]>(
    seed.kitchenGroupPolicy
  );
  const [submitting, setSubmitting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const res = await opsClient.listLocations({ limit: 100 });
      setLocationOptions(res.items.map((l: OpsLocation) => ({ id: l.id, label: l.label })));
      if (defaultLocationId && !locationLabel) {
        const match = res.items.find((l) => l.id === defaultLocationId);
        if (match) {
          setLocationId(match.id);
          setLocationLabel(match.label);
        }
      }
    } catch {
      /* ignore */
    }
  }, [opsClient, defaultLocationId, locationLabel]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const screenTitle = mode === "create" ? "New package" : "Edit package";
  const canSubmit =
    tourPackageName.trim().length > 0 && locationId.length > 0 && !submitting;

  function addDay() {
    setItineraries((prev) => [
      ...prev,
      {
        dayNumber: prev.length + 1,
        itineraryTitle: `Day ${prev.length + 1}`,
        itineraryDescription: "",
        mealsIncluded: "",
      },
    ]);
  }

  function updateDay(
    index: number,
    patch: Partial<TourPackageItineraryDayInput>
  ) {
    setItineraries((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day))
    );
  }

  function removeDay(index: number) {
    setItineraries((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((day, i) => ({ ...day, dayNumber: i + 1 }))
    );
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: TourPackageInput = {
        locationId,
        tourPackageName: tourPackageName.trim(),
        tourPackageType: tourPackageType.trim() || null,
        tourCategory: tourCategory.trim() || "Domestic",
        numDaysNight: numDaysNight.trim() || null,
        transport: transport.trim() || null,
        pickup_location: pickupLocation.trim() || null,
        drop_location: dropLocation.trim() || null,
        price: price.trim() || null,
        itineraries: itineraries.map((day) => ({
          dayNumber: day.dayNumber,
          itineraryTitle: day.itineraryTitle.trim(),
          itineraryDescription: day.itineraryDescription?.trim() || null,
          mealsIncluded: day.mealsIncluded?.trim() || null,
        })),
        images: images.filter((img) => img.url.trim()),
        pricingSection: pricingSection
          .filter((row) => row.name.trim())
          .map((row) => ({
            name: row.name.trim(),
            price: row.price?.trim() || null,
            description: row.description?.trim() || null,
          })),
        inclusions: inclusions.map((v) => v.trim()).filter(Boolean),
        exclusions: exclusions.map((v) => v.trim()).filter(Boolean),
        importantNotes: importantNotes.map((v) => v.trim()).filter(Boolean),
        paymentPolicy: paymentPolicy.map((v) => v.trim()).filter(Boolean),
        usefulTip: usefulTip.map((v) => v.trim()).filter(Boolean),
        cancellationPolicy: cancellationPolicy.map((v) => v.trim()).filter(Boolean),
        airlineCancellationPolicy: airlineCancellationPolicy
          .map((v) => v.trim())
          .filter(Boolean),
        termsconditions: termsconditions.map((v) => v.trim()).filter(Boolean),
        kitchenGroupPolicy: kitchenGroupPolicy.map((v) => v.trim()).filter(Boolean),
      };

      if (mode === "create") {
        const saved = await pkgClient.create(payload);
        router.replace(
          `/admin/operations/tour-packages/${saved.id}` as never
        );
      } else if (packageId) {
        await pkgClient.update(packageId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the package.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={
        mode === "create" ? "tour-package-new-screen" : "tour-package-edit-screen"
      }
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create package" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="tour-package-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !tourPackageName.trim()
              ? "Enter a package name."
              : !locationId
                ? "Select a destination location."
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
        subtitle="Tour package"
        onBackPress={() => router.back()}
        testID="tour-package-form-header"
      />

      <AdminFormSection title="Basics" testID="tour-package-form-basics">
        <AdminFormField label="Package name" required>
          <TextInput
            testID="tour-package-form-name"
            accessibilityLabel="Package name"
            style={styles.input}
            placeholder="e.g. 5N/6D Himachal Family Escape"
            placeholderTextColor={Colors.textTertiary}
            value={tourPackageName}
            onChangeText={setTourPackageName}
            autoCapitalize="words"
            maxLength={300}
          />
        </AdminFormField>

        <AdminFormField label="Destination location" required>
          <Pressable
            testID="tour-package-form-location"
            accessibilityRole="button"
            accessibilityLabel="Select destination location"
            style={styles.pickerBtn}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text
              style={locationLabel ? styles.pickerValue : styles.pickerPlaceholder}
              numberOfLines={1}
            >
              {locationLabel || "Choose location"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>

        <AdminFormField label="Category">
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((opt) => {
              const active = tourCategory === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`tour-package-form-category-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setTourCategory(opt.id)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AdminFormField>

        <AdminFormField label="Package type">
          <TextInput
            testID="tour-package-form-type"
            accessibilityLabel="Package type"
            style={styles.input}
            placeholder="e.g. Honeymoon, Family, Adventure"
            placeholderTextColor={Colors.textTertiary}
            value={tourPackageType}
            onChangeText={setTourPackageType}
            autoCapitalize="words"
            maxLength={100}
          />
        </AdminFormField>

        <AdminFormField label="Duration">
          <TextInput
            testID="tour-package-form-duration"
            accessibilityLabel="Duration"
            style={styles.input}
            placeholder="e.g. 5 Nights / 6 Days"
            placeholderTextColor={Colors.textTertiary}
            value={numDaysNight}
            onChangeText={setNumDaysNight}
            maxLength={100}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Travel & pricing" testID="tour-package-form-travel">
        <AdminFormField label="Transport">
          <TextInput
            testID="tour-package-form-transport"
            accessibilityLabel="Transport"
            style={styles.input}
            placeholder="e.g. Surface, Flight + Surface"
            placeholderTextColor={Colors.textTertiary}
            value={transport}
            onChangeText={setTransport}
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Pickup location">
          <TextInput
            testID="tour-package-form-pickup"
            accessibilityLabel="Pickup location"
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            maxLength={300}
          />
        </AdminFormField>
        <AdminFormField label="Drop location">
          <TextInput
            testID="tour-package-form-drop"
            accessibilityLabel="Drop location"
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={Colors.textTertiary}
            value={dropLocation}
            onChangeText={setDropLocation}
            maxLength={300}
          />
        </AdminFormField>
        <AdminFormField label="Starting price">
          <TextInput
            testID="tour-package-form-price"
            accessibilityLabel="Starting price"
            style={styles.input}
            placeholder="e.g. ₹15,999 per person"
            placeholderTextColor={Colors.textTertiary}
            value={price}
            onChangeText={setPrice}
            maxLength={100}
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Photos" testID="tour-package-form-photos">
        <OperationsImageGallery
          testID="tour-package-form-gallery"
          images={images}
          onChange={setImages}
          getToken={() => getTokenRef.current()}
        />
      </AdminFormSection>

      <AdminFormSection title="Itinerary" testID="tour-package-form-itinerary">
        {itineraries.length === 0 ? (
          <Text style={styles.emptyHint}>
            Add day-wise plans now, or leave blank and fill in on the web dashboard later.
          </Text>
        ) : null}
        {itineraries.map((day, index) => (
          <View key={`day-${index}`} style={styles.dayCard} testID={`tour-package-day-${index + 1}`}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>
              <Pressable
                testID={`tour-package-day-remove-${index + 1}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove day ${day.dayNumber}`}
                onPress={() => removeDay(index)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
            <AdminFormField label="Title">
              <TextInput
                testID={`tour-package-day-title-${index + 1}`}
                style={styles.input}
                value={day.itineraryTitle}
                onChangeText={(text) => updateDay(index, { itineraryTitle: text })}
                placeholder="Day title"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
            <AdminFormField label="Description">
              <TextInput
                testID={`tour-package-day-desc-${index + 1}`}
                style={[styles.input, styles.textarea]}
                value={day.itineraryDescription ?? ""}
                onChangeText={(text) =>
                  updateDay(index, { itineraryDescription: text })
                }
                placeholder="What happens on this day?"
                placeholderTextColor={Colors.textTertiary}
                multiline
              />
            </AdminFormField>
            <AdminFormField label="Meals included">
              <TextInput
                testID={`tour-package-day-meals-${index + 1}`}
                style={styles.input}
                value={day.mealsIncluded ?? ""}
                onChangeText={(text) => updateDay(index, { mealsIncluded: text })}
                placeholder="e.g. Breakfast, Dinner"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
          </View>
        ))}
        <Pressable
          testID="tour-package-form-add-day"
          accessibilityRole="button"
          accessibilityLabel="Add itinerary day"
          style={styles.addDayBtn}
          onPress={addDay}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addDayText}>Add day</Text>
        </Pressable>
      </AdminFormSection>

      <AdminFormSection title="Pricing table" testID="tour-package-form-pricing-section">
        {pricingSection.length === 0 ? (
          <Text style={styles.emptyHint}>
            Optional rows shown on the package detail page (e.g. per-person rates).
          </Text>
        ) : null}
        {pricingSection.map((row, index) => (
          <View key={`pricing-row-${index}`} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Row {index + 1}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove pricing row ${index + 1}`}
                onPress={() =>
                  setPricingSection((prev) => prev.filter((_, i) => i !== index))
                }
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
            <AdminFormField label="Name">
              <TextInput
                style={styles.input}
                value={row.name}
                onChangeText={(text) =>
                  setPricingSection((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, name: text } : r))
                  )
                }
                placeholder="e.g. Standard"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
            <AdminFormField label="Price">
              <TextInput
                style={styles.input}
                value={row.price ?? ""}
                onChangeText={(text) =>
                  setPricingSection((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, price: text } : r))
                  )
                }
                placeholder="e.g. ₹12,999"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
            <AdminFormField label="Description">
              <TextInput
                style={styles.input}
                value={row.description ?? ""}
                onChangeText={(text) =>
                  setPricingSection((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, description: text } : r))
                  )
                }
                placeholder="Optional"
                placeholderTextColor={Colors.textTertiary}
              />
            </AdminFormField>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add pricing row"
          style={styles.addDayBtn}
          onPress={() =>
            setPricingSection((prev) => [...prev, { name: "", price: "", description: "" }])
          }
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addDayText}>Add pricing row</Text>
        </Pressable>
      </AdminFormSection>

      <AdminFormSection title="Policies" testID="tour-package-form-policies">
        <PolicyListEditor
          title="Inclusions"
          items={inclusions}
          onChange={setInclusions}
          testID="tour-package-policy-inclusions"
        />
        <PolicyListEditor
          title="Exclusions"
          items={exclusions}
          onChange={setExclusions}
          testID="tour-package-policy-exclusions"
        />
        <PolicyListEditor
          title="Important notes"
          items={importantNotes}
          onChange={setImportantNotes}
          testID="tour-package-policy-notes"
        />
        <PolicyListEditor
          title="Payment policy"
          items={paymentPolicy}
          onChange={setPaymentPolicy}
          testID="tour-package-policy-payment"
        />
        <PolicyListEditor
          title="Useful tips"
          items={usefulTip}
          onChange={setUsefulTip}
          testID="tour-package-policy-tips"
        />
        <PolicyListEditor
          title="Cancellation policy"
          items={cancellationPolicy}
          onChange={setCancellationPolicy}
          testID="tour-package-policy-cancellation"
        />
        <PolicyListEditor
          title="Airline cancellation"
          items={airlineCancellationPolicy}
          onChange={setAirlineCancellationPolicy}
          testID="tour-package-policy-airline"
        />
        <PolicyListEditor
          title="Terms & conditions"
          items={termsconditions}
          onChange={setTermsconditions}
          testID="tour-package-policy-terms"
        />
        <PolicyListEditor
          title="Kitchen / group policy"
          items={kitchenGroupPolicy}
          onChange={setKitchenGroupPolicy}
          testID="tour-package-policy-kitchen"
        />
      </AdminFormSection>

      <AdminPickerSheet
        visible={showLocationPicker}
        title="Destination location"
        options={locationOptions}
        selectedId={locationId || null}
        onSelect={(opt) => {
          setLocationId(opt.id);
          setLocationLabel(opt.label);
          setShowLocationPicker(false);
        }}
        onClose={() => setShowLocationPicker(false)}
        testID="tour-package-location-picker"
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  pickerValue: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerPlaceholder: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: Colors.primary,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 20,
  },
  dayCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  addDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: Spacing.sm,
  },
  addDayText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
});
