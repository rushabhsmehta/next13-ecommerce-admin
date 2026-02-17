import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { chatApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { format } from "date-fns";

export default function ChatListScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError("Please sign in to access trip chats");
        setLoading(false);
        return;
      }
      const data = await chatApi.getGroups(token);
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const getMessagePreview = (msg: any) => {
    if (!msg) return "No messages yet";
    switch (msg.messageType) {
      case "IMAGE": return "📷 Photo";
      case "LOCATION": return "📍 Location";
      case "CONTACT": return "👤 Contact";
      case "TOUR_LINK": return "🔗 Tour Package";
      case "PDF": return "📄 Document";
      case "FILE": return "📎 File";
      default: return msg.content || "Message";
    }
  };

  const renderGroup = ({ item }: { item: any }) => (
    <Pressable
      style={styles.groupItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.groupAvatar}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="people" size={24} color="#fff" />
        )}
      </View>
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessage && (
            <Text style={styles.timestamp}>
              {format(new Date(item.lastMessage.createdAt), "HH:mm")}
            </Text>
          )}
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage
            ? `${item.lastMessage.sender?.name}: ${getMessagePreview(item.lastMessage)}`
            : "No messages yet"}
        </Text>
        <View style={styles.memberRow}>
          <Ionicons name="people-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.memberCount}>
            {item.members?.length || 0} members
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your chats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorTitle}>Sign In Required</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groups.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>
            Chat groups will appear here when you are added to a tour group by our team.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
  listContent: { paddingTop: Spacing.sm },

  // Group item
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 52, height: 52 },
  groupInfo: { flex: 1 },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timestamp: { fontSize: FontSize.xs, color: Colors.textTertiary },
  lastMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  memberCount: { fontSize: FontSize.xs, color: Colors.textTertiary },

  // Empty / Error
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "600", color: Colors.text },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  errorTitle: { fontSize: FontSize.xl, fontWeight: "600", color: Colors.text },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
