import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { chatApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { format } from "date-fns";

export default function ChatRoomScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("Chat");
  const [showAttachments, setShowAttachments] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !groupId) return;

      const data = await chatApi.getMessages(groupId, token);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [groupId]);

  const fetchUserAndMessages = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !groupId) return;

      const [meData, msgData, groupsData] = await Promise.all([
        chatApi.getMe(token),
        chatApi.getMessages(groupId, token),
        chatApi.getGroups(token),
      ]);

      setCurrentUserId(meData.userId);
      setMessages(msgData.messages || []);

      const group = (groupsData.groups || []).find((g: any) => g.id === groupId);
      if (group) setGroupName(group.name);
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchUserAndMessages();

    // Poll for new messages every 5 seconds
    pollingRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchUserAndMessages, fetchMessages]);

  const handleSend = async (
    messageType = "TEXT",
    extras: Record<string, any> = {}
  ) => {
    if (messageType === "TEXT" && !newMessage.trim()) return;

    setSending(true);
    try {
      const token = await getToken();
      if (!token || !groupId) return;

      const body: any = {
        messageType,
        content: messageType === "TEXT" ? newMessage.trim() : extras.content,
        ...extras,
      };

      const msg = await chatApi.sendMessage(groupId, body, token);
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      setShowAttachments(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleShareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      handleSend("LOCATION", {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        content: "📍 Location shared",
      });
    } catch (error) {
      Alert.alert("Error", "Could not get your location.");
    }
  };

  const handleShareContact = () => {
    Alert.prompt(
      "Share Contact",
      "Enter contact name:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Next",
          onPress: (name) => {
            if (!name) return;
            Alert.prompt(
              "Phone Number",
              "Enter phone number (optional):",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Share",
                  onPress: (phone) => {
                    handleSend("CONTACT", {
                      contactName: name,
                      contactPhone: phone,
                      content: `👤 ${name}`,
                    });
                  },
                },
              ],
              "plain-text"
            );
          },
        },
      ],
      "plain-text"
    );
  };

  const handleShareTourLink = () => {
    Alert.prompt(
      "Share Tour Package",
      "Enter Tour Package ID:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: (pkgId) => {
            if (pkgId) {
              handleSend("TOUR_LINK", {
                tourPackageId: pkgId,
                content: "🔗 Tour Package",
              });
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwn = item.senderId === currentUserId;

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          {!isOwn && (
            <Text style={styles.senderName}>{item.sender?.name}</Text>
          )}

          {/* Message content based on type */}
          {item.messageType === "IMAGE" && item.fileUrl && (
            <Image
              source={{ uri: item.fileUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {item.messageType === "LOCATION" &&
            item.latitude &&
            item.longitude && (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${item.latitude},${item.longitude}`
                  )
                }
              >
                <Text style={[styles.messageText, isOwn && styles.textOwn]}>
                  📍 Location shared
                </Text>
                <Text
                  style={[styles.linkText, isOwn && { color: "#d1fae5" }]}
                >
                  Open in Maps →
                </Text>
              </Pressable>
            )}

          {item.messageType === "CONTACT" && (
            <View>
              <Text style={[styles.messageText, isOwn && styles.textOwn]}>
                👤 {item.contactName}
              </Text>
              {item.contactPhone && (
                <Text
                  style={[styles.contactPhone, isOwn && { color: "#d1fae5" }]}
                >
                  {item.contactPhone}
                </Text>
              )}
            </View>
          )}

          {item.messageType === "TOUR_LINK" && (
            <View>
              <Text style={[styles.messageText, isOwn && styles.textOwn]}>
                🔗 Tour Package
              </Text>
              <Text
                style={[styles.linkText, isOwn && { color: "#d1fae5" }]}
              >
                View Details →
              </Text>
            </View>
          )}

          {(item.messageType === "PDF" || item.messageType === "FILE") && (
            <Pressable
              onPress={() => item.fileUrl && Linking.openURL(item.fileUrl)}
            >
              <Text style={[styles.messageText, isOwn && styles.textOwn]}>
                📎 {item.fileName || "File"}
              </Text>
              <Text
                style={[styles.linkText, isOwn && { color: "#d1fae5" }]}
              >
                Download →
              </Text>
            </Pressable>
          )}

          {item.messageType === "TEXT" && (
            <Text style={[styles.messageText, isOwn && styles.textOwn]}>
              {item.content}
            </Text>
          )}

          <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>
            {format(new Date(item.createdAt), "HH:mm")}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: groupName }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyChatText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          }
        />

        {/* Attachment Options */}
        {showAttachments && (
          <View style={styles.attachmentBar}>
            <Pressable style={styles.attachOption} onPress={handleShareLocation}>
              <View style={[styles.attachIcon, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="location" size={22} color="#2563eb" />
              </View>
              <Text style={styles.attachLabel}>Location</Text>
            </Pressable>
            <Pressable style={styles.attachOption} onPress={handleShareContact}>
              <View style={[styles.attachIcon, { backgroundColor: "#f3e8ff" }]}>
                <Ionicons name="person" size={22} color="#7c3aed" />
              </View>
              <Text style={styles.attachLabel}>Contact</Text>
            </Pressable>
            <Pressable style={styles.attachOption} onPress={handleShareTourLink}>
              <View style={[styles.attachIcon, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="link" size={22} color="#059669" />
              </View>
              <Text style={styles.attachLabel}>Tour Link</Text>
            </Pressable>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <Pressable
            style={styles.attachButton}
            onPress={() => setShowAttachments(!showAttachments)}
          >
            <Ionicons
              name={showAttachments ? "close" : "add-circle"}
              size={26}
              color={showAttachments ? Colors.textSecondary : Colors.primary}
            />
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textTertiary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Messages
  messageList: { padding: Spacing.md, paddingBottom: Spacing.xl },
  messageRow: { marginBottom: Spacing.sm },
  messageRowOwn: { alignItems: "flex-end" },

  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bubbleOwn: {
    backgroundColor: Colors.chatBubbleOwn,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleOther: {
    backgroundColor: Colors.chatBubbleOther,
    borderBottomLeftRadius: BorderRadius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  senderName: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 4,
  },
  messageText: { fontSize: FontSize.md, color: Colors.chatBubbleOtherText, lineHeight: 20 },
  textOwn: { color: Colors.chatBubbleOwnText },
  messageImage: { width: 200, height: 150, borderRadius: BorderRadius.md, marginBottom: 4 },
  linkText: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 4 },
  contactPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  timestamp: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timestampOwn: { color: "rgba(255,255,255,0.7)" },

  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    gap: Spacing.md,
  },
  emptyChatText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    textAlign: "center",
  },

  // Attachments
  attachmentBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  attachOption: { alignItems: "center", gap: 4 },
  attachIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  attachLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  attachButton: { paddingBottom: 4 },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});
