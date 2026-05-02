import { View, Text, StyleSheet, Image, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { WaMessage } from "@/lib/whatsapp-api";

interface Props {
  message: WaMessage;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read") {
    return <Ionicons name="checkmark-done" size={12} color="#53bdeb" />;
  }
  if (status === "delivered") {
    return <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />;
  }
  if (status === "sent") {
    return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />;
  }
  return <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />;
}

function BubbleFooter({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  return (
    <View style={styles.footer}>
      <Text style={[styles.footerTime, isOwn && styles.footerTimeOwn]}>
        {formatTime(message.createdAt)}
      </Text>
      {isOwn && <StatusIcon status={message.status} />}
    </View>
  );
}

function TextBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  return (
    <View>
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
        {message.message || ""}
      </Text>
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function ImageBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  const meta = message.metadata as Record<string, any> | null;
  const caption = meta?.media?.caption || meta?.textPreview;
  const mediaId = meta?.media?.id;

  return (
    <View>
      <View style={styles.imagePlaceholder}>
        <Ionicons name="image-outline" size={32} color={isOwn ? "rgba(255,255,255,0.7)" : Colors.textTertiary} />
        {mediaId && (
          <Text style={[styles.mediaIdText, isOwn && styles.mediaIdTextOwn]}>
            Image
          </Text>
        )}
      </View>
      {caption ? (
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn, { marginTop: 4 }]}>
          {caption}
        </Text>
      ) : null}
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function VideoBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  const meta = message.metadata as Record<string, any> | null;
  const caption = meta?.media?.caption;

  return (
    <View>
      <View style={styles.imagePlaceholder}>
        <Ionicons name="videocam-outline" size={32} color={isOwn ? "rgba(255,255,255,0.7)" : Colors.textTertiary} />
        <Text style={[styles.mediaIdText, isOwn && styles.mediaIdTextOwn]}>Video</Text>
      </View>
      {caption ? (
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn, { marginTop: 4 }]}>
          {caption}
        </Text>
      ) : null}
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function AudioBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  return (
    <View>
      <View style={styles.audioRow}>
        <View style={[styles.audioPlayBtn, isOwn && styles.audioPlayBtnOwn]}>
          <Ionicons name="play" size={16} color={isOwn ? Colors.primary : "#fff"} />
        </View>
        <View style={styles.audioWave}>
          {Array.from({ length: 16 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.audioBar,
                isOwn && styles.audioBarOwn,
                { height: 4 + Math.random() * 14 },
              ]}
            />
          ))}
        </View>
      </View>
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function DocumentBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  const meta = message.metadata as Record<string, any> | null;
  const filename = meta?.media?.filename || message.message || "Document";

  return (
    <View>
      <View style={styles.docRow}>
        <View style={[styles.docIcon, isOwn && styles.docIconOwn]}>
          <Ionicons name="document-text" size={24} color={isOwn ? Colors.primary : "#25D366"} />
        </View>
        <Text style={[styles.docName, isOwn && styles.docNameOwn]} numberOfLines={2}>
          {filename}
        </Text>
      </View>
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function LocationBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  const meta = message.metadata as Record<string, any> | null;
  const lat = meta?.location?.latitude;
  const lng = meta?.location?.longitude;
  const name = meta?.location?.name;

  const openMap = () => {
    if (lat && lng) {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    }
  };

  return (
    <Pressable onPress={openMap}>
      <View style={styles.locationRow}>
        <Ionicons name="location" size={20} color={isOwn ? "rgba(255,255,255,0.9)" : "#e8612d"} />
        <Text style={[styles.locationText, isOwn && styles.locationTextOwn]}>
          {name || "Location shared"}
        </Text>
        <Ionicons name="open-outline" size={14} color={isOwn ? "rgba(255,255,255,0.6)" : Colors.textTertiary} />
      </View>
      <BubbleFooter message={message} isOwn={isOwn} />
    </Pressable>
  );
}

function ReactionBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  const meta = message.metadata as Record<string, any> | null;
  const emoji = meta?.reaction?.emoji || "👍";

  return (
    <View>
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

function TemplateBubble({ message, isOwn }: { message: WaMessage; isOwn: boolean }) {
  return (
    <View>
      <View style={[styles.templateLabel, isOwn && styles.templateLabelOwn]}>
        <Ionicons name="mail-outline" size={12} color={isOwn ? "rgba(255,255,255,0.7)" : Colors.textTertiary} />
        <Text style={[styles.templateLabelText, isOwn && styles.templateLabelTextOwn]}>Template</Text>
      </View>
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
        {message.message || "Template message"}
      </Text>
      <BubbleFooter message={message} isOwn={isOwn} />
    </View>
  );
}

export function MessageBubble({ message }: Props) {
  const isOwn = message.direction === "outbound";
  const meta = message.metadata as Record<string, any> | null;
  const msgType = meta?.whatsappType || "text";

  let content: React.ReactNode;
  switch (msgType) {
    case "image":
      content = <ImageBubble message={message} isOwn={isOwn} />;
      break;
    case "video":
      content = <VideoBubble message={message} isOwn={isOwn} />;
      break;
    case "audio":
    case "voice":
      content = <AudioBubble message={message} isOwn={isOwn} />;
      break;
    case "document":
      content = <DocumentBubble message={message} isOwn={isOwn} />;
      break;
    case "location":
      content = <LocationBubble message={message} isOwn={isOwn} />;
      break;
    case "reaction":
      content = <ReactionBubble message={message} isOwn={isOwn} />;
      break;
    case "template":
      content = <TemplateBubble message={message} isOwn={isOwn} />;
      break;
    default:
      content = <TextBubble message={message} isOwn={isOwn} />;
  }

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
    maxWidth: "80%",
  },
  wrapperOwn: { alignSelf: "flex-end" },
  wrapperOther: { alignSelf: "flex-start" },

  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 60,
  },
  bubbleOwn: {
    backgroundColor: "#d9fdd3",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  bubbleText: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  bubbleTextOwn: { color: "#0d1117" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 2,
  },
  footerTime: {
    fontSize: FontSize.xs - 1,
    color: Colors.textTertiary,
  },
  footerTimeOwn: { color: "rgba(0,0,0,0.45)" },

  // Image / Video
  imagePlaceholder: {
    width: 180,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mediaIdText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  mediaIdTextOwn: { color: "rgba(0,0,0,0.4)" },

  // Audio
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 160,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayBtnOwn: { backgroundColor: Colors.background },
  audioWave: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#25D366",
    opacity: 0.7,
  },
  audioBarOwn: { backgroundColor: "rgba(0,0,0,0.25)" },

  // Document
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 140,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  docIconOwn: { backgroundColor: "rgba(255,255,255,0.3)" },
  docName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "600",
  },
  docNameOwn: { color: "#0d1117" },

  // Location
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 120,
  },
  locationText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "600",
  },
  locationTextOwn: { color: "#0d1117" },

  // Reaction
  reactionEmoji: {
    fontSize: 32,
    textAlign: "center",
    paddingVertical: 4,
  },

  // Template
  templateLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  templateLabelOwn: {},
  templateLabelText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  templateLabelTextOwn: { color: "rgba(0,0,0,0.45)" },
});
