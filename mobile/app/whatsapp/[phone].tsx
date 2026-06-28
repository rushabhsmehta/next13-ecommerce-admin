import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AppState,
  AppStateStatus,
  Alert,
  Modal,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import {
  AttachmentSheet,
  type AttachmentKind,
} from "@/components/chat/AttachmentSheet";
import {
  MessageActions,
  type MessageAction,
} from "@/components/chat/MessageActions";
import { ReplyPreview } from "@/components/chat/ReplyPreview";
import {
  MessageBubble,
  type WaMessage,
  type ReplyTargetPreview,
} from "@/components/whatsapp/MessageBubble";
import {
  uploadWhatsAppMedia,
  type WhatsAppUploadKind,
} from "@/lib/whatsapp/upload";
import { whatsappCache } from "@/lib/whatsapp/cache";
import {
  whatsappOutbox,
  type OutboxEntry,
  type OutboxPayload,
} from "@/lib/whatsapp/outbox";
import { useWhatsAppUnread } from "@/hooks/useWhatsAppUnread";

const WA_SCREEN_BG = "#ECE5DD";

const POLL_ACTIVE_MS = 5_000;
const POLL_BACKGROUND_MS = 30_000;
const MESSAGE_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 350;

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

interface SearchHit {
  id: string;
  message: string | null;
  createdAt: string;
  direction: "inbound" | "outbound";
}

function readContextWamid(msg: WaMessage): string | null {
  const ctx = msg.payload && typeof msg.payload === "object"
    ? (msg.payload as Record<string, unknown>)["context"]
    : null;
  if (!ctx || typeof ctx !== "object") return null;
  const v = (ctx as Record<string, unknown>)["message_id"];
  return typeof v === "string" ? v : null;
}

function previewText(msg: WaMessage | null): string {
  if (!msg) return "";
  if (msg.message) return msg.message;
  const payload = msg.payload as Record<string, unknown> | null | undefined;
  if (payload) {
    for (const kind of ["image", "video", "audio", "document"] as const) {
      if (payload[kind]) return `📎 ${kind}`;
    }
  }
  return "Media";
}

export default function WhatsAppConversation() {
  const { phone: rawPhone } = useLocalSearchParams<{ phone: string }>();
  const phone = decodeURIComponent(rawPhone ?? "");
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [outboxEntries, setOutboxEntries] = useState<OutboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { clear: clearWhatsAppUnread } = useWhatsAppUnread();
  const [windowInfo, setWindowInfo] = useState<WindowInfo>({
    canMessage: true,
    hoursRemaining: null,
    expiresAt: null,
  });
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);

  const [showAttachment, setShowAttachment] = useState(false);
  const [actionTarget, setActionTarget] = useState<WaMessage | null>(null);
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const searchReqRef = useRef(0);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocused = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const errorShown = useRef(false);
  const api = useRef(withAuth(getToken)).current;

  // Build a wamid -> message map so reply chips can render quickly.
  const wamidIndex = useMemo(() => {
    const map = new Map<string, WaMessage>();
    for (const m of messages) {
      if (m.messageSid) map.set(m.messageSid, m);
    }
    return map;
  }, [messages]);

  const idIndex = useMemo(() => {
    const map = new Map<string, WaMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  // Merge pending outbox entries into the rendered list as optimistic
  // bubbles. They render with status="sending|failed" until the server
  // confirms — at which point the server fetch replaces them.
  const displayMessages = useMemo<WaMessage[]>(() => {
    if (outboxEntries.length === 0) return messages;
    const synthesized: WaMessage[] = outboxEntries.map((e) => {
      const p = e.payload;
      const mediaPayload: Record<string, unknown> | undefined =
        p.mediaUrl && p.mediaType
          ? {
              [p.mediaType]: {
                link: p.mediaUrl,
                caption: p.caption ?? undefined,
                filename: p.filename ?? undefined,
              },
            }
          : undefined;
      return {
        id: `out-${e.clientId}`,
        from: null,
        to: null,
        message: p.message ?? p.caption ?? null,
        direction: "outbound",
        status: e.status === "failed" ? "failed" : "pending",
        createdAt: new Date(e.createdAt).toISOString(),
        messageSid: null,
        metadata: { outboxClientId: e.clientId },
        payload: mediaPayload ?? null,
      };
    });
    return [...messages, ...synthesized];
  }, [messages, outboxEntries]);

  const refreshOutbox = useCallback(async () => {
    const entries = await whatsappOutbox.list(phone);
    setOutboxEntries(entries);
  }, [phone]);

  const flushOutbox = useCallback(async () => {
    await whatsappOutbox.flush({ phone, getToken });
    await refreshOutbox();
  }, [getToken, phone, refreshOutbox]);

  const markConversationRead = useCallback(async () => {
    try {
      await api("/api/mobile/whatsapp/conversations/read", {
        method: "POST",
        body: { phone },
      });
    } catch (error) {
      console.warn("Failed to mark conversation read", error);
    }
  }, [api, phone]);

  const fetchMessages = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        const data = await api<MessagesResponse>(
          `/api/mobile/whatsapp/messages?phone=${encodeURIComponent(phone)}&limit=${MESSAGE_LIMIT}`,
        );
        const msgs = data.messages ?? [];
        setMessages(msgs);
        setWindowInfo(
          data.window ?? { canMessage: true, hoursRemaining: null, expiresAt: null },
        );
        if (data.customer) setCustomer(data.customer);
        errorShown.current = false;
        // Persist for offline reads next time the screen mounts.
        void whatsappCache.upsertMessages(phone, msgs);
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

  // Hydrate from SQLite immediately so the screen has content while we fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await whatsappCache.loadMessages(phone, MESSAGE_LIMIT);
      if (!cancelled && cached.length > 0) {
        setMessages(cached);
        setLoading(false);
      }
      const entries = await whatsappOutbox.list(phone);
      if (!cancelled) setOutboxEntries(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [phone]);

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

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      // Reading the thread clears the global WhatsApp unread badge — push
      // notifications increment it, opening any thread is the correct
      // signal that admin is up to date.
      clearWhatsAppUnread();
      void markConversationRead();
      fetchMessages();
      void flushOutbox();
      startPolling(POLL_ACTIVE_MS);
      return () => {
        isFocused.current = false;
        stopPolling();
      };
    }, [
      clearWhatsAppUnread,
      markConversationRead,
      fetchMessages,
      flushOutbox,
      startPolling,
      stopPolling,
    ]),
  );

  // Header config: contact title + info button + search button.
  useEffect(() => {
    const title =
      customer?.fullName ||
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
      phone;
    navigation.setOptions({
      headerTitle: title,
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setSearchOpen(true)}
            style={styles.headerBtn}
            accessibilityLabel="Search messages"
            testID="wa-header-search"
          >
            <Ionicons name="search" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/whatsapp/contact/${encodeURIComponent(phone)}`)}
            style={styles.headerBtn}
            accessibilityLabel="Contact info"
            testID="wa-header-info"
          >
            <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [customer, navigation, phone, router]);

  // Search debounce.
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const reqId = ++searchReqRef.current;
    const handle = setTimeout(async () => {
      try {
        const data = await api<{ items: WaMessage[] }>(
          `/api/mobile/whatsapp/messages/search?phone=${encodeURIComponent(phone)}&q=${encodeURIComponent(trimmed)}`,
        );
        if (reqId !== searchReqRef.current) return;
        setSearchResults(
          (data.items ?? []).map((m) => ({
            id: m.id,
            message: m.message,
            createdAt: m.createdAt,
            direction: m.direction,
          })),
        );
      } catch {
        if (reqId === searchReqRef.current) setSearchResults([]);
      } finally {
        if (reqId === searchReqRef.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchOpen, searchQuery, api, phone]);

  function jumpToMessage(messageId: string) {
    setSearchOpen(false);
    const idx = displayMessages.findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }

  async function enqueueAndFlush(payload: OutboxPayload) {
    const entry = await whatsappOutbox.enqueue(phone, payload);
    setOutboxEntries((prev) => [...prev, entry]);
    setSending(true);
    try {
      await flushOutbox();
      // After server confirms, refetch so the canonical message replaces the
      // optimistic outbox bubble.
      fetchMessages({ silent: true });
    } finally {
      setSending(false);
    }
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    const replyWamid = replyTo?.messageSid ?? null;
    setReplyTo(null);
    await enqueueAndFlush({
      type: "text",
      message: trimmed,
      replyToWamid: replyWamid,
    });
  }

  function openTemplates() {
    router.push(
      `/whatsapp/templates?phone=${encodeURIComponent(phone)}&return=chat`,
    );
  }

  async function pickAndSendImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to share images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAndSend({
      uri: result.assets[0].uri,
      kind: "image",
      fileName: result.assets[0].fileName ?? undefined,
    });
  }

  async function takePhotoAndSend() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow camera access to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadAndSend({
      uri: result.assets[0].uri,
      kind: "image",
      fileName: result.assets[0].fileName ?? undefined,
    });
  }

  async function pickFileAndSend() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const isImage = asset.mimeType?.startsWith("image/") ?? false;
    const isVideo = asset.mimeType?.startsWith("video/") ?? false;
    const isAudio = asset.mimeType?.startsWith("audio/") ?? false;
    const kind: WhatsAppUploadKind = isImage
      ? "image"
      : isVideo
        ? "video"
        : isAudio
          ? "audio"
          : "document";
    await uploadAndSend({
      uri: asset.uri,
      kind,
      fileName: asset.name,
      contentType: asset.mimeType ?? undefined,
    });
  }

  async function uploadAndSend(opts: {
    uri: string;
    kind: WhatsAppUploadKind;
    fileName?: string;
    contentType?: string;
  }) {
    setUploading(true);
    const replyWamid = replyTo?.messageSid ?? null;
    setReplyTo(null);
    try {
      // Upload happens online — retries don't make sense for the upload step
      // because the local file URI may already be gone. The send step is
      // queued through the outbox so it survives a flaky network.
      const result = await uploadWhatsAppMedia({
        uri: opts.uri,
        kind: opts.kind,
        fileName: opts.fileName,
        contentType: opts.contentType,
        getToken,
      });
      await enqueueAndFlush({
        type: opts.kind,
        mediaUrl: result.url,
        mediaType: opts.kind,
        filename: result.filename,
        replyToWamid: replyWamid,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not send media.";
      Alert.alert("Send failed", message);
    } finally {
      setUploading(false);
    }
  }

  function onAttachmentPick(kind: AttachmentKind) {
    if (!windowInfo.canMessage) {
      Alert.alert("24-hour window closed", "Send a template first to reopen the conversation.");
      return;
    }
    if (kind === "camera") void takePhotoAndSend();
    else if (kind === "photo") void pickAndSendImage();
    else if (kind === "file") void pickFileAndSend();
    else Alert.alert("Not supported", "Locations aren't supported for WhatsApp yet.");
  }

  function onMessageLongPress(msg: WaMessage) {
    setActionTarget(msg);
  }

  async function onMessageAction(action: MessageAction) {
    const target = actionTarget;
    setActionTarget(null);
    if (!target) return;
    if (action === "reply") {
      setReplyTo(target);
    } else if (action === "copy") {
      const content = target.message ?? previewText(target);
      await Clipboard.setStringAsync(content);
    } else if (action === "delete") {
      Alert.alert("Delete locally", "Hide this message from your inbox? The recipient will still see it.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/mobile/whatsapp/messages/${target.id}`, {
                method: "DELETE",
              });
              fetchMessages({ silent: true });
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : "Could not delete.";
              Alert.alert("Delete failed", message);
            }
          },
        },
      ]);
    }
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
        data={displayMessages}
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
        renderItem={({ item }) => {
          const replyWamid = readContextWamid(item);
          const original = replyWamid ? wamidIndex.get(replyWamid) : null;
          const replyPreview: ReplyTargetPreview | null = original
            ? {
                id: original.id,
                text: previewText(original),
                isMine: original.direction === "outbound",
                authorName:
                  customer?.fullName ||
                  [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
                  "Contact",
              }
            : null;
          return (
            <MessageBubble
              msg={item}
              replyTo={replyPreview}
              onLongPress={() => onMessageLongPress(item)}
              onPressReplyTo={
                original
                  ? () => {
                      const idx = displayMessages.findIndex((m) => m.id === original.id);
                      if (idx >= 0) {
                        flatListRef.current?.scrollToIndex({
                          index: idx,
                          animated: true,
                          viewPosition: 0.5,
                        });
                      }
                    }
                  : undefined
              }
            />
          );
        }}
        onScrollToIndexFailed={(info) => {
          // FlatList sometimes can't measure rows yet; retry once.
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.5,
            });
          }, 100);
        }}
      />

      {!windowOpen && (
        <View style={styles.windowWarning} testID="wa-window-warning">
          <Ionicons name="time-outline" size={14} color="#856404" />
          <Text style={styles.windowWarningText}>
            24-hour window closed. Use a template to restart the conversation.
          </Text>
        </View>
      )}

      {replyTo && (
        <ReplyPreview
          senderName={
            replyTo.direction === "outbound"
              ? "yourself"
              : customer?.fullName || customer?.firstName || "contact"
          }
          preview={previewText(replyTo)}
          onCancel={() => setReplyTo(null)}
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={openTemplates}
          accessibilityLabel="Open template picker"
          testID="wa-open-templates"
        >
          <Ionicons name="list-outline" size={22} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowAttachment(true)}
          disabled={uploading || !windowOpen}
          accessibilityLabel="Send attachment"
          testID="wa-attach-btn"
        >
          {uploading ? (
            <ActivityIndicator color={Colors.textTertiary} size="small" />
          ) : (
            <Ionicons
              name="attach"
              size={22}
              color={windowOpen ? Colors.textTertiary : "#cbd5e1"}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            router.push(
              `/whatsapp/catalog?phone=${encodeURIComponent(phone)}&return=chat`,
            )
          }
          disabled={!windowOpen}
          accessibilityLabel="Send a tour package"
          testID="wa-catalog-btn"
        >
          <Ionicons
            name="bag-handle-outline"
            size={22}
            color={windowOpen ? Colors.textTertiary : "#cbd5e1"}
          />
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

      <AttachmentSheet
        visible={showAttachment}
        onClose={() => setShowAttachment(false)}
        onPick={onAttachmentPick}
      />

      <MessageActions
        visible={actionTarget !== null}
        onClose={() => setActionTarget(null)}
        onAction={onMessageAction}
        canEdit={false}
        canDelete={!!actionTarget}
        canModerate={false}
        isPinned={false}
        isImportant={false}
        hasContent={!!actionTarget?.message}
      />

      <Modal
        visible={searchOpen}
        animationType="slide"
        onRequestClose={() => setSearchOpen(false)}
      >
        <SafeAreaView style={styles.searchModal} edges={["top"]}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              onPress={() => setSearchOpen(false)}
              hitSlop={10}
              accessibilityLabel="Close search"
              testID="wa-search-close"
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages…"
                placeholderTextColor={Colors.textTertiary}
                autoFocus
                returnKeyType="search"
                testID="wa-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {searching ? (
            <View style={styles.searchEmpty}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : searchQuery.trim().length < 2 ? (
            <View style={styles.searchEmpty}>
              <Text style={styles.emptyText}>Type at least 2 characters.</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Text style={styles.emptyText}>No matches.</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => {
                const inThread = idIndex.has(item.id);
                return (
                  <TouchableOpacity
                    style={styles.searchRow}
                    onPress={() => inThread && jumpToMessage(item.id)}
                    disabled={!inThread}
                    accessibilityRole="button"
                    accessibilityLabel="Open message"
                    testID={`wa-search-result-${item.id}`}
                  >
                    <Text style={styles.searchMeta}>
                      {item.direction === "outbound" ? "You" : "Contact"} ·{" "}
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {!inThread ? " · open older to view" : ""}
                    </Text>
                    <Text style={styles.searchText} numberOfLines={2}>
                      {item.message ?? "Media"}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
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
  iconBtn: {
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
  headerActions: { flexDirection: "row", gap: 4, paddingRight: 6 },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  searchModal: { flex: 1, backgroundColor: Colors.background },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  searchEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  searchMeta: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  searchText: { fontSize: 14, color: Colors.text, marginTop: 4 },
});
