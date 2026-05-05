import { useEffect, useRef, useState, useCallback } from "react";
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
  Keyboard,
  AppState,
  AppStateStatus,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface Message {
  id: string;
  content: string | null;
  messageType: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string; avatarUrl: string | null } | null;
}

interface GroupInfo {
  name: string;
  members: { id: string; travelAppUser: { name: string } }[];
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({
  msg,
  isMine,
  showSender,
}: {
  msg: Message;
  isMine: boolean;
  showSender: boolean;
}) {
  const text =
    msg.messageType !== "TEXT"
      ? `📎 ${msg.messageType.charAt(0) + msg.messageType.slice(1).toLowerCase()}`
      : (msg.content ?? "");

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isMine && (
        <View style={styles.senderAvatar}>
          <Text style={styles.senderAvatarText}>
            {msg.sender?.name.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
      )}
      <View style={styles.bubbleWrap}>
        {!isMine && showSender && msg.sender && (
          <Text style={styles.senderName}>{msg.sender.name}</Text>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
            {text}
          </Text>
          <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
            {formatTime(msg.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Adaptive Polling Hook ──────────────────────────────────────────────────

const POLL_INTERVAL_FOREGROUND = 3000;   // 3s when app is active and chat visible
const POLL_INTERVAL_BACKGROUND = 30000;  // 30s when app is backgrounded
const POLL_INTERVAL_INACTIVE = 10000;    // 10s when app is inactive (e.g., modal open)

type PollPhase = "active" | "inactive" | "background";

function useAdaptivePolling(
  callback: () => void | Promise<void>,
  deps: React.DependencyList
) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isVisible, setIsVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<PollPhase>("active");

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Determine polling phase based on app state + visibility
  const getPhase = useCallback((): PollPhase => {
    if (appState === "background") return "background";
    if (appState === "inactive") return "inactive";
    if (!isVisible) return "inactive";
    return "active";
  }, [appState, isVisible]);

  const getInterval = useCallback((phase: PollPhase): number => {
    switch (phase) {
      case "active": return POLL_INTERVAL_FOREGROUND;
      case "inactive": return POLL_INTERVAL_INACTIVE;
      case "background": return POLL_INTERVAL_BACKGROUND;
    }
  }, []);

  // Set up adaptive polling
  useEffect(() => {
    const phase = getPhase();
    phaseRef.current = phase;
    const interval = getInterval(phase);

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll if not in background (background polling handled by push notifications)
    if (phase !== "background") {
      callback(); // immediate fetch
      intervalRef.current = setInterval(callback, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPhase, getInterval, ...deps]);

  return { isVisible, setIsVisible, phase: phaseRef.current };
}

// ─── Chat Room Component ────────────────────────────────────────────────────

export default function ChatRoom() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const { travelUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connecting");
  const flatListRef = useRef<FlatList>(null);
  const lastIdRef = useRef<string | null>(null);
  const viewabilityRef = useRef(true); // Track if chat is viewable

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/chat/groups/${groupId}/messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        setConnectionStatus("error");
        return;
      }
      const data = await res.json();
      const msgs: Message[] = data.messages ?? [];
      setMessages((prev) => {
        // Only update if there are new messages to prevent unnecessary re-renders
        if (msgs.length === prev.length && msgs.length > 0) {
          const lastNew = msgs[msgs.length - 1].id;
          const lastPrev = prev[prev.length - 1]?.id;
          if (lastNew === lastPrev) return prev;
        }
        return msgs;
      });
      if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id;
      setConnectionStatus("connected");
      if (initial) setLoading(false);
    } catch {
      setConnectionStatus("error");
      if (initial) setLoading(false);
    }
  }, [getToken, groupId]);

  const fetchGroupInfo = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/chat/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const name = data.group?.name ?? "Chat";
        const members = data.members ?? [];
        setGroupInfo({ name, members });
        navigation.setOptions({
          headerTitle: name,
          headerRight: () => (
            <View style={styles.headerRight}>
              <Ionicons name="people-outline" size={18} color={Colors.textTertiary} />
              <Text style={styles.headerMemberCount}>{members.length}</Text>
            </View>
          ),
        });
      }
    } catch {}
  }, [getToken, groupId, navigation]);

  // Use adaptive polling
  const { setIsVisible } = useAdaptivePolling(
    () => fetchMessages(),
    [fetchMessages]
  );

  // Track screen focus/blur for visibility
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsVisible(true);
      viewabilityRef.current = true;
      fetchMessages(); // immediate refresh on focus
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsVisible(false);
      viewabilityRef.current = false;
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, fetchMessages, setIsVisible]);

  // Initial load
  useEffect(() => {
    fetchMessages(true);
    fetchGroupInfo();
  }, [fetchMessages, fetchGroupInfo]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    Keyboard.dismiss();

    const optimisticId = `opt-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      content: trimmed,
      messageType: "TEXT",
      createdAt: new Date().toISOString(),
      senderId: travelUser?.id ?? "",
      sender: travelUser ? { id: travelUser.id, name: travelUser.name, avatarUrl: null } : null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/chat/groups/${groupId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageType: "TEXT", content: trimmed }),
      });
      fetchMessages();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(trimmed);
    }
    setSending(false);
  }

  const myId = travelUser?.id ?? "";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Connection status indicator */}
      {connectionStatus === "error" && (
        <View style={styles.connectionBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.error} />
          <Text style={styles.connectionText}>Connection issue. Retrying…</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isMine = item.senderId === myId;
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showSender = !isMine && prevMsg?.senderId !== item.senderId;
          return <MessageBubble msg={item} isMine={isMine} showSender={showSender} />;
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={20}
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={2000}
          returnKeyType="default"
          accessibilityLabel="Message input"
          accessibilityHint="Type your message here"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 4 },
  headerMemberCount: { fontSize: 13, color: Colors.textTertiary },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "#fef2f2",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  connectionText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "600",
  },
  messageList: { paddingVertical: 12, paddingHorizontal: 12, gap: 4 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 2,
  },
  senderAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  bubbleWrap: { maxWidth: "78%" },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTextOther: { color: "#1A1A1A" },
  bubbleTime: { fontSize: 10, marginTop: 2, textAlign: "right" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  bubbleTimeOther: { color: Colors.textTertiary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});