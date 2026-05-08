import { View, Text, Image, StyleSheet, Linking, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const WA_OUTGOING_BG = "#D9FDD3";

export interface TemplateComponentLike {
  type?: string;
  format?: string;
  text?: string;
  example?: { body_text?: unknown[]; header_text?: unknown[]; header_handle?: unknown[] };
  buttons?: TemplateButtonLike[];
}

export interface TemplateButtonLike {
  type?: string;
  text?: string;
  url?: string;
  phone_number?: string;
  example?: string | string[];
  otp_type?: string;
}

interface PreviewProps {
  components: TemplateComponentLike[] | null | undefined;
  bodyParams: string[];
  headerParamText?: string | null;
  headerMediaUri?: string | null;
}

const TEXT_VAR_RE = /\{\{(\d+)\}\}/g;

function substitute(text: string, params: string[]): string {
  return text.replace(TEXT_VAR_RE, (_, idx: string) => {
    const i = Number(idx) - 1;
    const v = params[i];
    return v !== undefined && v !== "" ? String(v) : `{{${idx}}}`;
  });
}

function findComponent(
  components: TemplateComponentLike[] | null | undefined,
  type: string,
): TemplateComponentLike | null {
  if (!components) return null;
  return components.find((c) => (c.type ?? "").toUpperCase() === type) ?? null;
}

function buttonIcon(type?: string): keyof typeof Ionicons.glyphMap | null {
  switch ((type ?? "").toUpperCase()) {
    case "URL":
      return "link-outline";
    case "PHONE_NUMBER":
      return "call-outline";
    case "QUICK_REPLY":
      return "return-up-back-outline";
    case "COPY_CODE":
      return "copy-outline";
    case "FLOW":
      return "flash-outline";
    case "VOICE_CALL":
      return "mic-outline";
    case "MPM":
    case "SPM":
      return "bag-outline";
    default:
      return null;
  }
}

function HeaderBlock({
  header,
  headerParamText,
  headerMediaUri,
}: {
  header: TemplateComponentLike | null;
  headerParamText: string | null | undefined;
  headerMediaUri: string | null | undefined;
}) {
  if (!header) return null;
  const fmt = (header.format ?? "TEXT").toUpperCase();

  if (fmt === "TEXT" && header.text) {
    const rendered = substitute(header.text, headerParamText ? [headerParamText] : []);
    return <Text style={styles.headerText}>{rendered}</Text>;
  }

  if (fmt === "IMAGE") {
    const exampleHandle = (header.example?.header_handle as string[] | undefined)?.[0];
    const uri = headerMediaUri ?? exampleHandle;
    if (uri) {
      return <Image source={{ uri }} style={styles.headerImage} resizeMode="cover" />;
    }
    return (
      <View style={styles.headerPlaceholder}>
        <Ionicons name="image-outline" size={28} color="#8b8b8b" />
        <Text style={styles.headerPlaceholderText}>Image header</Text>
      </View>
    );
  }

  if (fmt === "VIDEO") {
    return (
      <View style={[styles.headerPlaceholder, styles.headerVideo]}>
        <Ionicons name="play-circle-outline" size={28} color="#fff" />
        <Text style={[styles.headerPlaceholderText, { color: "#fff" }]}>
          {headerMediaUri ? "Video selected" : "Video header"}
        </Text>
      </View>
    );
  }

  if (fmt === "DOCUMENT") {
    return (
      <View style={styles.headerDoc}>
        <Ionicons name="document-text-outline" size={20} color="#dc2626" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerDocTitle}>
            {headerMediaUri ? "Document selected" : "Document header"}
          </Text>
          <Text style={styles.headerDocSubtitle}>PDF</Text>
        </View>
      </View>
    );
  }

  if (fmt === "LOCATION") {
    return (
      <View style={styles.headerLocation}>
        <Ionicons name="location-outline" size={20} color="#075E54" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerDocTitle}>Location</Text>
          <Text style={styles.headerDocSubtitle}>
            Address provided at send time
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

function ButtonRow({ btn }: { btn: TemplateButtonLike }) {
  const icon = buttonIcon(btn.type);
  const label = (() => {
    const upper = (btn.type ?? "").toUpperCase();
    if (upper === "COPY_CODE") {
      const ex = Array.isArray(btn.example) ? btn.example[0] : btn.example;
      return ex ? `Copy code · ${ex}` : "Copy code";
    }
    if (upper === "OTP" && btn.otp_type === "COPY_CODE") return "Copy code";
    if (upper === "OTP" && btn.otp_type === "ONE_TAP") return "Autofill";
    return btn.text || upper || "Button";
  })();

  function onPress() {
    if (btn.type === "URL" && btn.url) {
      Linking.openURL(btn.url).catch(() => {});
    } else if (btn.type === "PHONE_NUMBER" && btn.phone_number) {
      Linking.openURL(`tel:${btn.phone_number}`).catch(() => {});
    }
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon && <Ionicons name={icon} size={16} color="#128C7E" />}
      <Text style={styles.buttonText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function TemplatePreview({
  components,
  bodyParams,
  headerParamText,
  headerMediaUri,
}: PreviewProps) {
  const header = findComponent(components, "HEADER");
  const body = findComponent(components, "BODY");
  const footer = findComponent(components, "FOOTER");
  const buttonsBlock = findComponent(components, "BUTTONS");
  const buttons = (buttonsBlock?.buttons ?? []) as TemplateButtonLike[];

  const ctaButtons = buttons.filter(
    (b) => (b.type ?? "").toUpperCase() !== "QUICK_REPLY",
  );
  const quickReplies = buttons.filter(
    (b) => (b.type ?? "").toUpperCase() === "QUICK_REPLY",
  );

  const bodyText = body?.text ? substitute(body.text, bodyParams) : "";
  const lines = bodyText.split("\n");

  return (
    <View style={styles.bubbleWrap}>
      <View style={styles.bubble}>
        {header ? (
          <View style={styles.headerWrap}>
            <HeaderBlock
              header={header}
              headerParamText={headerParamText}
              headerMediaUri={headerMediaUri}
            />
          </View>
        ) : null}

        <View style={styles.bodyWrap}>
          {lines.map((line, i) => (
            <Text key={`l-${i}`} style={styles.bodyText}>
              {line.length === 0 ? " " : line}
            </Text>
          ))}
        </View>

        {footer?.text ? (
          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>{footer.text}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaTime}>now</Text>
          <Text style={styles.metaTick}>✓✓</Text>
        </View>

        {ctaButtons.length > 0 && (
          <View style={styles.buttonGroup}>
            {ctaButtons.map((b, i) => (
              <ButtonRow key={`cta-${i}`} btn={b} />
            ))}
          </View>
        )}

        {quickReplies.length > 0 && (
          <View style={styles.quickReplyRow}>
            {quickReplies.map((b, i) => (
              <View key={`qr-${i}`} style={styles.quickReply}>
                <Text style={styles.quickReplyText} numberOfLines={1}>
                  {b.text || "Quick reply"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ECE5DD",
    borderRadius: 12,
  },
  bubble: {
    maxWidth: "92%",
    minWidth: 220,
    backgroundColor: WA_OUTGOING_BG,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerWrap: { padding: 8, paddingBottom: 0 },
  headerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerImage: {
    width: "100%",
    height: 160,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  headerPlaceholder: {
    height: 120,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  headerVideo: { backgroundColor: "#1f2937" },
  headerPlaceholderText: { fontSize: 12, color: "#6b7280" },
  headerDoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(7,94,84,0.08)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerDocTitle: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  headerDocSubtitle: { fontSize: 11, color: "#6b7280" },
  bodyWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  bodyText: { fontSize: 14, color: "#1A1A1A", lineHeight: 20 },
  footerWrap: { paddingHorizontal: 12, paddingBottom: 4 },
  footerText: { fontSize: 12, color: "#6b7280", fontStyle: "italic" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 4,
  },
  metaTime: { fontSize: 11, color: "#667781" },
  metaTick: { fontSize: 11, color: "#53BDEB" },
  buttonGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#c5eac0",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#c5eac0",
  },
  buttonText: { fontSize: 13, color: "#128C7E", fontWeight: "600" },
  quickReplyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#c5eac0",
  },
  quickReply: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "#bde5dc",
  },
  quickReplyText: { fontSize: 12, color: "#128C7E", fontWeight: "600" },
});

/** Counts {{N}} placeholders in a body string. Re-exported for callers that
 *  need to know how many text inputs to render. */
export function countTemplateBodyVariables(body: string | null | undefined): number {
  if (!body) return 0;
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  const set = new Set(matches.map((m) => m.replace(/[{}]/g, "")));
  return set.size;
}
