import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { whatsappApi, Template } from "@/lib/whatsapp-api";

interface Props {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onSent: () => void;
}

function extractBodyText(components: any): string {
  if (!components) return "";
  const arr = Array.isArray(components) ? components : [];
  const body = arr.find((c: any) => c.type === "BODY" || c.type === "body");
  return body?.text || "";
}

function countParams(text: string): number {
  const matches = text.match(/\{\{\d+\}\}/g);
  return matches ? matches.length : 0;
}

function previewBody(text: string, vars: string[]): string {
  let result = text;
  vars.forEach((v, i) => {
    result = result.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
  });
  return result;
}

export function TemplateSelector({ visible, phone, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [vars, setVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    whatsappApi.getTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    return t.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectTemplate = (t: Template) => {
    const bodyText = extractBodyText(t.components);
    const paramCount = countParams(bodyText);
    setSelected(t);
    setVars(Array(paramCount).fill(""));
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await whatsappApi.sendTemplate(phone, selected.name, vars);
      onSent();
      onClose();
      setSelected(null);
      setVars([]);
    } catch (err: any) {
      Alert.alert("Send Failed", err.message || "Failed to send template.");
    } finally {
      setSending(false);
    }
  };

  const bodyText = selected ? extractBodyText(selected.components) : "";
  const preview = selected ? previewBody(bodyText, vars) : "";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            {selected ? "Configure Template" : "Select Template"}
          </Text>
          <Pressable onPress={() => { setSelected(null); setVars([]); onClose(); }}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </Pressable>
        </View>

        {!selected ? (
          <>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={14} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search templates…"
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No approved templates found</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(t) => t.id}
                renderItem={({ item }) => {
                  const body = extractBodyText(item.components);
                  const paramCount = countParams(body);
                  return (
                    <Pressable
                      style={({ pressed }) => [styles.templateRow, pressed && styles.templateRowPressed]}
                      onPress={() => handleSelectTemplate(item)}
                    >
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{item.name}</Text>
                        <Text style={styles.templatePreview} numberOfLines={2}>{body}</Text>
                        <View style={styles.templateMeta}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category}</Text>
                          </View>
                          {paramCount > 0 && (
                            <Text style={styles.paramHint}>{paramCount} variable{paramCount > 1 ? "s" : ""}</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
              />
            )}
          </>
        ) : (
          <ScrollView style={styles.configScroll} keyboardShouldPersistTaps="handled">
            <Pressable style={styles.backBtn} onPress={() => { setSelected(null); setVars([]); }}>
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.backBtnText}>Back to templates</Text>
            </Pressable>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewText}>{preview || bodyText}</Text>
            </View>

            {vars.length > 0 && (
              <View style={styles.varsSection}>
                <Text style={styles.varsSectionTitle}>Fill in variables</Text>
                {vars.map((v, i) => (
                  <View key={i} style={styles.varRow}>
                    <Text style={styles.varLabel}>{`{{${i + 1}}}`}</Text>
                    <TextInput
                      style={styles.varInput}
                      placeholder={`Variable ${i + 1}`}
                      value={v}
                      onChangeText={(text) => {
                        const next = [...vars];
                        next[i] = text;
                        setVars(next);
                      }}
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Send Template</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: 300,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textTertiary },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  templateRowPressed: { backgroundColor: Colors.surfaceAlt },
  templateInfo: { flex: 1, gap: 4 },
  templateName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  templatePreview: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
  },
  paramHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  sep: { height: 1, backgroundColor: Colors.borderLight },

  configScroll: { padding: Spacing.xl },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.lg,
  },
  backBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: "#d9fdd3",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: 6,
  },
  previewLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  previewText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  varsSection: { gap: Spacing.md, marginBottom: Spacing.xl },
  varsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  varRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  varLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
    width: 44,
  },
  varInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#25D366",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
});
