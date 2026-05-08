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
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { chatCache, type CachedMessage } from "@/lib/chat/cache";
import { chatOutbox, type OutboxEntry, type OutboxPayload } from "@/lib/chat/outbox";
import { uploadChatAttachment, type UploadKind } from "@/lib/chat/upload";
import { useUnread } from "@/hooks/useUnread";
import { AttachmentSheet, type AttachmentKind } from "@/components/chat/AttachmentSheet";
import { ImageBubble } from "@/components/chat/ImageBubble";
import { FileBubble } from "@/components/chat/FileBubble";
import { LocationBubble } from "@/components/chat/LocationBubble";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

type Message = CachedMessage;

interface DisplayMessage extends Message {
  outboxStatus?: "pending" | "sending" | "failed";
  clientId?: string;
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
  onRetry,
}: {
  msg: DisplayMessage;
  isMine: boolean;
  showSender: boolean;
  onRetry?: (clientId: string) => void;
}) {
  const failed = msg.outboxStatus === "failed";
  const sending = msg.outboxStatus === "pending" || msg.outboxStatus === "sending";

  // Choose body renderer based on message type. Image and location bubbles get
  // their own visual treatment so we drop the standard padded text bubble.
  let body: React.ReactNode;
  let usesPlainBubble = true;

  switch (msg.messageType) {
    case "IMAGE":
      usesPlainBubble = false;
      body = <ImageBubble fileUrl={msg.fileUrl ?? null} uploading={sending} />;
      break;
    case "PDF":
    case "FILE":
      body = (
        <FileBubble
          fileUrl={msg.fileUrl ?? null}
          fileName={msg.fileName ?? null}
          fileSize={msg.fileSize ?? null}
          isPdf={msg.messageType === "PDF"}
          isMine={isMine}
          uploading={sending}
        />
      );
      break;
    case "LOCATION":
      body = (
        <LocationBubble
          latitude={msg.latitude ?? null}
          longitude={msg.longitude ?? null}
          isMine={isMine}
        />
      );
      break;
    case "TEXT":
    default:
      body = (
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
          {msg.content ?? ""}
        </Text>
      );
      break;
  }

  const innerStyle = usesPlainBubble
    ? [
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleOther,
        failed && styles.bubbleFailed,
        sending && styles.bubbleSending,
      ]
    : [
        styles.bubbleAttachment,
        failed && styles.bubbleFailed,
      ];

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
        <View style={innerStyle}>
          {body}
          <View style={styles.bubbleMeta}>
            <Text
              style={[
                styles.bubbleTime,
                usesPlainBubble && isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
              ]}
            >
              {formatTime(msg.createdAt)}
            </Text>
            {sending && (
              <Ionicons
                name="time-outline"
                size={11}
                color={
                  usesPlainBubble && isMine ? "rgba(255,255,255,0.7)" : Colors.textTertiary
                }
                style={styles.statusIcon}
              />
            )}
            {failed && (
              <Ionicons
                name="alert-circle"
                size={12}
                color={Colors.error}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
        {failed && msg.clientId && onRetry && (
          <TouchableOpacity
            onPress={() => onRetry(msg.clientId!)}
            style={styles.retryRow}
            accessibilityRole="button"
            accessibilityLabel="Retry sending message"
          >
            <Text style={styles.retryText}>Failed — tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Adaptive Polling Hook ──────────────────────────────────────────────────

const POLL_INTERVAL_FOREGROUND = 3000;
const POLL_INTERVAL_BACKGROUND = 30000;
const POLL_INTERVAL_INACTIVE = 10000;

type PollPhase = "active" | "inactive" | "background";

function useAdaptivePolling(
  callback: () => void | Promise<void>,
  deps: React.DependencyList
) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isVisible, setIsVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<PollPhase>("active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

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

  useEffect(() => {
    const phase = getPhase();
    phaseRef.current = phase;
    const interval = getInterval(phase);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (phase !== "background") {
      callback();
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function mergeMessages(
  prev: DisplayMessage[],
  serverMessages: Message[],
  outboxEntries: OutboxEntry[],
  myUser: { id: string; name: string; avatarUrl: string | null } | null
): DisplayMessage[] {
  // Server messages dominate by id. Outbox entries appear as pending/failed bubbles
  // for any clientId that doesn't yet have a server twin.
  const byId = new Map<string, DisplayMessage>();
  for (const m of serverMessages) byId.set(m.id, m);

  // Carry over any prev outbox entries that aren't in serverMessages yet (handles
  // the gap between a successful send and the next fetch returning the real row).
  for (const m of prev) {
    if (m.outboxStatus && !byId.has(m.id)) byId.set(m.id, m);
  }

  // Outbox entries -> display messages (clientId as id). Replaces any prev entry for the same clientId.
  for (const o of outboxEntries) {
    const display: DisplayMessage = {
      id: o.clientId,
      clientId: o.clientId,
      content: o.payload.content ?? null,
      messageType: o.payload.messageType ?? "TEXT",
      createdAt: new Date(o.createdAt).toISOString(),
      senderId: myUser?.id ?? "",
      sender: myUser ? { id: myUser.id, name: myUser.name, avatarUrl: myUser.avatarUrl } : null,
      fileUrl: o.payload.fileUrl ?? null,
      fileName: o.payload.fileName ?? null,
      fileSize: o.payload.fileSize ?? null,
      latitude: o.payload.latitude ?? null,
      longitude: o.payload.longitude ?? null,
      outboxStatus: o.status === "sent" ? undefined : (o.status as DisplayMessage["outboxStatus"]),
    };
    byId.set(o.clientId, display);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

// ─── Chat Room Component ────────────────────────────────────────────────────

export default function ChatRoom() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const { travelUser } = useCurrentUser();
  const { clear: clearUnread } = useUnread();
  const insets = useSafeAreaInsets();

  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connecting");
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isFocusedRef = useRef(true);
  const lastSeenIdRef = useRef<string | null>(null);

  const myUser = travelUser
    ? { id: travelUser.id, name: travelUser.name, avatarUrl: null }
    : null;

  const messages = mergeMessages(
    [], // prev not needed when we render fresh each time from state
    serverMessages,
    outbox,
    myUser
  );

  const refreshOutbox = useCallback(async () => {
    if (!groupId) return;
    const list = await chatOutbox.list(groupId);
    setOutbox(list);
  }, [groupId]);

  const persistLastSeen = useCallback(
    async (latestMessageId: string | null) => {
      if (!groupId) return;
      lastSeenIdRef.current = latestMessageId;
      await chatCache.setLastSeen(groupId, latestMessageId, 0);
      clearUnread(groupId);
    },
    [groupId, clearUnread]
  );

  const fetchMessages = useCallback(
    async (initial = false) => {
      if (!groupId) return;
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
        setServerMessages((prev) => {
          if (
            msgs.length === prev.length &&
            msgs.length > 0 &&
            msgs[msgs.length - 1].id === prev[prev.length - 1]?.id
          ) {
            return prev;
          }
          return msgs;
        });

        // Persist to SQLite cache (best-effort)
        if (msgs.length > 0) {
          await chatCache.upsertMessages(groupId, msgs);
          const latestId = msgs[msgs.length - 1].id;
          if (isFocusedRef.current) {
            await persistLastSeen(latestId);
          }
        }
        setConnectionStatus("connected");
        if (initial) setLoading(false);
      } catch {
        setConnectionStatus("error");
        if (initial) setLoading(false);
      }
    },
    [getToken, groupId, persistLastSeen]
  );

  const fetchGroupInfo = useCallback(async () => {
    if (!groupId) return;
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

  // Hydrate from SQLite on mount, then poll
  useEffect(() => {
    let cancelled = false;
    if (!groupId) return;
    (async () => {
      const [cached, queued, state] = await Promise.all([
        chatCache.loadMessages(groupId),
        chatOutbox.list(groupId),
        chatCache.getGroupState(groupId),
      ]);
      if (cancelled) return;
      lastSeenIdRef.current = state.lastSeenMessageId;
      setServerMessages(cached);
      setOutbox(queued);
      if (cached.length > 0) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Adaptive polling (also triggers an immediate flush attempt)
  const flushOutbox = useCallback(async () => {
    if (!groupId) return;
    const result = await chatOutbox.flush({ groupId, getToken });
    if (result.sentClientIds.length > 0) {
      await refreshOutbox();
      await fetchMessages();
    } else if (result.failedClientIds.length > 0) {
      await refreshOutbox();
    }
  }, [groupId, getToken, refreshOutbox, fetchMessages]);

  const { setIsVisible } = useAdaptivePolling(
    () => {
      void fetchMessages();
      void flushOutbox();
    },
    [fetchMessages, flushOutbox]
  );

  // Track screen focus/blur
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsVisible(true);
      isFocusedRef.current = true;
      void fetchMessages();
      void flushOutbox();
      // Mark current latest as read
      if (serverMessages.length > 0) {
        const latestId = serverMessages[serverMessages.length - 1].id;
        void persistLastSeen(latestId);
      } else {
        void persistLastSeen(null);
      }
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsVisible(false);
      isFocusedRef.current = false;
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, fetchMessages, flushOutbox, persistLastSeen, setIsVisible]);

  // Initial load (also triggers cache hydration above; this kicks off network)
  useEffect(() => {
    fetchMessages(true);
    fetchGroupInfo();
    void refreshOutbox();
  }, [fetchMessages, fetchGroupInfo, refreshOutbox]);

  // Flush outbox whenever AppState comes back to active
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void flushOutbox();
    });
    return () => sub.remove();
  }, [flushOutbox]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || !groupId) return;
    setText("");
    Keyboard.dismiss();

    // Enqueue first so a force-quit doesn't lose the message
    await chatOutbox.enqueue(groupId, { messageType: "TEXT", content: trimmed });
    await refreshOutbox();
    void flushOutbox();
  }

  async function retrySend(clientId: string) {
    await chatOutbox.retry(clientId);
    await refreshOutbox();
    void flushOutbox();
  }

  async function enqueueAttachmentMessage(payload: OutboxPayload) {
    if (!groupId) return;
    await chatOutbox.enqueue(groupId, payload);
    await refreshOutbox();
    void flushOutbox();
  }

  async function uploadAndSend(uri: string, kind: UploadKind, fileName?: string, contentType?: string) {
    if (!groupId) return;
    setUploading(true);
    try {
      const result = await uploadChatAttachment({
        groupId,
        uri,
        kind,
        fileName,
        contentType,
        getToken,
      });
      const messageType =
        kind === "image" ? "IMAGE" : kind === "pdf" ? "PDF" : "FILE";
      await enqueueAttachmentMessage({
        messageType,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
      });
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message ?? "Could not upload attachment.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAttachmentPick(kind: AttachmentKind) {
    if (!groupId) return;
    if (kind === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera access is required to take a photo.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      await uploadAndSend(asset.uri, "image", asset.fileName ?? undefined, asset.mimeType ?? undefined);
    } else if (kind === "photo") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Photo library access is required.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      await uploadAndSend(asset.uri, "image", asset.fileName ?? undefined, asset.mimeType ?? undefined);
    } else if (kind === "file") {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const isPdf = (asset.mimeType ?? "").includes("pdf") || (asset.name ?? "").toLowerCase().endsWith(".pdf");
      await uploadAndSend(
        asset.uri,
        isPdf ? "pdf" : "file",
        asset.name,
        asset.mimeType ?? undefined
      );
    } else if (kind === "location") {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Location access is required to share your location.");
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await enqueueAttachmentMessage({
          messageType: "LOCATION",
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err: any) {
        Alert.alert("Location unavailable", err?.message ?? "Could not get your location.");
      }
    }
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
          return (
            <MessageBubble
              msg={item}
              isMine={isMine}
              showSender={showSender}
              onRetry={retrySend}
            />
          );
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={20}
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setAttachmentSheetOpen(true)}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Add attachment"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="attach" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
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
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <AttachmentSheet
        visible={attachmentSheetOpen}
        onClose={() => setAttachmentSheetOpen(false)}
        onPick={handleAttachmentPick}
      />
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
  bubbleSending: { opacity: 0.7 },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 16,
  },
  bubbleAttachment: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTextOther: { color: "#1A1A1A" },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bubbleTime: { fontSize: 10, marginTop: 2 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
  bubbleTimeOther: { color: Colors.textTertiary },
  statusIcon: { marginTop: 1 },
  retryRow: { paddingHorizontal: 4, paddingTop: 2, alignSelf: "flex-end" },
  retryText: { fontSize: 11, color: Colors.error, fontWeight: "600" },
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
