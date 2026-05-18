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
import { createOperationsClient, type LocationInput } from "@/lib/operations";
import { OperationsImagePicker } from "@/components/operations/OperationsImagePicker";

interface InitialValues {
  label: string;
  imageUrl: string;
  slug: string;
  tags: string;
  isActive: boolean;
}

const EMPTY: InitialValues = {
  label: "",
  imageUrl: "",
  slug: "",
  tags: "",
  isActive: true,
};

interface Props {
  mode: "create" | "edit";
  locationId?: string;
  initial?: InitialValues;
}

export function LocationForm({ mode, locationId, initial }: Props) {
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
  const [label, setLabel] = useState(seed.label);
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [slug, setSlug] = useState(seed.slug);
  const [tags, setTags] = useState(seed.tags);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);

  const screenTitle = mode === "create" ? "New location" : "Edit location";
  const canSubmit = label.trim().length > 0 && imageUrl.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: LocationInput = {
        label: label.trim(),
        imageUrl: imageUrl.trim(),
        slug: slug.trim() || null,
        tags: tags.trim() || null,
        isActive,
      };
      if (mode === "create") {
        const saved = await client.createLocation(payload);
        router.replace(`/admin/operations/locations/${saved.id}` as never);
      } else if (locationId) {
        await client.updateLocation(locationId, payload);
        router.back();
      }
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError
          ? err.message
          : `Could not ${mode === "create" ? "create" : "update"} the location.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "location-new-screen" : "location-edit-screen"}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create location" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="location-form-submit"
          primaryDisabled={!canSubmit}
          disabledReason={
            !label.trim()
              ? "Enter a location label."
              : !imageUrl.trim()
                ? "Add a hero image."
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
        subtitle="Location"
        onBackPress={() => router.back()}
        testID="location-form"
      />

      <AdminFormSection title="Media" testID="location-form-media">
        <AdminFormField label="Hero image" required>
          <OperationsImagePicker
            testID="location-form-image"
            accessibilityLabel="Location hero image"
            value={imageUrl}
            onChange={setImageUrl}
            getToken={() => getTokenRef.current()}
            required
          />
        </AdminFormField>
      </AdminFormSection>

      <AdminFormSection title="Details" testID="location-form-details">
        <AdminFormField label="Label" required>
          <TextInput
            testID="location-form-label"
            accessibilityLabel="Location label"
            style={styles.input}
            placeholder="e.g. Goa"
            placeholderTextColor={Colors.textTertiary}
            value={label}
            onChangeText={setLabel}
            autoCapitalize="words"
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Slug" hint="Optional URL slug.">
          <TextInput
            testID="location-form-slug"
            accessibilityLabel="URL slug"
            style={styles.input}
            placeholder="goa (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </AdminFormField>
        <AdminFormField label="Tags" hint="Optional comma-separated tags.">
          <TextInput
            testID="location-form-tags"
            accessibilityLabel="Tags"
            style={[styles.input, styles.textarea]}
            placeholder="Optional comma-separated tags"
            placeholderTextColor={Colors.textTertiary}
            value={tags}
            onChangeText={setTags}
            multiline
          />
        </AdminFormField>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="location-form-active"
            accessibilityLabel="Active location"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
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
  textarea: { minHeight: 72, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
});
