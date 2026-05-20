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
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import {
  createWhatsAppTemplatesAdminClient,
  type CreateTemplateInput,
  type TemplateButton,
  type TemplateCategory,
  type TemplateComponent,
} from "@/lib/whatsapp-templates-admin";

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "MARKETING", label: "Marketing" },
  { id: "UTILITY", label: "Utility" },
  { id: "AUTHENTICATION", label: "Auth" },
];

const LANGUAGES = ["en_US", "en", "hi", "gu", "mr"];

export default function NewTemplateScreen() {
  return (
    <PermissionGate permission="communications.write">
      <OfflineGate policy="online_only">
        <NewTemplateInner />
      </OfflineGate>
    </PermissionGate>
  );
}

interface ButtonDraft {
  type: "QUICK_REPLY" | "URL";
  text: string;
  url?: string;
}

function NewTemplateInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const client = useMemo(
    () => createWhatsAppTemplatesAdminClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string>("en_US");
  const [category, setCategory] = useState<TemplateCategory>("UTILITY");
  const [bodyText, setBodyText] = useState("");
  const [bodyExample, setBodyExample] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<ButtonDraft[]>([]);
  const [busy, setBusy] = useState(false);

  function addButton(type: ButtonDraft["type"]) {
    if (buttons.length >= 3) return;
    setButtons((prev) => [...prev, { type, text: "" }]);
  }

  function updateButton(index: number, patch: Partial<ButtonDraft>) {
    setButtons((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  }

  function removeButton(index: number) {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload(): CreateTemplateInput | null {
    if (!/^[a-z0-9_]+$/.test(name)) {
      Alert.alert(
        "Invalid name",
        "Template name must be lowercase letters, digits, and underscores only."
      );
      return null;
    }
    if (!bodyText.trim()) {
      Alert.alert("Body required", "Provide the body text of the template.");
      return null;
    }
    const components: TemplateComponent[] = [];
    const bodyVariableMatches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) || [];
    const bodyComponent: TemplateComponent = {
      type: "BODY",
      text: bodyText.trim(),
    };
    if (bodyVariableMatches.length > 0) {
      const exampleValues = bodyExample
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (exampleValues.length < bodyVariableMatches.length) {
        Alert.alert(
          "Examples required",
          `Body has ${bodyVariableMatches.length} variable(s); provide an example for each (comma separated).`
        );
        return null;
      }
      bodyComponent.example = { body_text: [exampleValues] };
    }
    components.push(bodyComponent);

    if (footerText.trim()) {
      components.push({ type: "FOOTER", text: footerText.trim() });
    }
    if (buttons.length > 0) {
      const buttonObjects: TemplateButton[] = [];
      for (const b of buttons) {
        if (!b.text.trim()) {
          Alert.alert("Button text required", "Each button must have label text.");
          return null;
        }
        if (b.type === "URL") {
          if (!b.url?.trim()) {
            Alert.alert(
              "URL required",
              "URL buttons need a destination link (https://...)."
            );
            return null;
          }
          buttonObjects.push({
            type: "URL",
            text: b.text.trim(),
            url: b.url.trim(),
          });
        } else {
          buttonObjects.push({ type: "QUICK_REPLY", text: b.text.trim() });
        }
      }
      components.push({ type: "BUTTONS", buttons: buttonObjects });
    }
    return { name, language, category, components };
  }

  async function submit() {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      await client.create(payload);
      Alert.alert(
        "Submitted",
        "Template was submitted to Meta for review. It will appear in the list once approved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(
        "Could not create",
        err instanceof ApiError ? err.message : "Template submission failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="wa-new-template-screen"
    >
      <Stack.Screen options={{ title: "New template" }} />

      <Section title="Basics">
        <Field label="Name" testID="wa-tpl-name" value={name} onChange={setName} placeholder="order_confirmation" autoCapitalize="none" />
        <Picker
          label="Language"
          testIDPrefix="wa-tpl-lang"
          value={language}
          options={LANGUAGES.map((l) => ({ id: l, label: l }))}
          onChange={(v) => setLanguage(v)}
        />
        <Picker
          label="Category"
          testIDPrefix="wa-tpl-category"
          value={category}
          options={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          onChange={(v) => setCategory(v as TemplateCategory)}
        />
      </Section>

      <Section title="Body (required)">
        <Field
          label="Body text"
          testID="wa-tpl-body"
          value={bodyText}
          onChange={setBodyText}
          placeholder="Hello {{1}}, your order #{{2}} is confirmed."
          multiline
        />
        <Field
          label="Example values (comma-separated, one per variable)"
          testID="wa-tpl-body-example"
          value={bodyExample}
          onChange={setBodyExample}
          placeholder="John, 12345"
          autoCapitalize="none"
        />
      </Section>

      <Section title="Footer (optional)">
        <Field
          label="Footer text"
          testID="wa-tpl-footer"
          value={footerText}
          onChange={setFooterText}
          placeholder="Reply STOP to unsubscribe"
        />
      </Section>

      <Section title="Buttons (up to 3)">
        {buttons.map((b, i) => (
          <View key={i} style={styles.buttonRow} testID={`wa-tpl-button-${i}`}>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Picker
                label={`Button ${i + 1} type`}
                testIDPrefix={`wa-tpl-button-${i}-type`}
                value={b.type}
                options={[
                  { id: "QUICK_REPLY", label: "Quick reply" },
                  { id: "URL", label: "URL" },
                ]}
                onChange={(v) => updateButton(i, { type: v as ButtonDraft["type"] })}
              />
              <Field
                label="Label"
                testID={`wa-tpl-button-${i}-label`}
                value={b.text}
                onChange={(v) => updateButton(i, { text: v })}
                placeholder="Track order"
              />
              {b.type === "URL" ? (
                <Field
                  label="URL"
                  testID={`wa-tpl-button-${i}-url`}
                  value={b.url ?? ""}
                  onChange={(v) => updateButton(i, { url: v })}
                  placeholder="https://example.com/order"
                  autoCapitalize="none"
                />
              ) : null}
            </View>
            <Pressable
              testID={`wa-tpl-button-${i}-remove`}
              accessibilityRole="button"
              accessibilityLabel={`Remove button ${i + 1}`}
              style={styles.iconButton}
              onPress={() => removeButton(i)}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </Pressable>
          </View>
        ))}
        {buttons.length < 3 ? (
          <View style={styles.addButtonRow}>
            <Pressable
              testID="wa-tpl-add-quick-reply"
              accessibilityRole="button"
              accessibilityLabel="Add quick reply button"
              style={styles.addBtn}
              onPress={() => addButton("QUICK_REPLY")}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.addBtnText}>Quick reply</Text>
            </Pressable>
            <Pressable
              testID="wa-tpl-add-url"
              accessibilityRole="button"
              accessibilityLabel="Add URL button"
              style={styles.addBtn}
              onPress={() => addButton("URL")}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.addBtnText}>URL</Text>
            </Pressable>
          </View>
        ) : null}
      </Section>

      <Pressable
        testID="wa-tpl-submit"
        accessibilityRole="button"
        accessibilityLabel="Submit template for review"
        disabled={busy}
        style={[styles.submit, busy ? styles.submitDisabled : null]}
        onPress={() => void submit()}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="send" size={16} color="#fff" />
        )}
        <Text style={styles.submitText}>
          {busy ? "Submitting…" : "Submit to Meta for review"}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Meta typically takes minutes to hours to approve templates. Approved templates
        will appear in this list.
      </Text>
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
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
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
        autoCapitalize={props.autoCapitalize ?? "sentences"}
      />
    </View>
  );
}

function Picker(props: {
  label: string;
  testIDPrefix: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <View style={styles.pickerRow}>
        {props.options.map((opt) => {
          const active = opt.id === props.value;
          return (
            <Pressable
              key={opt.id}
              testID={`${props.testIDPrefix}-${opt.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Set ${props.label} to ${opt.label}`}
              accessibilityState={{ selected: active }}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => props.onChange(opt.id)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
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
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonRow: { flexDirection: "row", gap: Spacing.sm },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addBtnText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    minHeight: 50,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.textInverse },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
});
