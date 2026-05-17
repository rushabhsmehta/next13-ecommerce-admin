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
  const [label, setLabel] = useState(seed.label);
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [slug, setSlug] = useState(seed.slug);
  const [tags, setTags] = useState(seed.tags);
  const [isActive, setIsActive] = useState(seed.isActive);
  const [submitting, setSubmitting] = useState(false);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: mode === "create" ? "New location" : "Edit location",
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="location-form-back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === "create" ? "New location" : "Edit location"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Hero image *</Text>
        <OperationsImagePicker
          testID="location-form-image"
          accessibilityLabel="Location hero image"
          value={imageUrl}
          onChange={setImageUrl}
          getToken={() => getTokenRef.current()}
          required
        />

        <Text style={styles.label}>Label *</Text>
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

        <Text style={styles.label}>Slug</Text>
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

        <Text style={styles.label}>Tags</Text>
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            testID="location-form-active"
            accessibilityLabel="Active location"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          testID="location-form-submit"
          accessibilityRole="button"
          accessibilityLabel={mode === "create" ? "Create location" : "Save changes"}
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
                {mode === "create" ? "Create location" : "Save changes"}
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
  textarea: { minHeight: 72, textAlignVertical: "top" },
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
