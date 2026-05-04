import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const WA_SENT_BG = "#DCF8C6";
const WA_RECV_BG = "#FFFFFF";
const WA_SCREEN_BG = "#ECE5DD";

interface WaMessage {
  id: string;
  from: string | null;
  to: string | null;
  message: string | null;
  direction: "inbound" | "outbound";
  status: string | null;
  createdAt: string;
  mediaType?: string | null;
  whatsappCustomer?: { firstName: string | null; lastName: string | null } | null;
}

interface Template {
  id: string;
  name: string;
  language: string;
  components?: { type: string; text?: string }[];
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeliveryTick({ status }: { status: string | null }) {
  if (status === "read") return <Text style={styles.tickBlue}>✓✓</Text>;
  if (status === "delivered") return <Text style={styles.tick}>✓✓</Text>;
  return <Text style={styles.tick}>✓</Text>;
}

function WaBubble({ msg }: { msg: WaMessage }) {
  const isSent = msg.direction === "outbound";
  const text = msg.message ?? (msg.mediaType ? `📎 ${msg.mediaType}` : "");

  return (
    <View style={[styles.bubbleRow, isSent ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleRecv]}>
        <Text style={styles.bubbleText}>{text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>{formatTime(msg.createdAt)}</Text>
          {isSent && <DeliveryTick status={msg.status} />}
        </View>
      </View>
    </View>
  );
}

export default function WhatsAppConversation() {
  const { phone: rawPhone } = useLocalSearchParams<{ phone: string }>();
  const phone = decodeURIComponent(rawPhone ?? "");
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [windowOpen, setWindowOpen] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [contactName, setContactName] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchMessages(silent = false) {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/mobile/whatsapp/messages?phone=${encodeURIComponent(phone)}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const msgs: WaMessage[] = data.messages ?? [];
      setMessages(msgs);
      if (!contactName && msgs.length > 0) {
        const first = msgs.find((m) => m.whatsappCustomer);
        if (first?.whatsappCustomer) {
          const { firstName, lastName } = first.whatsappCustomer;
          const name = [firstName, lastName].filter(Boolean).join(" ");
          if (name) setContactName(name);
        }
      }
      if (!silent) setLoading(false);
    } catch {
      if (!silent) setLoading(false);
    }
  }

  async function checkWindow() {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/mobile/whatsapp/window?phone=${encodeURIComponent(phone)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setWindowOpen(data.isOpen ?? true);
      }
    } catch {}
  }

  async function fetchTemplates() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? data ?? []);
      }
    } catch {}
  }

  useEffect(() => {
    fetchMessages();
    checkWindow();
    fetchTemplates();
    pollRef.current = setInterval(() => fetchMessages(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phone]);

  useEffect(() => {
    const title = contactName || phone;
    navigation.setOptions({ headerTitle: title });
  }, [contactName, phone]);

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    Keyboard.dismiss();
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/mobile/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "text", phone, message: trimmed }),
      });
      fetchMessages(true);
    } catch {}
    setSending(false);
  }

  async function sendTemplate(templateName: string) {
    setShowTemplates(false);
    setSending(true);
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/mobile/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "template", phone, templateName }),
      });
      fetchMessages(true);
    } catch {}
    setSending(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: WA_SCREEN_BG }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
        renderItem={({ item }) => <WaBubble msg={item} />}
      />

      {!windowOpen && (
        <View style={styles.windowWarning}>
          <Ionicons name="time-outline" size={14} color="#856404" />
          <Text style={styles.windowWarningText}>
            24-hour window closed. Use a template to restart the conversation.
          </Text>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={() => setShowTemplates(true)}
        >
          <Ionicons name="list-outline" size={22} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={windowOpen ? "Type a message…" : "Use template to message"}
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={4096}
          editable={windowOpen}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending || !windowOpen) && styles.sendBtnDisabled]}
          onPress={sendText}
          disabled={!text.trim() || sending || !windowOpen}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showTemplates} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.templateModal}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateTitle}>Send a Template</Text>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={templates}
            keyExtractor={(t) => t.id ?? t.name}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No templates available</Text>
            }
            renderItem={({ item }) => {
              const bodyComp = item.components?.find((c) => c.type === "BODY");
              return (
                <TouchableOpacity
                  style={styles.templateItem}
                  onPress={() => sendTemplate(item.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.templateName}>{item.name}</Text>
                  {bodyComp?.text && (
                    <Text style={styles.templateBody} numberOfLines={2}>{bodyComp.text}</Text>
                  )}
                  <Text style={styles.templateLang}>{item.language}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  messageList: { paddingVertical: 12, paddingHorizontal: 8, gap: 2 },
  bubbleRow: { flexDirection: "row", marginVertical: 1 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  bubbleSent: {
    backgroundColor: WA_SENT_BG,
    borderTopRightRadius: 2,
  },
  bubbleRecv: {
    backgroundColor: WA_RECV_BG,
    borderTopLeftRadius: 2,
  },
  bubbleText: { fontSize: 15, color: "#1A1A1A", lineHeight: 20 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 },
  bubbleTime: { fontSize: 11, color: "#667781" },
  tick: { fontSize: 11, color: "#667781" },
  tickBlue: { fontSize: 11, color: "#53BDEB" },
  windowWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff3cd",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#ffc107",
  },
  windowWarningText: { fontSize: 12, color: "#856404", flex: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: "#F0F0F0",
    gap: 6,
  },
  templateBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 15,
    color: "#1A1A1A",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  templateModal: { flex: 1, backgroundColor: Colors.background },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  templateTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  templateItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  templateName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  templateBody: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  templateLang: { fontSize: 11, color: Colors.primary, marginTop: 4 },
});
