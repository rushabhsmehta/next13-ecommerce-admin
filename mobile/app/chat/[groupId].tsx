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
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
import { MessageActions, type MessageAction } from "@/components/chat/MessageActions";
import { ReplyPreview } from "@/components/chat/ReplyPreview";
import { SearchSheet } from "@/components/chat/SearchSheet";
import { editMessage, deleteMessage, markMessagesRead } from "@/lib/chat/api";
import * as Clipboard from "expo-clipboard";

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

function previewForReply(rt: NonNullable<DisplayMessage["replyTo"]>): string {
  if (rt.isDeleted) return "Message deleted";
  if (rt.messageType === "TEXT") return rt.content ?? "";
  switch (rt.messageType) {
    case "IMAGE": return "📷 Photo";
    case "PDF": return "📄 PDF";
    case "FILE": return "📎 File";
    case "LOCATION": return "📍 Location";
    default: return rt.messageType;
  }
}

function MessageBubble({
  msg,
  isMine,
  showSender,
  onRetry,
  onLongPress,
  onJumpToReply,
}: {
  msg: DisplayMessage;
  isMine: boolean;
  showSender: boolean;
  onRetry?: (clientId: string) => void;
  onLongPress?: (msg: DisplayMessage) => void;
  onJumpToReply?: (messageId: string) => void;
}) {
  const failed = msg.outboxStatus === "failed";
  const sending = msg.outboxStatus === "pending" || msg.outboxStatus === "sending";
  const isDeleted = msg.isDeleted === true;
  const isEdited = !!msg.editedAt && !isDeleted;
  const seenByOthers = (msg.readsCount ?? 0) > 0;

  // Soft-deleted messages render an inert placeholder bubble — no actions.
  if (isDeleted) {
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMine && <View style={styles.senderAvatar} />}
        <View style={styles.bubbleWrap}>
          <View style={[styles.bubble, styles.bubbleDeleted]}>
            <Text style={styles.bubbleDeletedText}>
              <Ionicons name="ban-outline" size={12} color={Colors.textTertiary} /> Message deleted
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, styles.bubbleTimeOther]}>
                {formatTime(msg.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

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

  const reply = msg.replyTo ?? null;

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
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => onLongPress?.(msg)}
          delayLongPress={300}
          accessibilityHint="Long-press for message actions"
        >
          <View style={innerStyle}>
            {reply && (
              <TouchableOpacity
                onPress={() => onJumpToReply?.(reply.id)}
                style={[
                  styles.replyChip,
                  usesPlainBubble && isMine ? styles.replyChipMine : styles.replyChipOther,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Jump to replied message"
              >
                <Text
                  style={[
                    styles.replyChipName,
                    usesPlainBubble && isMine ? styles.replyChipNameMine : styles.replyChipNameOther,
                  ]}
                  numberOfLines={1}
                >
                  {reply.sender?.name ?? "Unknown"}
                </Text>
                <Text
                  style={[
                    styles.replyChipPreview,
                    usesPlainBubble && isMine ? styles.replyChipPreviewMine : styles.replyChipPreviewOther,
                  ]}
                  numberOfLines={1}
                >
                  {previewForReply(reply)}
                </Text>
              </TouchableOpacity>
            )}
            {body}
            <View style={styles.bubbleMeta}>
              {isEdited && (
                <Text
                  style={[
                    styles.bubbleEdited,
                    usesPlainBubble && isMine ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                  ]}
                >
                  edited
                </Text>
              )}
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
              {!sending && !failed && isMine && !msg.outboxStatus && (
                <Ionicons
                  name={seenByOthers ? "checkmark-done" : "checkmark"}
                  size={13}
                  color={
                    seenByOthers
                      ? "#7DD3FC"
                      : usesPlainBubble
                      ? "rgba(255,255,255,0.7)"
                      : Colors.textTertiary
                  }
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
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
      replyToId: o.payload.replyToId ?? null,
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
  const router = useRouter();
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
  const [replyTarget, setReplyTarget] = useState<DisplayMessage | null>(null);
  const [editTarget, setEditTarget] = useState<DisplayMessage | null>(null);
  const [actionsTarget, setActionsTarget] = useState<DisplayMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isFocusedRef = useRef(true);
  const lastSeenIdRef = useRef<string | null>(null);
  const markedReadIdsRef = useRef<Set<string>>(new Set());

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
        setHasMoreOlder(!!data.hasMore);
        setOldestCursor(typeof data.nextCursor === "string" ? data.nextCursor : null);
        setServerMessages((prev) => {
          // Merge: keep older messages already loaded (page-up history) and replace
          // the recent window with the freshly fetched 50.
          const recentIds = new Set(msgs.map((m) => m.id));
          const olderRetained = prev.filter((m) => !recentIds.has(m.id));
          // Only retain the older portion (those whose createdAt is older than the
          // earliest in `msgs`). Otherwise we'd duplicate edits.
          const oldestNew = msgs[0]?.createdAt ? new Date(msgs[0].createdAt).getTime() : Infinity;
          const truly_older = olderRetained.filter(
            (m) => new Date(m.createdAt).getTime() < oldestNew
          );
          return [...truly_older, ...msgs];
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

  const loadEarlier = useCallback(async () => {
    if (!groupId || !hasMoreOlder || loadingOlder) return;
    const cursor = oldestCursor;
    if (!cursor) return;
    setLoadingOlder(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/chat/groups/${groupId}/messages?limit=50&cursor=${encodeURIComponent(cursor)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const older: Message[] = data.messages ?? [];
      if (older.length === 0) {
        setHasMoreOlder(false);
        return;
      }
      setServerMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const newOnes = older.filter((m) => !seen.has(m.id));
        return [...newOnes, ...prev];
      });
      await chatCache.upsertMessages(groupId, older);
      setOldestCursor(typeof data.nextCursor === "string" ? data.nextCursor : null);
      setHasMoreOlder(!!data.hasMore);
    } catch {
      // ignore — user can retry by scrolling again
    } finally {
      setLoadingOlder(false);
    }
  }, [groupId, hasMoreOlder, loadingOlder, oldestCursor, getToken]);

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
              <TouchableOpacity
                onPress={() => setSearchOpen(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Search messages"
              >
                <Ionicons name="search" size={20} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => groupId && router.push(`/chat-settings/${groupId}`)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Group settings"
              >
                <Ionicons name="settings-outline" size={20} color={Colors.text} />
              </TouchableOpacity>
              <View style={styles.headerMembers}>
                <Ionicons name="people-outline" size={18} color={Colors.textTertiary} />
                <Text style={styles.headerMemberCount}>{members.length}</Text>
              </View>
            </View>
          ),
        });
      }
    } catch {}
  }, [getToken, groupId, navigation, router]);

  // Mark messages as read when they become visible. We only mark messages from
  // other users that we haven't already reported as read this session.
  const flushReadReceipts = useCallback(
    async (visibleIds: string[]) => {
      if (!groupId) return;
      const myId = travelUser?.id;
      if (!myId) return;
      const toMark: string[] = [];
      for (const id of visibleIds) {
        if (markedReadIdsRef.current.has(id)) continue;
        const msg = serverMessages.find((m) => m.id === id);
        if (!msg || msg.senderId === myId || msg.isDeleted) continue;
        markedReadIdsRef.current.add(id);
        toMark.push(id);
      }
      if (toMark.length === 0) return;
      try {
        await markMessagesRead({ groupId, messageIds: toMark, getToken });
      } catch {
        // Best-effort; remove from set so we can retry on next viewability event.
        toMark.forEach((id) => markedReadIdsRef.current.delete(id));
      }
    },
    [groupId, travelUser?.id, serverMessages, getToken]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: DisplayMessage }> }) => {
      const ids = viewableItems.map((v) => v.item.id);
      // We can't reference flushReadReceipts from inside here directly because
      // FlatList caches the callback ref. Use a tiny event-ish indirection.
      readReceiptCallbackRef.current?.(ids);
    }
  ).current;
  const readReceiptCallbackRef = useRef<((ids: string[]) => void) | null>(null);
  useEffect(() => {
    readReceiptCallbackRef.current = (ids) => {
      void flushReadReceipts(ids);
    };
  }, [flushReadReceipts]);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 800,
  }).current;

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

    // Editing path: PATCH instead of enqueue.
    if (editTarget) {
      const editing = editTarget;
      setText("");
      setEditTarget(null);
      Keyboard.dismiss();
      try {
        await editMessage({
          groupId,
          messageId: editing.id,
          content: trimmed,
          getToken,
        });
        await fetchMessages();
      } catch (err: any) {
        Alert.alert("Edit failed", err?.message ?? "Could not save edit.");
        // Restore so the user can retry
        setEditTarget(editing);
        setText(trimmed);
      }
      return;
    }

    setText("");
    const replyId = replyTarget?.id ?? null;
    setReplyTarget(null);
    Keyboard.dismiss();

    // Enqueue first so a force-quit doesn't lose the message
    await chatOutbox.enqueue(groupId, {
      messageType: "TEXT",
      content: trimmed,
      replyToId: replyId,
    });
    await refreshOutbox();
    void flushOutbox();
  }

  async function retrySend(clientId: string) {
    await chatOutbox.retry(clientId);
    await refreshOutbox();
    void flushOutbox();
  }

  function openMessageActions(msg: DisplayMessage) {
    if (msg.outboxStatus) return; // can't act on pending/failed bubbles
    if (msg.isDeleted) return;
    setActionsTarget(msg);
  }

  async function handleAction(action: MessageAction) {
    const msg = actionsTarget;
    setActionsTarget(null);
    if (!msg || !groupId) return;
    switch (action) {
      case "reply":
        setReplyTarget(msg);
        setEditTarget(null);
        break;
      case "copy":
        if (msg.content) {
          try {
            await Clipboard.setStringAsync(msg.content);
          } catch {
            // ignore
          }
        }
        break;
      case "edit":
        setEditTarget(msg);
        setReplyTarget(null);
        setText(msg.content ?? "");
        break;
      case "delete":
        Alert.alert(
          "Delete message?",
          "This message will be removed for everyone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteMessage({ groupId, messageId: msg.id, getToken });
                  // Optimistic local update so the deleted state shows immediately
                  setServerMessages((prev) =>
                    prev.map((m) =>
                      m.id === msg.id
                        ? { ...m, isDeleted: true, deletedAt: new Date().toISOString() }
                        : m
                    )
                  );
                  await fetchMessages();
                } catch (err: any) {
                  Alert.alert("Delete failed", err?.message ?? "Could not delete.");
                }
              },
            },
          ]
        );
        break;
    }
  }

  function jumpToMessage(messageId: string) {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
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
        onScroll={(e) => {
          // Top of the list (oldest) → trigger load-earlier. Threshold of ~80px.
          if (e.nativeEvent.contentOffset.y < 80 && hasMoreOlder && !loadingOlder) {
            void loadEarlier();
          }
        }}
        scrollEventThrottle={400}
        ListHeaderComponent={
          loadingOlder ? (
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
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
              onLongPress={openMessageActions}
              onJumpToReply={jumpToMessage}
            />
          );
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={20}
      />

      <View>
        {replyTarget && (
          <ReplyPreview
            senderName={replyTarget.sender?.name ?? "Unknown"}
            preview={
              replyTarget.messageType === "TEXT"
                ? replyTarget.content ?? ""
                : previewForReply({
                    id: replyTarget.id,
                    content: replyTarget.content ?? null,
                    messageType: replyTarget.messageType,
                    isDeleted: false,
                    sender: replyTarget.sender
                      ? { id: replyTarget.sender.id, name: replyTarget.sender.name }
                      : null,
                  })
            }
            onCancel={() => setReplyTarget(null)}
          />
        )}
        {editTarget && (
          <View style={styles.editIndicator}>
            <View style={styles.editBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.editTitle}>Editing message</Text>
              <Text style={styles.editPreview} numberOfLines={1}>
                {editTarget.content ?? ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditTarget(null);
                setText("");
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
            >
              <Ionicons name="close" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setAttachmentSheetOpen(true)}
            disabled={uploading || !!editTarget}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name="attach"
                size={22}
                color={editTarget ? Colors.textTertiary : Colors.primary}
              />
            )}
          </TouchableOpacity>
          <TextInput
            testID="chat-composer-input"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={editTarget ? "Edit message…" : "Type a message…"}
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={2000}
            returnKeyType="default"
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here"
          />
          <TouchableOpacity
            testID="chat-send-button"
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel={editTarget ? "Save edit" : "Send message"}
          >
            <Ionicons name={editTarget ? "checkmark" : "send"} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <AttachmentSheet
        visible={attachmentSheetOpen}
        onClose={() => setAttachmentSheetOpen(false)}
        onPick={handleAttachmentPick}
      />

      <MessageActions
        visible={actionsTarget !== null}
        onClose={() => setActionsTarget(null)}
        onAction={handleAction}
        canEdit={
          !!actionsTarget &&
          actionsTarget.senderId === myId &&
          actionsTarget.messageType === "TEXT" &&
          !actionsTarget.isDeleted
        }
        canDelete={!!actionsTarget && actionsTarget.senderId === myId && !actionsTarget.isDeleted}
        hasContent={
          !!actionsTarget && actionsTarget.messageType === "TEXT" && !!actionsTarget.content
        }
      />

      <SearchSheet
        visible={searchOpen}
        groupId={groupId}
        onClose={() => setSearchOpen(false)}
        onSelect={(messageId) => {
          setSearchOpen(false);
          setTimeout(() => jumpToMessage(messageId), 250);
        }}
        getToken={getToken}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: Colors.textTertiary, fontSize: 14 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14, marginRight: 12 },
  headerMembers: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerMemberCount: { fontSize: 13, color: Colors.textTertiary },
  loadingHeader: { paddingVertical: 12, alignItems: "center" },
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
  bubbleDeleted: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleDeletedText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  replyChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyChipMine: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderLeftColor: "#fff",
  },
  replyChipOther: {
    backgroundColor: "#F1F5F9",
    borderLeftColor: Colors.primary,
  },
  replyChipName: { fontSize: 11, fontWeight: "700" },
  replyChipNameMine: { color: "#fff" },
  replyChipNameOther: { color: Colors.primary },
  replyChipPreview: { fontSize: 12, marginTop: 2 },
  replyChipPreviewMine: { color: "rgba(255,255,255,0.85)" },
  replyChipPreviewOther: { color: Colors.text },
  bubbleEdited: { fontSize: 10, fontStyle: "italic", marginRight: 2 },
  editIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: "#FEF3C7",
  },
  editBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: "#D97706",
  },
  editTitle: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  editPreview: { fontSize: 13, color: Colors.text, marginTop: 2 },
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
