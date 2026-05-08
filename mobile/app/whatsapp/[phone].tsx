import { useCallback, useEffect, useRef, useState } from "react";
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
  AppState,
  AppStateStatus,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";

const WA_SENT_BG = "#DCF8C6";
const WA_RECV_BG = "#FFFFFF";
const WA_SCREEN_BG = "#ECE5DD";

const POLL_ACTIVE_MS = 5_000;
const POLL_BACKGROUND_MS = 30_000;
const MESSAGE_LIMIT = 100;

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

interface WindowInfo {
  canMessage: boolean;
  hoursRemaining: number | null;
  expiresAt: string | null;
}

interface CustomerSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  tags: string[];
  notes: string | null;
  isOptedIn: boolean;
}

interface MessagesResponse {
  messages: WaMessage[];
  nextCursor: string | null;
  window: WindowInfo;
  customer: CustomerSummary | null;
}

interface Template {
  id: string;
  name: string;
  language: string;
  components?: { type: string; text?: string }[];
}

interface TemplatesResponse {
  items: Template[];
  fetchedAt: number;
  notModified: boolean;
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
    <View
      style={[styles.bubbleRow, isSent ? styles.bubbleRowRight : styles.bubbleRowLeft]}
      testID={`wa-msg-${msg.id}`}
    >
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
  const [windowInfo, setWindowInfo] = useState<WindowInfo>({
    canMessage: true,
    hoursRemaining: null,
    expiresAt: null,
  });
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocused = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const errorShown = useRef(false);
  const api = useRef(withAuth(getToken)).current;

  const fetchMessages = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        const data = await api<MessagesResponse>(
          `/api/mobile/whatsapp/messages?phone=${encodeURIComponent(phone)}&limit=${MESSAGE_LIMIT}`,
        );
        setMessages(data.messages ?? []);
        setWindowInfo(
          data.window ?? { canMessage: true, hoursRemaining: null, expiresAt: null },
        );
        if (data.customer) setCustomer(data.customer);
        errorShown.current = false;
      } catch (error) {
        if (!silent && !errorShown.current) {
          errorShown.current = true;
          const message =
            error instanceof ApiError ? error.message : "Could not load messages.";
          Alert.alert("WhatsApp", message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api, phone],
  );

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api<TemplatesResponse>("/api/mobile/whatsapp/templates");
      setTemplates(data.items ?? []);
    } catch {
      /* templates are optional; surface error only when user taps the button. */
    }
  }, [api]);

  const startPolling = useCallback(
    (intervalMs: number) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (appState.current === "active" && isFocused.current) {
          fetchMessages({ silent: true });
        }
      }, intervalMs);
    },
    [fetchMessages],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Templates are fetched once on mount; the server caches them for 60s.
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // AppState transitions adjust polling cadence.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev !== "active" && next === "active" && isFocused.current) {
        fetchMessages({ silent: true });
        startPolling(POLL_ACTIVE_MS);
      } else if (next !== "active") {
        startPolling(POLL_BACKGROUND_MS);
      }
    });
    return () => {
      sub.remove();
    };
  }, [fetchMessages, startPolling]);

  // Initial load + adaptive polling tied to screen focus.
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      fetchMessages();
      startPolling(POLL_ACTIVE_MS);
      return () => {
        isFocused.current = false;
        stopPolling();
      };
    }, [fetchMessages, startPolling, stopPolling]),
  );

  useEffect(() => {
    const title =
      customer?.fullName ||
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
      phone;
    navigation.setOptions({ headerTitle: title });
  }, [customer, navigation, phone]);

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    Keyboard.dismiss();
    try {
      await api("/api/mobile/whatsapp/send", {
        method: "POST",
        body: { type: "text", phone, message: trimmed },
      });
      fetchMessages({ silent: true });
    } catch (error) {
      setText(trimmed);
      const message =
        error instanceof ApiError ? error.message : "Could not send message.";
      Alert.alert("Send failed", message);
    } finally {
      setSending(false);
    }
  }

  async function sendTemplate(templateName: string) {
    setShowTemplates(false);
    setSending(true);
    try {
      await api("/api/mobile/whatsapp/send", {
        method: "POST",
        body: { type: "template", phone, templateName },
      });
      fetchMessages({ silent: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not send template.";
      Alert.alert("Send failed", message);
    } finally {
      setSending(false);
    }
  }

  function openTemplates() {
    if (templates.length === 0) {
      fetchTemplates();
    }
    setShowTemplates(true);
  }

  if (loading) {
    return (
      <View style={styles.center} testID="wa-thread-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  const windowOpen = windowInfo.canMessage;

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
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
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
        <View style={styles.windowWarning} testID="wa-window-warning">
          <Ionicons name="time-outline" size={14} color="#856404" />
          <Text style={styles.windowWarningText}>
            24-hour window closed. Use a template to restart the conversation.
          </Text>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.templateBtn}
          onPress={openTemplates}
          accessibilityLabel="Open template picker"
          testID="wa-open-templates"
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
          editable={windowOpen && !sending}
          accessibilityLabel="Message input"
          testID="wa-message-input"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || sending || !windowOpen) && styles.sendBtnDisabled,
          ]}
          onPress={sendText}
          disabled={!text.trim() || sending || !windowOpen}
          accessibilityLabel="Send message"
          testID="wa-send-btn"
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showTemplates} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.templateModal}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateTitle}>Send a Template</Text>
            <TouchableOpacity
              onPress={() => setShowTemplates(false)}
              accessibilityLabel="Close template picker"
              testID="wa-close-templates"
            >
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
                  testID={`wa-template-${item.name}`}
                >
                  <Text style={styles.templateName}>{item.name}</Text>
                  {bodyComp?.text && (
                    <Text style={styles.templateBody} numberOfLines={2}>
                      {bodyComp.text}
                    </Text>
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
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
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
