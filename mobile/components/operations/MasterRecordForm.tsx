import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createOperationsClient,
  type OpsActivityInput,
  type OpsActivityMaster,
  type OpsItineraryInput,
  type OpsItineraryMaster,
} from "@/lib/operations";
import type { InquiryLookupOption } from "@/lib/inquiry-lookups";
import {
  AdminBottomActionBar,
  AdminFormField,
  AdminFormSection,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";

type Mode = "create" | "edit";
type Kind = "itinerary" | "activity";

interface Props {
  kind: Kind;
  mode: Mode;
  recordId?: string;
  initial?: OpsItineraryMaster | OpsActivityMaster;
}

function titleFor(kind: Kind, mode: Mode) {
  const noun = kind === "itinerary" ? "itinerary" : "activity";
  return mode === "create" ? `New ${noun}` : `Edit ${noun}`;
}

export function MasterRecordForm({ kind, mode, recordId, initial }: Props) {
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
  const request = useMemo(() => withAuth(() => getTokenRef.current()), []);

  const itineraryInitial =
    kind === "itinerary" ? (initial as OpsItineraryMaster | undefined) : undefined;

  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [locationLabel, setLocationLabel] = useState(initial?.locationLabel ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.images?.[0]?.url ?? "");
  const [dayNumber, setDayNumber] = useState(
    itineraryInitial?.dayNumber != null
      ? String(itineraryInitial.dayNumber)
      : ""
  );
  const [days, setDays] = useState(itineraryInitial?.days ?? "");
  const [locations, setLocations] = useState<InquiryLookupOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      const res = await request<{ items: { id: string; name: string }[] }>(
        "/api/mobile/operations/list?type=locations&limit=100"
      );
      setLocations(res.items.map((l) => ({ id: l.id, label: l.name })));
    } catch {
      // Keep any existing location value usable.
    }
  }, [request]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const canSubmit =
    !!locationId && title.trim().length > 0 && description.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    const images = imageUrl.trim() ? [{ url: imageUrl.trim() }] : [];
    setSubmitting(true);
    try {
      if (kind === "itinerary") {
        const input: OpsItineraryInput = {
          locationId,
          itineraryMasterTitle: title.trim(),
          itineraryMasterDescription: description.trim(),
          dayNumber: dayNumber.trim() ? Number(dayNumber) : null,
          days: days.trim() || null,
          images,
        };
        if (mode === "create") await client.createItinerary(input);
        else if (recordId) await client.updateItinerary(recordId, input);
        router.replace("/admin/operations/itineraries" as never);
      } else {
        const input: OpsActivityInput = {
          locationId,
          activityMasterTitle: title.trim(),
          activityMasterDescription: description.trim(),
          images,
        };
        if (mode === "create") await client.createActivity(input);
        else if (recordId) await client.updateActivity(recordId, input);
        router.replace("/admin/operations/activities" as never);
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save this record."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const locationOptions = useMemo(
    () => locations.map((l) => ({ id: l.id, label: l.label })),
    [locations]
  );

  return (
    <AdminScreen
      keyboardAvoiding
      testID={`${kind}-form-screen`}
      footer={
        <AdminBottomActionBar
          primaryLabel="Save"
          primaryIcon="save-outline"
          primaryTestID={`${kind}-form-submit`}
          primaryDisabled={!canSubmit}
          disabledReason={!locationId ? "Select a location." : !title.trim() ? "Enter a title." : submitting ? "Saving…" : undefined}
          onPrimaryPress={submit}
        />
      }
    >
      <Stack.Screen options={{ title: titleFor(kind, mode), headerShown: false }} />
      <AdminTopBar
        title={titleFor(kind, mode)}
        onBackPress={() => router.back()}
        testID={`${kind}-form-back`}
      />

      <AdminFormSection title="Details" testID={`${kind}-form-details`}>
        <AdminFormField label="Location" required>
          <Pressable
            testID={`${kind}-form-location`}
            accessibilityRole="button"
            accessibilityLabel="Choose location"
            style={styles.pickerBtn}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={locationId ? styles.pickerValue : styles.pickerPlaceholder}>
              {locationLabel || "Select location"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
          </Pressable>
        </AdminFormField>

        <AdminFormField label="Title" required>
        <TextInput
          testID={`${kind}-form-title`}
          accessibilityLabel="Title"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={kind === "itinerary" ? "Day in Goa" : "Dudhsagar Falls"}
          placeholderTextColor={Colors.textTertiary}
        />
        </AdminFormField>

        <AdminFormField label="Description" required>
        <TextInput
          testID={`${kind}-form-description`}
          accessibilityLabel="Description"
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add the customer-facing description"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />
        </AdminFormField>

        {kind === "itinerary" ? (
          <View style={styles.inlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Day number</Text>
              <TextInput
                testID="itinerary-form-day-number"
                accessibilityLabel="Day number"
                style={styles.input}
                value={dayNumber}
                onChangeText={setDayNumber}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Days label</Text>
              <TextInput
                testID="itinerary-form-days"
                accessibilityLabel="Days label"
                style={styles.input}
                value={days}
                onChangeText={setDays}
                placeholder="Day 1"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
        ) : null}

        <AdminFormField label="Image URL">
        <TextInput
          testID={`${kind}-form-image-url`}
          accessibilityLabel="Image URL"
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://..."
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
        />
        </AdminFormField>
      </AdminFormSection>

      <AdminPickerSheet
        visible={pickerOpen}
        title="Location"
        options={locationOptions}
        selectedId={locationId}
        onClose={() => setPickerOpen(false)}
        onSelect={(opt) => {
          setLocationId(opt.id);
          setLocationLabel(opt.label);
        }}
        testID={`${kind}-location-picker`}
      />
    </AdminScreen>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
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
  textarea: { minHeight: 110, textAlignVertical: "top" },
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
  inlineRow: { flexDirection: "row", gap: Spacing.sm },
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
