import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { Conversation } from "@/lib/whatsapp-api";

interface Props {
  conversation: Conversation;
  onPress: () => void;
}

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }
  return phone.slice(-2);
}

const AVATAR_COLORS = [
  "#128C7E", "#075E54", "#25D366", "#34B7F1",
  "#e8612d", "#9b3a8d", "#3b82f6", "#f59e0b",
];

function avatarColor(phone: string): string {
  const idx = phone.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

export function ConversationItem({ conversation, onPress }: Props) {
  const { phone, customerName, lastMessage, lastMessageAt, lastDirection, unreadCount } = conversation;
  const bgColor = avatarColor(phone);
  const displayName = customerName || phone;
  const preview = lastMessage
    ? lastMessage.length > 55 ? lastMessage.slice(0, 52) + "…" : lastMessage
    : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        <Text style={styles.avatarText}>{initials(customerName, phone)}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.time}>{timeLabel(lastMessageAt)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.previewRow}>
            {lastDirection === "outbound" && (
              <Ionicons name="checkmark-done-outline" size={14} color={Colors.textTertiary} />
            )}
            <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  rowPressed: { backgroundColor: Colors.surfaceAlt },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },

  content: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flexShrink: 0,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  previewRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  preview: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  badge: {
    backgroundColor: "#25D366",
    borderRadius: BorderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#fff",
  },
});
