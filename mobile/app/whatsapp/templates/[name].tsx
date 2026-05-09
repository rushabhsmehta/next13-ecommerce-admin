import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  TemplatePreview,
  countTemplateBodyVariables,
  type TemplateComponentLike,
} from "@/components/whatsapp/TemplatePreview";
import {
  uploadWhatsAppMedia,
  type WhatsAppUploadKind,
} from "@/lib/whatsapp/upload";
import { pushRecentTemplate } from "./index";

interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
  components?: TemplateComponentLike[] | null;
  qualityScore: string | null;
}

interface TemplatesResponse {
  items: Template[];
  fetchedAt: number;
}

function findHeaderFormat(
  components: TemplateComponentLike[] | null | undefined,
): "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | null {
  if (!components) return null;
  const header = components.find((c) => (c.type ?? "").toUpperCase() === "HEADER");
  if (!header) return null;
  const fmt = (header.format ?? "").toUpperCase();
  if (fmt === "TEXT" || fmt === "IMAGE" || fmt === "VIDEO" || fmt === "DOCUMENT" || fmt === "LOCATION") {
    return fmt;
  }
  return null;
}

function pickBodyText(components: TemplateComponentLike[] | null | undefined): string {
  if (!components) return "";
  return components.find((c) => (c.type ?? "").toUpperCase() === "BODY")?.text ?? "";
}

export default function WhatsAppTemplateSend() {
  const params = useLocalSearchParams<{
    name?: string;
    lang?: string;
    phone?: string;
    return?: string;
  }>();
  const name = params.name ? decodeURIComponent(params.name) : "";
  const lang = params.lang ? decodeURIComponent(params.lang) : "";
  const phone = params.phone ? decodeURIComponent(params.phone) : "";
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const api = useRef(withAuth(getToken)).current;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [headerParam, setHeaderParam] = useState<string>("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string | null>(null);
  const [headerMediaPreview, setHeaderMediaPreview] = useState<string | null>(null);
  const [headerMediaFilename, setHeaderMediaFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Compose template",
      headerBackTitle: "Templates",
    });
  }, [navigation]);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<TemplatesResponse>("/api/mobile/whatsapp/templates");
      const items = data.items ?? [];
      // Templates are unique by (name, language) — Meta returns multiple rows
      // when a template is translated. Match on both when caller supplied a
      // language, otherwise fall back to the first match for backwards compat.
      const found =
        (lang
          ? items.find((t) => t.name === name && t.language === lang)
          : undefined) ??
        items.find((t) => t.name === name) ??
        null;
      setTemplate(found);
      const body = pickBodyText(found?.components);
      const count = countTemplateBodyVariables(body);
      setBodyParams(Array.from({ length: count }, () => ""));
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not load template.";
      Alert.alert("WhatsApp", message);
    } finally {
      setLoading(false);
    }
  }, [api, name, lang]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const headerFormat = useMemo(
    () => findHeaderFormat(template?.components),
    [template],
  );

  const headerNeedsMedia =
    headerFormat === "IMAGE" || headerFormat === "VIDEO" || headerFormat === "DOCUMENT";
  const headerNeedsText = headerFormat === "TEXT" &&
    /\{\{\d+\}\}/.test(
      template?.components?.find((c) => (c.type ?? "").toUpperCase() === "HEADER")?.text ?? "",
    );

  function setBodyParam(index: number, value: string) {
    setBodyParams((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function pickImageHeader() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload a header image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadHeader({
      uri: result.assets[0].uri,
      kind: "image",
      fileName: result.assets[0].fileName ?? undefined,
    });
  }

  async function pickFileHeader(kind: "video" | "document") {
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === "video" ? "video/*" : "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadHeader({
      uri: result.assets[0].uri,
      kind,
      fileName: result.assets[0].name,
      contentType: result.assets[0].mimeType ?? undefined,
    });
  }

  async function uploadHeader(opts: {
    uri: string;
    kind: WhatsAppUploadKind;
    fileName?: string;
    contentType?: string;
  }) {
    setUploading(true);
    try {
      const result = await uploadWhatsAppMedia({ ...opts, getToken });
      setHeaderMediaUrl(result.url);
      setHeaderMediaPreview(result.url);
      setHeaderMediaFilename(result.filename);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  function buildHeaderParams() {
    if (!headerFormat) return undefined;
    if (headerFormat === "TEXT") {
      return headerParam.length > 0
        ? { type: "text" as const, text: headerParam }
        : undefined;
    }
    if (!headerMediaUrl) return undefined;
    if (headerFormat === "IMAGE") {
      return { type: "image" as const, image: { link: headerMediaUrl } };
    }
    if (headerFormat === "VIDEO") {
      return { type: "video" as const, video: { link: headerMediaUrl } };
    }
    if (headerFormat === "DOCUMENT") {
      return {
        type: "document" as const,
        document: {
          link: headerMediaUrl,
          ...(headerMediaFilename ? { filename: headerMediaFilename } : {}),
        },
      };
    }
    return undefined;
  }

  function bodyParamsValid(): boolean {
    if (bodyParams.some((v) => v.trim().length === 0)) return false;
    return true;
  }

  function headerValid(): boolean {
    if (!headerFormat) return true;
    if (headerFormat === "TEXT") return !headerNeedsText || headerParam.trim().length > 0;
    if (headerFormat === "LOCATION") return true;
    return headerMediaUrl !== null;
  }

  async function send() {
    if (!template) return;
    if (!phone) {
      Alert.alert("No recipient", "Open a chat first to send a template.");
      return;
    }
    if (!bodyParamsValid()) {
      Alert.alert("Missing variables", "Fill every body variable before sending.");
      return;
    }
    if (!headerValid()) {
      Alert.alert("Header missing", "Fill or upload the template header before sending.");
      return;
    }
    setSending(true);
    try {
      await api("/api/mobile/whatsapp/send", {
        method: "POST",
        body: {
          type: "template",
          phone,
          templateName: template.name,
          templateLanguage: template.language,
          parameters: bodyParams,
          headerParams: buildHeaderParams(),
        },
      });
      await pushRecentTemplate(template.name);
      router.back();
      // Pop one more to land back in the chat thread.
      setTimeout(() => router.back(), 50);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not send template.";
      Alert.alert("Send failed", message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-template-send-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>Template &quot;{name}&quot; not found.</Text>
      </View>
    );
  }

  const canSend = !!phone && bodyParamsValid() && headerValid() && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 96 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.previewCard}>
          <TemplatePreview
            components={template.components ?? null}
            bodyParams={bodyParams}
            headerParamText={headerNeedsText ? headerParam : null}
            headerMediaUri={headerMediaPreview}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {template.name} · {template.language}
            {template.category ? ` · ${template.category}` : ""}
          </Text>
        </View>

        {headerNeedsText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Header text</Text>
            <TextInput
              style={styles.input}
              value={headerParam}
              onChangeText={setHeaderParam}
              placeholder="Enter header value"
              placeholderTextColor={Colors.textTertiary}
              testID="wa-template-header-text"
            />
          </View>
        )}

        {headerNeedsMedia && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Header {headerFormat?.toLowerCase()}
            </Text>
            {headerMediaPreview && headerFormat === "IMAGE" ? (
              <Text style={styles.helper} numberOfLines={1}>
                Uploaded: {headerMediaFilename ?? "image"}
              </Text>
            ) : null}
            {headerMediaPreview && headerFormat !== "IMAGE" ? (
              <Text style={styles.helper} numberOfLines={1}>
                Uploaded: {headerMediaFilename ?? headerFormat?.toLowerCase()}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
              onPress={() => {
                if (uploading) return;
                if (headerFormat === "IMAGE") void pickImageHeader();
                else if (headerFormat === "VIDEO") void pickFileHeader("video");
                else if (headerFormat === "DOCUMENT") void pickFileHeader("document");
              }}
              disabled={uploading}
              accessibilityLabel="Upload header media"
              testID="wa-template-header-upload"
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>
                    {headerMediaUrl ? "Replace" : "Upload"} {headerFormat?.toLowerCase()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {bodyParams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body variables</Text>
            {bodyParams.map((value, idx) => (
              <View key={`var-${idx}`} style={styles.variableRow}>
                <Text style={styles.variableLabel}>{`{{${idx + 1}}}`}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={(t) => setBodyParam(idx, t)}
                  placeholder={`Value for {{${idx + 1}}}`}
                  placeholderTextColor={Colors.textTertiary}
                  testID={`wa-template-var-${idx + 1}`}
                />
              </View>
            ))}
          </View>
        )}

        {bodyParams.length === 0 && !headerNeedsMedia && !headerNeedsText && (
          <Text style={styles.helper}>
            This template has no variables — review the preview and tap Send.
          </Text>
        )}
      </ScrollView>

      <View style={[styles.sendBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!canSend}
          accessibilityLabel="Send template"
          testID="wa-template-send-btn"
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>
                Send to {phone || "(open from chat)"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  scroll: { gap: 16, padding: 16 },
  previewCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  metaRow: { paddingHorizontal: 4 },
  metaText: { fontSize: 12, color: Colors.textTertiary },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    color: Colors.text,
  },
  variableRow: { gap: 4 },
  variableLabel: { fontSize: 12, color: "#075E54", fontWeight: "700" },
  helper: { fontSize: 13, color: Colors.textTertiary },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    borderRadius: 10,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sendBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 14,
    borderRadius: 24,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
