import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createCatalogAdminClient,
  type CatalogProductInput,
} from "@/lib/whatsapp-catalog-admin";

const STATUSES: { id: "draft" | "active" | "archived"; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

export default function NewCatalogProduct() {
  return (
    <PermissionGate permission="communications.write">
      <OfflineGate policy="online_only">
        <Inner />
      </OfflineGate>
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const client = useMemo(
    () => createCatalogAdminClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [durationNights, setDurationNights] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [busy, setBusy] = useState<"create" | "create-sync" | null>(null);

  function buildInput(): CatalogProductInput | null {
    if (!title.trim()) {
      Alert.alert("Title required", "Provide a title for the catalog product.");
      return null;
    }
    const input: CatalogProductInput = { title: title.trim() };
    if (subtitle.trim()) input.subtitle = subtitle.trim();
    if (description.trim()) input.description = description.trim();
    if (location.trim()) input.location = location.trim();
    if (heroImageUrl.trim()) input.heroImageUrl = heroImageUrl.trim();
    if (durationDays.trim()) {
      const n = Number.parseInt(durationDays, 10);
      if (Number.isFinite(n) && n > 0) input.durationDays = n;
    }
    if (durationNights.trim()) {
      const n = Number.parseInt(durationNights, 10);
      if (Number.isFinite(n) && n >= 0) input.durationNights = n;
    }
    if (basePrice.trim()) {
      const n = Number.parseFloat(basePrice);
      if (Number.isFinite(n) && n >= 0) input.basePrice = n;
    }
    if (currency.trim()) input.currency = currency.trim().toUpperCase();
    input.status = status;
    return input;
  }

  async function submit(syncAfter: boolean) {
    const input = buildInput();
    if (!input) return;
    setBusy(syncAfter ? "create-sync" : "create");
    try {
      const res = await client.create(input);
      if (syncAfter) {
        try {
          await client.sync(res.tourPackage.id);
        } catch (err) {
          Alert.alert(
            "Created but sync failed",
            err instanceof Error ? err.message : "Sync to Meta failed."
          );
        }
      }
      Alert.alert("Created", "Catalog product created.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Could not create",
        err instanceof ApiError ? err.message : "Catalog create failed."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="wa-catalog-new-screen"
    >
      <Stack.Screen options={{ title: "New product" }} />

      <Section title="Basics">
        <Field label="Title" testID="wa-cat-title" value={title} onChange={setTitle} placeholder="Goa Honeymoon Special" />
        <Field label="Subtitle" testID="wa-cat-subtitle" value={subtitle} onChange={setSubtitle} placeholder="4 nights 5 days" />
        <Field
          label="Description"
          testID="wa-cat-desc"
          value={description}
          onChange={setDescription}
          placeholder="What's included, highlights, etc."
          multiline
        />
        <Field label="Location" testID="wa-cat-location" value={location} onChange={setLocation} placeholder="Goa" />
      </Section>

      <Section title="Hero image">
        <Field
          label="Hero image URL"
          testID="wa-cat-hero"
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          placeholder="Paste a public image URL"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>
          Tip: upload to the WhatsApp Media library and copy the URL from there.
        </Text>
      </Section>

      <Section title="Duration & pricing">
        <View style={styles.row}>
          <Field
            label="Days"
            testID="wa-cat-days"
            value={durationDays}
            onChange={setDurationDays}
            placeholder="5"
            keyboardType="number-pad"
            flex
          />
          <Field
            label="Nights"
            testID="wa-cat-nights"
            value={durationNights}
            onChange={setDurationNights}
            placeholder="4"
            keyboardType="number-pad"
            flex
          />
        </View>
        <View style={styles.row}>
          <Field
            label="Base price"
            testID="wa-cat-price"
            value={basePrice}
            onChange={setBasePrice}
            placeholder="25000"
            keyboardType="decimal-pad"
            flex
          />
          <Field
            label="Currency"
            testID="wa-cat-currency"
            value={currency}
            onChange={setCurrency}
            placeholder="INR"
            autoCapitalize="characters"
            flex
          />
        </View>
      </Section>

      <Section title="Status">
        <View style={styles.pickerRow}>
          {STATUSES.map((opt) => {
            const active = opt.id === status;
            return (
              <Pressable
                key={opt.id}
                testID={`wa-cat-status-${opt.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => setStatus(opt.id)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Pressable
        testID="wa-cat-create"
        accessibilityRole="button"
        accessibilityLabel="Create catalog product"
        disabled={busy !== null}
        style={[styles.submit, busy !== null ? styles.disabled : null]}
        onPress={() => void submit(false)}
      >
        {busy === "create" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
        <Text style={styles.submitText}>
          {busy === "create" ? "Creating…" : "Create"}
        </Text>
      </Pressable>

      <Pressable
        testID="wa-cat-create-sync"
        accessibilityRole="button"
        accessibilityLabel="Create and sync to Meta"
        disabled={busy !== null}
        style={[styles.secondary, busy !== null ? styles.disabled : null]}
        onPress={() => void submit(true)}
      >
        {busy === "create-sync" ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
        )}
        <Text style={styles.secondaryText}>
          {busy === "create-sync" ? "Creating & syncing…" : "Create + sync to Meta"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field(props: {
  label: string;
  testID: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "characters";
  flex?: boolean;
}) {
  return (
    <View style={[styles.field, props.flex ? { flex: 1 } : null]}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        accessibilityLabel={props.label}
        style={[styles.input, props.multiline ? styles.inputMultiline : null]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={!!props.multiline}
        keyboardType={props.keyboardType ?? "default"}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  field: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  input: {
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: Spacing.sm },
  hint: { fontSize: FontSize.xs, color: Colors.textTertiary },
  pickerRow: { flexDirection: "row", gap: Spacing.xs, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryLight },
  chipText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    minHeight: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  submitText: { fontSize: FontSize.sm, fontWeight: "900", color: "#fff" },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    minHeight: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  secondaryText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.primary },
  disabled: { opacity: 0.5 },
});
