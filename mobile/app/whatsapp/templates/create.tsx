import { useMemo, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  uploadWhatsAppTemplateMedia,
  type WhatsAppTemplateUploadResult,
} from "@/lib/whatsapp/upload";

type Category = "UTILITY" | "MARKETING" | "AUTHENTICATION";
type ParameterFormat = "named" | "positional";
type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
type ButtonType = "QUICK_REPLY" | "PHONE_NUMBER" | "URL" | "FLOW" | "COPY_CODE";
type ViewMode = "compose" | "preview" | "checklist";

type TemplateButtonDraft = {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  flow_id?: string;
  example?: string;
};

type Issue = {
  level: "error" | "warning";
  message: string;
};

const BODY_LIMIT = 1024;
const HEADER_LIMIT = 60;
const FOOTER_LIMIT = 60;
const BUTTON_LIMIT = 25;

const CATEGORIES: Array<{ value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "UTILITY", label: "Utility", icon: "document-text-outline" },
  { value: "MARKETING", label: "Marketing", icon: "megaphone-outline" },
  { value: "AUTHENTICATION", label: "Auth", icon: "shield-checkmark-outline" },
];

const HEADER_OPTIONS: Array<{ value: HeaderFormat; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "NONE", label: "None", icon: "remove-circle-outline" },
  { value: "TEXT", label: "Text", icon: "text-outline" },
  { value: "IMAGE", label: "Image", icon: "image-outline" },
  { value: "VIDEO", label: "Video", icon: "videocam-outline" },
  { value: "DOCUMENT", label: "PDF", icon: "document-attach-outline" },
  { value: "LOCATION", label: "Location", icon: "location-outline" },
];

const BUTTON_TYPES: Array<{ value: ButtonType; label: string }> = [
  { value: "QUICK_REPLY", label: "Quick" },
  { value: "URL", label: "URL" },
  { value: "PHONE_NUMBER", label: "Phone" },
  { value: "FLOW", label: "Flow" },
  { value: "COPY_CODE", label: "Copy" },
];

const ADVANCED_LATER = [
  "Carousel",
  "Catalog products",
  "GIF header",
  "Voice call",
  "Limited-time offer",
  "One-tap auth",
  "Zero-tap auth",
];

const DEFAULT_TEMPLATE_NAMES: Record<Category, string> = {
  UTILITY: "booking_status_update",
  MARKETING: "seasonal_travel_offer",
  AUTHENTICATION: "login_verification_code",
};

function sanitizeTemplateName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

function extractVariables(text: string): string[] {
  const found = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    found.add(match[1]);
  }
  return Array.from(found);
}

function replaceVars(text: string, examples: Record<string, string>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, variable) => {
    return examples[variable]?.trim() || `{{${variable}}}`;
  });
}

function countTone(length: number, limit: number) {
  if (length > limit) return Colors.error;
  if (length > limit * 0.85) return Colors.warning;
  return Colors.textTertiary;
}

export default function WhatsAppTemplateCreate() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [mode, setMode] = useState<ViewMode>("compose");
  const [name, setName] = useState("booking_status_update");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState<Category>("UTILITY");
  const [parameterFormat, setParameterFormat] = useState<ParameterFormat>("named");
  const [allowCategoryChange, setAllowCategoryChange] = useState(true);
  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>("TEXT");
  const [headerText, setHeaderText] = useState("Booking {{booking_id}}");
  const [headerMedia, setHeaderMedia] = useState<WhatsAppTemplateUploadResult | null>(null);
  const [bodyText, setBodyText] = useState(
    "Hi {{customer_name}}, your trip status is now {{status}}. Our team will keep you updated here.",
  );
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<TemplateButtonDraft[]>([
    { type: "QUICK_REPLY", text: "Thanks" },
  ]);
  const [examples, setExamples] = useState<Record<string, string>>({
    booking_id: "BK-1024",
    customer_name: "Aagam Guest",
    status: "confirmed",
  });
  const [authSecurity, setAuthSecurity] = useState(true);
  const [authExpiration, setAuthExpiration] = useState("10");
  const [authButtonText, setAuthButtonText] = useState("Copy code");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastStatus, setLastStatus] = useState("Not submitted");

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Template studio",
      headerBackTitle: "Templates",
    });
  }, [navigation]);

  const isAuth = category === "AUTHENTICATION";
  const headerVariables = useMemo(
    () => (headerFormat === "TEXT" ? extractVariables(headerText) : []),
    [headerFormat, headerText],
  );
  const bodyVariables = useMemo(() => extractVariables(bodyText), [bodyText]);
  const buttonVariables = useMemo(
    () =>
      buttons.flatMap((button, index) =>
        button.type === "URL"
          ? extractVariables(button.url ?? "").map((variable) => ({
              key: `button:${index}:${variable}`,
              label: `Button ${index + 1}`,
              variable,
            }))
          : [],
      ),
    [buttons],
  );

  const issues = useMemo(() => {
    const next: Issue[] = [];
    const push = (message: string, level: Issue["level"] = "error") => next.push({ message, level });

    if (!name.trim()) push("Template name is required.");
    else if (!/^[a-z0-9_]+$/.test(name)) push("Template name must use lowercase letters, numbers, and underscores.");

    if (isAuth) {
      const expiration = Number(authExpiration);
      if (!Number.isInteger(expiration) || expiration < 1 || expiration > 90) {
        push("Authentication code expiration must be between 1 and 90 minutes.");
      }
      if (authButtonText.trim().length > BUTTON_LIMIT) {
        push(`OTP button text must be ${BUTTON_LIMIT} characters or fewer.`);
      }
      return next;
    }

    if (!bodyText.trim()) push("Body text is required.");
    if (bodyText.length > BODY_LIMIT) push(`Body text must be ${BODY_LIMIT} characters or fewer.`);

    if (headerFormat === "TEXT") {
      if (!headerText.trim()) push("Text header cannot be empty.");
      if (headerText.length > HEADER_LIMIT) push(`Header text must be ${HEADER_LIMIT} characters or fewer.`);
      if (headerVariables.length > 1) push("Text headers can use only one variable.");
    }

    if (headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT") {
      if (!headerMedia?.metaHandle) push(`${headerFormat} headers require a Meta template media handle.`);
    }

    if (footerText.length > FOOTER_LIMIT) push(`Footer text must be ${FOOTER_LIMIT} characters or fewer.`);
    if (extractVariables(footerText).length) push("Footer text cannot contain variables.");

    const allVariables = [...headerVariables, ...bodyVariables, ...buttonVariables.map((row) => row.variable)];
    if (parameterFormat === "positional") {
      const numeric = allVariables.map((variable) => Number(variable));
      if (numeric.some((value) => !Number.isInteger(value) || value <= 0)) {
        push("Positional templates must use variables like {{1}}, {{2}}, and {{3}}.");
      } else {
        const sorted = [...new Set(numeric)].sort((a, b) => a - b);
        sorted.forEach((value, index) => {
          if (value !== index + 1) push("Positional variables must be sequential starting from {{1}}.");
        });
      }
    } else {
      const invalid = allVariables.find((variable) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable));
      if (invalid) push(`Named parameter "${invalid}" must start with a letter.`);
    }

    allVariables.forEach((variable) => {
      if (!examples[variable]?.trim()) push(`Example value required for {{${variable}}}.`);
    });

    const quickReplies = buttons.filter((button) => button.type === "QUICK_REPLY").length;
    const urlButtons = buttons.filter((button) => button.type === "URL").length;
    const phoneButtons = buttons.filter((button) => button.type === "PHONE_NUMBER").length;
    const flowButtons = buttons.filter((button) => button.type === "FLOW").length;
    const copyCodeButtons = buttons.filter((button) => button.type === "COPY_CODE").length;
    const ctaButtons = urlButtons + phoneButtons + flowButtons;

    if (buttons.length > 10) push("A template can have at most 10 buttons.");
    if (quickReplies > 10) push("Use at most 10 quick replies.");
    if (ctaButtons > 2) push("Use at most two CTA buttons.");
    if (urlButtons > 2) push("Use at most two URL buttons.");
    if (phoneButtons > 1) push("Use at most one phone number button.");
    if (flowButtons > 1) push("Use at most one Flow button.");
    if (copyCodeButtons > 1) push("Use at most one copy-code button.");

    buttons.forEach((button, index) => {
      if (button.type !== "COPY_CODE") {
        if (!button.text.trim()) push(`Button ${index + 1} text is required.`);
        if (button.text.length > BUTTON_LIMIT) push(`Button ${index + 1} text must be ${BUTTON_LIMIT} characters or fewer.`);
      }
      if (button.type === "URL" && !button.url?.trim()) push(`Button ${index + 1} URL is required.`);
      if (button.type === "URL" && extractVariables(button.url ?? "").length > 1) {
        push(`Button ${index + 1} URL can use at most one variable.`);
      }
      if (button.type === "PHONE_NUMBER" && !/^\+[1-9]\d{7,14}$/.test(button.phone_number ?? "")) {
        push(`Button ${index + 1} phone number must use E.164 format.`);
      }
      if (button.type === "FLOW" && !button.flow_id?.trim()) push(`Button ${index + 1} Flow ID is required.`);
      if (button.type === "COPY_CODE") {
        if (category !== "MARKETING") push("Copy-code buttons are only supported for marketing templates.");
        if (!button.example?.trim()) push("Copy-code buttons require an example code.");
      }
    });

    if (category === "MARKETING") {
      push("Marketing templates require customer opt-in and may hit Meta per-user limits.", "warning");
    }

    return next;
  }, [
    authButtonText,
    authExpiration,
    bodyText,
    bodyVariables,
    buttonVariables,
    buttons,
    category,
    examples,
    footerText,
    headerFormat,
    headerMedia?.metaHandle,
    headerText,
    headerVariables,
    isAuth,
    name,
    parameterFormat,
  ]);

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  const readiness = Math.max(0, Math.min(100, 100 - errors.length * 18 - warnings.length * 8));

  function applyPreset(nextCategory: Category) {
    setCategory(nextCategory);
    setParameterFormat("named");
    setAllowCategoryChange(true);
    setHeaderMedia(null);
    setLastStatus("Not submitted");
    const shouldUsePresetName = !name || Object.values(DEFAULT_TEMPLATE_NAMES).includes(name);

    if (nextCategory === "AUTHENTICATION") {
      if (shouldUsePresetName) setName(DEFAULT_TEMPLATE_NAMES.AUTHENTICATION);
      setAuthSecurity(true);
      setAuthExpiration("10");
      setAuthButtonText("Copy code");
      return;
    }

    if (nextCategory === "MARKETING") {
      if (shouldUsePresetName) setName(DEFAULT_TEMPLATE_NAMES.MARKETING);
      setHeaderFormat("IMAGE");
      setHeaderText("");
      setBodyText("Hi {{customer_name}}, your {{destination}} holiday offer is ready. Tap below to view the details.");
      setFooterText("Aagam Holidays");
      setButtons([
        { type: "URL", text: "View offer", url: "https://aagamholidays.com/travel/packages/{{package_slug}}" },
        { type: "QUICK_REPLY", text: "Talk to expert" },
      ]);
      setExamples({
        customer_name: "Riya",
        destination: "Kashmir",
        package_slug: "kashmir-summer",
      });
      return;
    }

    if (shouldUsePresetName) setName(DEFAULT_TEMPLATE_NAMES.UTILITY);
    setHeaderFormat("TEXT");
    setHeaderText("Booking {{booking_id}}");
    setBodyText("Hi {{customer_name}}, your trip status is now {{status}}. Our team will keep you updated here.");
    setFooterText("");
    setButtons([{ type: "QUICK_REPLY", text: "Thanks" }]);
    setExamples({
      booking_id: "BK-1024",
      customer_name: "Aagam Guest",
      status: "confirmed",
    });
  }

  function updateExample(variable: string, value: string) {
    setExamples((current) => ({ ...current, [variable]: value }));
  }

  function updateButton(index: number, updates: Partial<TemplateButtonDraft>) {
    setButtons((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function addButton() {
    if (buttons.length >= 10) {
      Alert.alert("Button limit", "A template can have at most 10 buttons.");
      return;
    }
    setButtons((current) => [...current, { type: "QUICK_REPLY", text: "" }]);
  }

  async function pickTemplateMedia() {
    if (!(headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT")) return;

    try {
      if (headerFormat === "IMAGE") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Allow photo access to upload a template image.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
        });
        if (result.canceled || !result.assets[0]) return;
        await uploadTemplateHeader({
          uri: result.assets[0].uri,
          kind: "image",
          fileName: result.assets[0].fileName ?? undefined,
        });
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: headerFormat === "VIDEO" ? "video/mp4" : "application/pdf",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      await uploadTemplateHeader({
        uri: result.assets[0].uri,
        kind: headerFormat === "VIDEO" ? "video" : "document",
        fileName: result.assets[0].name,
        contentType: result.assets[0].mimeType ?? undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not pick media.";
      Alert.alert("Media upload", message);
    }
  }

  async function uploadTemplateHeader(opts: {
    uri: string;
    kind: "image" | "video" | "document";
    fileName?: string;
    contentType?: string;
  }) {
    setUploading(true);
    try {
      const media = await uploadWhatsAppTemplateMedia({
        ...opts,
        templateName: name,
        getToken,
      });
      setHeaderMedia(media);
      Alert.alert("Media ready", "Meta template media handle is attached.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Template media upload failed.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  function buildDraft() {
    if (isAuth) {
      return {
        name,
        language,
        category,
        parameterFormat,
        components: [{ type: "BODY", text: "" }],
        auth: {
          addSecurityRecommendation: authSecurity,
          codeExpirationMinutes: Number(authExpiration) || 10,
          copyCodeButtonText: authButtonText,
        },
      };
    }

    const components: any[] = [];
    if (headerFormat !== "NONE") {
      if (headerFormat === "TEXT") {
        components.push({ type: "HEADER", format: "TEXT", text: headerText });
      } else if (headerFormat === "LOCATION") {
        components.push({ type: "HEADER", format: "LOCATION" });
      } else {
        components.push({
          type: "HEADER",
          format: headerFormat,
          mediaHandle: headerMedia?.metaHandle ?? "",
          mediaUrl: headerMedia?.url ?? "",
          fileName: headerMedia?.fileName ?? "",
        });
      }
    }
    components.push({ type: "BODY", text: bodyText });
    if (footerText.trim()) components.push({ type: "FOOTER", text: footerText });
    if (buttons.length) components.push({ type: "BUTTONS", buttons });

    return {
      name,
      language,
      category,
      parameterFormat,
      allowCategoryChange,
      components,
      examples: {
        header: Object.fromEntries(headerVariables.map((variable) => [variable, examples[variable] ?? ""])),
        body: Object.fromEntries(bodyVariables.map((variable) => [variable, examples[variable] ?? ""])),
        buttons: Object.fromEntries(
          buttonVariables.map((row) => {
            const buttonIndex = row.key.split(":")[1];
            return [buttonIndex, { [row.variable]: examples[row.variable] ?? "" }];
          }),
        ),
      },
    };
  }

  async function submit() {
    if (errors.length) {
      Alert.alert("Fix checklist", errors[0].message);
      setMode("checklist");
      return;
    }

    setSubmitting(true);
    setLastStatus("Submitting to Meta...");
    try {
      const data = await api<{
        success: boolean;
        data?: { id?: string; status?: string };
        message?: string;
      }>("/api/mobile/whatsapp/templates/create", {
        method: "POST",
        timeout: 45000,
        body: buildDraft(),
      });
      setLastStatus(data.message ?? "Submitted for Meta review");
      Alert.alert("Submitted", "Template submitted to Meta for review.", [
        { text: "Stay" },
        { text: "Templates", onPress: () => router.replace("/whatsapp/templates") },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Template submission failed.";
      setLastStatus(message);
      Alert.alert("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 112 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Template Studio</Text>
              <Text style={styles.heroTitle}>Create approval-ready templates</Text>
            </View>
          </View>
          <View style={styles.readinessRow}>
            <Text style={styles.readinessLabel}>Readiness</Text>
            <Text style={styles.readinessValue}>{readiness}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${readiness}%` }]} />
          </View>
        </View>

        <View style={styles.modeTabs}>
          {(["compose", "preview", "checklist"] as ViewMode[]).map((item) => {
            const active = mode === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.modeTab, active && styles.modeTabActive]}
                onPress={() => setMode(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`wa-template-create-tab-${item}`}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === "compose" && (
          <>
            <Section title="Preset" icon="sparkles-outline">
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((item) => {
                  const active = category === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.categoryCard, active && styles.categoryCardActive]}
                      onPress={() => applyPreset(item.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      testID={`wa-template-create-preset-${item.value}`}
                    >
                      <Ionicons name={item.icon} size={18} color={active ? "#075E54" : Colors.textSecondary} />
                      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            <Section title="Identity" icon="document-text-outline">
              <Field label="Template name" hint="lowercase_numbers_only">
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(value) => setName(sanitizeTemplateName(value))}
                  placeholder="booking_status_update"
                  placeholderTextColor={Colors.textTertiary}
                  testID="wa-template-create-name"
                />
              </Field>
              <Field label="Language">
                <TextInput
                  style={styles.input}
                  value={language}
                  onChangeText={setLanguage}
                  placeholder="en_US"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  testID="wa-template-create-language"
                />
              </Field>
              {!isAuth ? (
                <View style={styles.inlineControls}>
                  <MiniToggle
                    label="Named"
                    active={parameterFormat === "named"}
                    onPress={() => setParameterFormat("named")}
                  />
                  <MiniToggle
                    label="Positional"
                    active={parameterFormat === "positional"}
                    onPress={() => setParameterFormat("positional")}
                  />
                  <MiniToggle
                    label="Meta recategorize"
                    active={allowCategoryChange}
                    onPress={() => setAllowCategoryChange((current) => !current)}
                  />
                </View>
              ) : null}
            </Section>

            {isAuth ? (
              <Section title="Authentication OTP" icon="shield-checkmark-outline">
                <ToggleRow
                  label="Security recommendation"
                  detail="Adds Meta's recommended safety text."
                  active={authSecurity}
                  onPress={() => setAuthSecurity((current) => !current)}
                />
                <Field label="Code expiration" hint="1 to 90 minutes">
                  <TextInput
                    style={styles.input}
                    value={authExpiration}
                    onChangeText={setAuthExpiration}
                    keyboardType="number-pad"
                    testID="wa-template-create-auth-expiration"
                  />
                </Field>
                <Field label="Button text">
                  <TextInput
                    style={styles.input}
                    value={authButtonText}
                    onChangeText={setAuthButtonText}
                    placeholder="Copy code"
                    placeholderTextColor={Colors.textTertiary}
                    testID="wa-template-create-auth-button"
                  />
                </Field>
              </Section>
            ) : (
              <>
                <Section title="Header" icon="albums-outline">
                  <View style={styles.wrapRow}>
                    {HEADER_OPTIONS.map((item) => {
                      const active = headerFormat === item.value;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          style={[styles.optionPill, active && styles.optionPillActive]}
                          onPress={() => {
                            setHeaderFormat(item.value);
                            setHeaderMedia(null);
                          }}
                          testID={`wa-template-create-header-${item.value}`}
                        >
                          <Ionicons name={item.icon} size={15} color={active ? "#fff" : Colors.textSecondary} />
                          <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {headerFormat === "TEXT" ? (
                    <Field label="Header text" hint={`${headerText.length}/${HEADER_LIMIT}`} hintColor={countTone(headerText.length, HEADER_LIMIT)}>
                      <TextInput
                        style={styles.input}
                        value={headerText}
                        onChangeText={setHeaderText}
                        placeholder={parameterFormat === "named" ? "Booking {{booking_id}}" : "Booking {{1}}"}
                        placeholderTextColor={Colors.textTertiary}
                        testID="wa-template-create-header-text"
                      />
                    </Field>
                  ) : null}

                  {headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT" ? (
                    <View style={styles.uploadBox}>
                      <Text style={styles.uploadTitle}>
                        {headerMedia?.metaHandle ? "Meta handle attached" : `${headerFormat} handle required`}
                      </Text>
                      <Text style={styles.uploadHelp} numberOfLines={2}>
                        {headerMedia?.fileName ?? "Upload an example file. The public URL is only for preview."}
                      </Text>
                      <TouchableOpacity
                        style={[styles.uploadButton, uploading && styles.disabledButton]}
                        onPress={pickTemplateMedia}
                        disabled={uploading}
                        testID="wa-template-create-upload"
                      >
                        {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
                        <Text style={styles.uploadButtonText}>{uploading ? "Uploading..." : "Upload media"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </Section>

                <Section title="Body" icon="chatbox-ellipses-outline">
                  <Field label="Message body" hint={`${bodyText.length}/${BODY_LIMIT}`} hintColor={countTone(bodyText.length, BODY_LIMIT)}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={bodyText}
                      onChangeText={setBodyText}
                      placeholder={parameterFormat === "named" ? "Hi {{customer_name}}, your booking is ready." : "Hi {{1}}, your booking is ready."}
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      textAlignVertical="top"
                      testID="wa-template-create-body"
                    />
                  </Field>
                </Section>

                <Section title="Footer" icon="reader-outline">
                  <Field label="Footer text" hint={`${footerText.length}/${FOOTER_LIMIT}`} hintColor={countTone(footerText.length, FOOTER_LIMIT)}>
                    <TextInput
                      style={styles.input}
                      value={footerText}
                      onChangeText={setFooterText}
                      placeholder="Aagam Holidays"
                      placeholderTextColor={Colors.textTertiary}
                      testID="wa-template-create-footer"
                    />
                  </Field>
                </Section>

                <Section
                  title="Buttons"
                  icon="link-outline"
                  action={
                    <TouchableOpacity onPress={addButton} style={styles.smallAction} testID="wa-template-create-add-button">
                      <Ionicons name="add" size={16} color="#075E54" />
                      <Text style={styles.smallActionText}>Add</Text>
                    </TouchableOpacity>
                  }
                >
                  {buttons.map((button, index) => (
                    <View key={`button-${index}`} style={styles.buttonEditor}>
                      <View style={styles.wrapRow}>
                        {BUTTON_TYPES.map((type) => {
                          const active = button.type === type.value;
                          return (
                            <TouchableOpacity
                              key={type.value}
                              style={[styles.optionPillSmall, active && styles.optionPillActive]}
                              onPress={() => updateButton(index, { type: type.value })}
                            >
                              <Text style={[styles.optionText, active && styles.optionTextActive]}>{type.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {button.type !== "COPY_CODE" ? (
                        <TextInput
                          style={styles.input}
                          value={button.text}
                          onChangeText={(value) => updateButton(index, { text: value })}
                          placeholder="Button text"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      ) : (
                        <TextInput
                          style={styles.input}
                          value={button.example ?? ""}
                          onChangeText={(value) => updateButton(index, { example: value })}
                          placeholder="Example code, e.g. SAVE250"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      )}
                      {button.type === "URL" ? (
                        <TextInput
                          style={styles.input}
                          value={button.url ?? ""}
                          onChangeText={(value) => updateButton(index, { url: value })}
                          placeholder="https://example.com/{{package_slug}}"
                          placeholderTextColor={Colors.textTertiary}
                          autoCapitalize="none"
                        />
                      ) : null}
                      {button.type === "PHONE_NUMBER" ? (
                        <TextInput
                          style={styles.input}
                          value={button.phone_number ?? ""}
                          onChangeText={(value) => updateButton(index, { phone_number: value })}
                          placeholder="+919876543210"
                          placeholderTextColor={Colors.textTertiary}
                          keyboardType="phone-pad"
                        />
                      ) : null}
                      {button.type === "FLOW" ? (
                        <TextInput
                          style={styles.input}
                          value={button.flow_id ?? ""}
                          onChangeText={(value) => updateButton(index, { flow_id: value })}
                          placeholder="Published Flow ID"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      ) : null}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => setButtons((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                        <Text style={styles.removeText}>Remove button</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </Section>

                <Section title="Variable examples" icon="copy-outline">
                  {[...headerVariables, ...bodyVariables, ...buttonVariables.map((row) => row.variable)].length ? (
                    [...headerVariables, ...bodyVariables, ...buttonVariables.map((row) => row.variable)].map((variable) => (
                      <Field key={variable} label={`{{${variable}}}`}>
                        <TextInput
                          style={styles.input}
                          value={examples[variable] ?? ""}
                          onChangeText={(value) => updateExample(variable, value)}
                          placeholder={`Example for {{${variable}}}`}
                          placeholderTextColor={Colors.textTertiary}
                          testID={`wa-template-create-example-${variable}`}
                        />
                      </Field>
                    ))
                  ) : (
                    <Text style={styles.helper}>Add placeholders such as {"{{customer_name}"}{"}"} to map examples.</Text>
                  )}
                </Section>
              </>
            )}

            <Section title="Later" icon="time-outline">
              <View style={styles.wrapRow}>
                {ADVANCED_LATER.map((item) => (
                  <View key={item} style={styles.soonPill}>
                    <Text style={styles.soonText}>{item}</Text>
                    <Text style={styles.soonBadge}>Soon</Text>
                  </View>
                ))}
              </View>
            </Section>
          </>
        )}

        {mode === "preview" && (
          <PreviewCard
            isAuth={isAuth}
            headerFormat={headerFormat}
            headerText={replaceVars(headerText, examples)}
            headerMedia={headerMedia}
            bodyText={replaceVars(bodyText || "Your message body appears here.", examples)}
            footerText={footerText}
            buttons={buttons}
            authSecurity={authSecurity}
            authExpiration={authExpiration}
            authButtonText={authButtonText}
          />
        )}

        {mode === "checklist" && (
          <Section title="Approval checklist" icon="checkmark-circle-outline">
            <View style={styles.readinessRow}>
              <Text style={styles.readinessLabel}>Readiness score</Text>
              <Text style={styles.readinessValue}>{readiness}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${readiness}%` }]} />
            </View>
            {errors.length === 0 ? <ChecklistRow level="success" text="No blocking validation issues." /> : null}
            {errors.map((issue, index) => (
              <ChecklistRow key={`error-${index}`} level="error" text={issue.message} />
            ))}
            {warnings.map((issue, index) => (
              <ChecklistRow key={`warning-${index}`} level="warning" text={issue.message} />
            ))}
            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>Submission</Text>
              <Text style={styles.statusText}>{lastStatus}</Text>
            </View>
          </Section>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[styles.submitButton, (errors.length > 0 || submitting) && styles.disabledButton]}
          onPress={submit}
          disabled={errors.length > 0 || submitting}
          accessibilityLabel="Submit WhatsApp template"
          testID="wa-template-create-submit"
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit to Meta"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={16} color="#075E54" />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Field({
  label,
  hint,
  hintColor,
  children,
}: {
  label: string;
  hint?: string;
  hintColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={[styles.fieldHint, hintColor ? { color: hintColor } : null]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MiniToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.miniToggle, active && styles.miniToggleActive]} onPress={onPress}>
      <Text style={[styles.miniToggleText, active && styles.miniToggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  detail,
  active,
  onPress,
}: {
  label: string;
  detail: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDetail}>{detail}</Text>
      </View>
      <View style={[styles.toggleSwitch, active && styles.toggleSwitchActive]}>
        <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );
}

function PreviewCard({
  isAuth,
  headerFormat,
  headerText,
  headerMedia,
  bodyText,
  footerText,
  buttons,
  authSecurity,
  authExpiration,
  authButtonText,
}: {
  isAuth: boolean;
  headerFormat: HeaderFormat;
  headerText: string;
  headerMedia: WhatsAppTemplateUploadResult | null;
  bodyText: string;
  footerText: string;
  buttons: TemplateButtonDraft[];
  authSecurity: boolean;
  authExpiration: string;
  authButtonText: string;
}) {
  return (
    <View style={styles.phonePreview}>
      <View style={styles.phoneHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>WA</Text>
        </View>
        <View>
          <Text style={styles.phoneTitle}>Aagam Holidays</Text>
          <Text style={styles.phoneSub}>template preview</Text>
        </View>
      </View>
      <View style={styles.phoneBody}>
        <View style={styles.bubble}>
          {!isAuth && headerFormat !== "NONE" ? (
            <View style={styles.previewHeader}>
              {headerFormat === "TEXT" ? <Text style={styles.previewHeaderText}>{headerText}</Text> : null}
              {headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT" || headerFormat === "LOCATION" ? (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons
                    name={
                      headerFormat === "IMAGE"
                        ? "image-outline"
                        : headerFormat === "VIDEO"
                          ? "videocam-outline"
                          : headerFormat === "DOCUMENT"
                            ? "document-attach-outline"
                            : "location-outline"
                    }
                    size={28}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.mediaText}>
                    {headerMedia?.fileName ?? `${headerFormat.toLowerCase()} header`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.bubbleText}>{isAuth ? "*123456* is your verification code." : bodyText}</Text>
          {isAuth && authSecurity ? <Text style={styles.bubbleMuted}>For your security, do not share this code.</Text> : null}
          {isAuth ? <Text style={styles.bubbleMuted}>This code expires in {authExpiration || "10"} minutes.</Text> : null}
          {!isAuth && footerText ? <Text style={styles.footerPreview}>{footerText}</Text> : null}
          <Text style={styles.previewTime}>20:22</Text>
          <View style={styles.previewButtons}>
            {isAuth ? (
              <PreviewButton label={authButtonText || "Copy code"} icon="copy-outline" />
            ) : (
              buttons.map((button, index) => (
                <PreviewButton
                  key={`preview-button-${index}`}
                  label={button.type === "COPY_CODE" ? `Copy ${button.example || "code"}` : button.text || button.type}
                  icon={button.type === "PHONE_NUMBER" ? "call-outline" : button.type === "URL" ? "open-outline" : "chatbubble-outline"}
                />
              ))
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function PreviewButton({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.previewButton}>
      <Ionicons name={icon} size={15} color="#075E54" />
      <Text style={styles.previewButtonText}>{label}</Text>
    </View>
  );
}

function ChecklistRow({ level, text }: { level: "success" | "warning" | "error"; text: string }) {
  const color = level === "success" ? Colors.success : level === "warning" ? Colors.warning : Colors.error;
  return (
    <View style={[styles.checkRow, { borderColor: `${color}33`, backgroundColor: `${color}12` }]}>
      <Ionicons
        name={level === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={18}
        color={color}
      />
      <Text style={[styles.checkText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: 16, gap: 14 },
  hero: {
    borderRadius: 18,
    backgroundColor: "#0F172A",
    padding: 18,
    gap: 16,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { color: "#A7F3D0", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  readinessRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  readinessLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "700" },
  readinessValue: { fontSize: 14, color: Colors.text, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "#E2E8F0", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#25D366" },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    padding: 4,
    borderRadius: 14,
  },
  modeTab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11 },
  modeTabActive: { backgroundColor: "#fff" },
  modeText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  modeTextActive: { color: "#075E54" },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: Colors.background,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#E0F7E9",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  sectionContent: { gap: 12 },
  categoryGrid: { flexDirection: "row", gap: 8 },
  categoryCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    borderRadius: 13,
    padding: 10,
    gap: 6,
    alignItems: "center",
  },
  categoryCardActive: { backgroundColor: "#E0F7E9", borderColor: "#25D366" },
  categoryText: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  categoryTextActive: { color: "#075E54" },
  field: { gap: 7 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary, textTransform: "uppercase" },
  fieldHint: { fontSize: 11, color: Colors.textTertiary, flexShrink: 1 },
  input: {
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: Colors.text,
    fontSize: 14,
  },
  textArea: { minHeight: 128 },
  inlineControls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniToggle: { borderRadius: 999, backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 8 },
  miniToggleActive: { backgroundColor: "#DCFCE7" },
  miniToggleText: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  miniToggleTextActive: { color: "#075E54" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: "800", color: Colors.text },
  toggleDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  toggleSwitch: { width: 42, height: 24, borderRadius: 999, backgroundColor: "#CBD5E1", padding: 3 },
  toggleSwitchActive: { backgroundColor: "#25D366" },
  toggleKnob: { width: 18, height: 18, borderRadius: 999, backgroundColor: "#fff" },
  toggleKnobActive: { transform: [{ translateX: 18 }] },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionPillSmall: {
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionPillActive: { backgroundColor: "#075E54" },
  optionText: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  optionTextActive: { color: "#fff" },
  uploadBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#94A3B8", padding: 14, gap: 8 },
  uploadTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  uploadHelp: { fontSize: 12, color: Colors.textSecondary },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 12,
  },
  uploadButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E0F7E9", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  smallActionText: { color: "#075E54", fontSize: 12, fontWeight: "800" },
  buttonEditor: { gap: 9, borderRadius: 14, backgroundColor: Colors.surface, padding: 10 },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  removeText: { color: Colors.error, fontSize: 12, fontWeight: "700" },
  helper: { color: Colors.textSecondary, fontSize: 13 },
  soonPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 7 },
  soonText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  soonBadge: { color: Colors.warning, fontSize: 10, fontWeight: "900" },
  phonePreview: { borderRadius: 18, overflow: "hidden", backgroundColor: Colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  phoneHeader: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0F172A", padding: 14 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#25D366", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  phoneTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  phoneSub: { color: "#CBD5E1", fontSize: 11 },
  phoneBody: { backgroundColor: "#EFEAE2", padding: 16 },
  bubble: { alignSelf: "flex-end", width: "88%", borderRadius: 14, backgroundColor: "#D9FDD3", overflow: "hidden" },
  previewHeader: { padding: 10, paddingBottom: 4 },
  previewHeaderText: { fontSize: 14, fontWeight: "800", color: Colors.text },
  mediaPlaceholder: { height: 136, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center", gap: 8 },
  mediaText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "700" },
  bubbleText: { color: Colors.text, fontSize: 13, lineHeight: 20, paddingHorizontal: 12, paddingTop: 10 },
  bubbleMuted: { color: Colors.textSecondary, fontSize: 12, paddingHorizontal: 12, paddingTop: 6 },
  footerPreview: { color: Colors.textSecondary, fontSize: 12, paddingHorizontal: 12, paddingTop: 8 },
  previewTime: { color: Colors.textTertiary, fontSize: 10, textAlign: "right", paddingHorizontal: 12, paddingVertical: 8 },
  previewButtons: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#A7E5BC" },
  previewButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#A7E5BC" },
  previewButtonText: { color: "#075E54", fontWeight: "800", fontSize: 13 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderWidth: 1, borderRadius: 12, padding: 11, marginTop: 10 },
  checkText: { flex: 1, fontSize: 13, fontWeight: "700" },
  statusBox: { borderRadius: 14, backgroundColor: Colors.surface, padding: 12, marginTop: 12 },
  statusLabel: { fontSize: 12, fontWeight: "900", color: Colors.textSecondary, textTransform: "uppercase" },
  statusText: { fontSize: 13, color: Colors.text, marginTop: 4 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  submitButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#25D366", borderRadius: 999, paddingVertical: 14 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
