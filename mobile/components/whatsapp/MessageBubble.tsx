import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const WA_SENT_BG = "#DCF8C6";
const WA_RECV_BG = "#FFFFFF";

export interface WaMessage {
  id: string;
  from: string | null;
  to: string | null;
  message: string | null;
  direction: "inbound" | "outbound";
  status: string | null;
  createdAt: string;
  messageSid?: string | null;
  metadata?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  whatsappCustomer?: { firstName: string | null; lastName: string | null } | null;
}

export interface ReplyTargetPreview {
  id: string;
  text: string;
  isMine: boolean;
  authorName: string;
}

interface Props {
  msg: WaMessage;
  replyTo?: ReplyTargetPreview | null;
  onLongPress?: () => void;
  onPressReplyTo?: () => void;
}

interface ResolvedMedia {
  kind: "image" | "video" | "audio" | "document";
  link: string | null;
  caption: string | null;
  filename: string | null;
}

function readPayloadString(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const v = (payload as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

function resolveMedia(msg: WaMessage): ResolvedMedia | null {
  const payload = msg.payload as Record<string, unknown> | null | undefined;
  if (!payload) return null;
  for (const kind of ["image", "video", "audio", "document"] as const) {
    const block = payload[kind];
    if (block && typeof block === "object") {
      const link = readPayloadString(block, "link") ?? null;
      const caption = readPayloadString(block, "caption") ?? null;
      const filename = readPayloadString(block, "filename") ?? null;
      return { kind, link, caption, filename };
    }
  }
  return null;
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
  if (status === "failed") return <Ionicons name="alert-circle" size={11} color="#dc2626" />;
  return <Text style={styles.tick}>✓</Text>;
}

function ImagePreview({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageUrl = url.trim();
  if (!imageUrl) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open photo"
      >
        <View style={styles.imageThumb}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            onLoad={() => setLoaded(true)}
            resizeMode="cover"
          />
          {!loaded && (
            <View style={styles.imageSpinner}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setOpen(false)}>
          <Image source={{ uri: imageUrl }} style={styles.lightboxImage} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

function FileChip({
  url,
  filename,
  kind,
}: {
  url: string | null;
  filename: string | null;
  kind: ResolvedMedia["kind"];
}) {
  const label = filename ?? (kind === "document" ? "Document" : kind);
  return (
    <TouchableOpacity
      style={styles.fileChip}
      onPress={() => url && Linking.openURL(url)}
      disabled={!url}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label}`}
    >
      <Ionicons
        name={
          kind === "video"
            ? "videocam-outline"
            : kind === "audio"
              ? "musical-note-outline"
              : "document-attach-outline"
        }
        size={22}
        color="#075E54"
      />
      <Text style={styles.fileLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function MessageBubble({ msg, replyTo, onLongPress, onPressReplyTo }: Props) {
  const isSent = msg.direction === "outbound";
  const isDeleted = msg.status === "deleted";
  const media = isDeleted ? null : resolveMedia(msg);
  const hasText = !!msg.message && !isDeleted;
  const text = isDeleted
    ? "🚫 Message deleted"
    : msg.message ?? media?.caption ?? "";

  return (
    <View style={[styles.bubbleRow, isSent ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={onLongPress}
        delayLongPress={250}
        accessibilityLabel={`Message from ${isSent ? "you" : "contact"}`}
        testID={`wa-msg-${msg.id}`}
        style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleRecv]}
      >
        {replyTo ? (
          <TouchableOpacity
            style={styles.replyChip}
            onPress={onPressReplyTo}
            disabled={!onPressReplyTo}
          >
            <View style={styles.replyBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyAuthor} numberOfLines={1}>
                {replyTo.isMine ? "You" : replyTo.authorName}
              </Text>
              <Text style={styles.replyText} numberOfLines={2}>
                {replyTo.text || "Media"}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {media?.kind === "image" && media.link ? (
          <ImagePreview url={media.link} />
        ) : media ? (
          <FileChip url={media.link} filename={media.filename} kind={media.kind} />
        ) : null}

        {(hasText || isDeleted) && (
          <Text
            style={[
              styles.bubbleText,
              isDeleted && styles.bubbleTextDeleted,
              media ? styles.bubbleTextWithMedia : null,
            ]}
          >
            {text}
          </Text>
        )}

        <View style={styles.bubbleMeta}>
          <Text style={styles.bubbleTime}>{formatTime(msg.createdAt)}</Text>
          {isSent && !isDeleted && <DeliveryTick status={msg.status} />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row", marginVertical: 1 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "82%",
    minWidth: 80,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  bubbleSent: { backgroundColor: WA_SENT_BG, borderTopRightRadius: 2 },
  bubbleRecv: { backgroundColor: WA_RECV_BG, borderTopLeftRadius: 2 },
  bubbleText: {
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  bubbleTextDeleted: { fontStyle: "italic", color: "#6b7280" },
  bubbleTextWithMedia: { marginTop: 6 },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  bubbleTime: { fontSize: 11, color: "#667781" },
  tick: { fontSize: 11, color: "#667781" },
  tickBlue: { fontSize: 11, color: "#53BDEB" },
  replyChip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 6,
    paddingVertical: 6,
    paddingRight: 8,
    marginBottom: 4,
    gap: 8,
    overflow: "hidden",
  },
  replyBar: {
    width: 3,
    backgroundColor: "#075E54",
    alignSelf: "stretch",
  },
  replyAuthor: { fontSize: 12, fontWeight: "700", color: "#075E54" },
  replyText: { fontSize: 13, color: "#374151", marginTop: 1 },
  imageThumb: {
    width: 220,
    height: 220,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  image: { width: "100%", height: "100%" },
  imageSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: { width: "100%", height: "85%" },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 180,
  },
  fileLabel: { flex: 1, fontSize: 14, color: "#1A1A1A" },
});
