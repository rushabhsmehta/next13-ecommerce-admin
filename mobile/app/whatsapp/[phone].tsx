import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { whatsappApi, WaMessage, WindowStatus } from "@/lib/whatsapp-api";
import { MessageBubble } from "@/components/whatsapp/MessageBubble";
import { EmojiPicker } from "@/components/whatsapp/EmojiPicker";
import { TemplateSelector } from "@/components/whatsapp/TemplateSelector";
import { CatalogComposer } from "@/components/whatsapp/CatalogComposer";
import {
  pickAndUploadImage,
  pickAndUploadVideo,
  pickAndUploadDocument,
} from "@/components/whatsapp/MediaPicker";

const POLL_INTERVAL = 10000;

export default function WhatsAppChatScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [window, setWindow] = useState<WindowStatus | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const decodedPhone = phone ? decodeURIComponent(phone as string) : "";

  const customerName = messages.find((m) => m.whatsappCustomer)
    ?.whatsappCustomer;
  const displayName = customerName
    ? `${customerName.firstName}${customerName.lastName ? " " + customerName.lastName : ""}`
    : decodedPhone;

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!decodedPhone) return;
      try {
        if (!silent) setLoading(true);
        const data = await whatsappApi.getMessages(decodedPhone);
        setMessages(data.messages);
        setNextCursor(data.nextCursor);
      } catch {
        // silently fail on background polls
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [decodedPhone]
  );

  const fetchWindow = useCallback(async () => {
    if (!decodedPhone) return;
    try {
      const data = await whatsappApi.checkWindow(decodedPhone);
      setWindow(data);
    } catch {
      // ignore window check errors
    }
  }, [decodedPhone]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore || !decodedPhone) return;
    setLoadingMore(true);
    try {
      const data = await whatsappApi.getMessages(decodedPhone, nextCursor);
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      fetchWindow();

      pollRef.current = setInterval(() => {
        fetchMessages(true);
      }, POLL_INTERVAL);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchMessages, fetchWindow])
  );

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !decodedPhone) return;
    setSending(true);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: WaMessage = {
      id: optimisticId,
      message: trimmed,
      direction: "outbound",
      status: "sending",
      from: null,
      to: decodedPhone,
      createdAt: new Date().toISOString(),
      metadata: null,
      whatsappCustomer: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      await whatsappApi.sendText(decodedPhone, trimmed);
      await fetchMessages(true);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(trimmed);
      Alert.alert("Send Failed", err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            "Send Template",
            "Send Image",
            "Send Video",
            "Send Document",
            "Send Tour Package",
          ],
          cancelButtonIndex: 0,
        },
        async (index) => {
          if (index === 1) setShowTemplates(true);
          else if (index === 2) handleSendImage();
          else if (index === 3) handleSendVideo();
          else if (index === 4) handleSendDocument();
          else if (index === 5) setShowCatalog(true);
        }
      );
    } else {
      setShowAttachMenu(true);
    }
  };

  const handleSendImage = async () => {
    setShowAttachMenu(false);
    setUploadingMedia(true);
    try {
      const picked = await pickAndUploadImage();
      if (!picked) return;
      await whatsappApi.sendMedia(decodedPhone, picked.url, "image");
      await fetchMessages(true);
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not send image.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSendVideo = async () => {
    setShowAttachMenu(false);
    setUploadingMedia(true);
    try {
      const picked = await pickAndUploadVideo();
      if (!picked) return;
      await whatsappApi.sendMedia(decodedPhone, picked.url, "video");
      await fetchMessages(true);
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not send video.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSendDocument = async () => {
    setShowAttachMenu(false);
    setUploadingMedia(true);
    try {
      const picked = await pickAndUploadDocument();
      if (!picked) return;
      await whatsappApi.sendMedia(decodedPhone, picked.url, "document");
      await fetchMessages(true);
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not send document.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const windowExpired = window !== null && !window.canSendFreeForm;
  const canSend = text.trim().length > 0 && !windowExpired && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.headerPhone}>{decodedPhone}</Text>
        </View>
        <Pressable onPress={() => fetchMessages()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* 24h Window Banner */}
      {windowExpired && (
        <View style={styles.windowBanner}>
          <Ionicons name="time-outline" size={14} color="#92400e" />
          <Text style={styles.windowBannerText}>
            Customer hasn&apos;t messaged in 24h. Use a template to reach out.
          </Text>
          <Pressable onPress={() => setShowTemplates(true)}>
            <Text style={styles.windowBannerAction}>Send Template</Text>
          </Pressable>
        </View>
      )}

      {/* Message List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#25D366" size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubText}>
            {windowExpired
              ? "Send a template to start the conversation."
              : "Send the first message below."}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadMoreIndicator}>
                <ActivityIndicator size="small" color={Colors.textTertiary} />
              </View>
            ) : nextCursor ? (
              <Pressable style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load earlier messages</Text>
              </Pressable>
            ) : null
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Composer */}
      <View style={styles.composer}>
        {uploadingMedia && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingText}>Uploading media…</Text>
          </View>
        )}
        <View style={styles.composerRow}>
          <Pressable
            style={styles.composerBtn}
            onPress={() => setShowEmoji(true)}
          >
            <Ionicons name="happy-outline" size={22} color={Colors.textSecondary} />
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            placeholder={
              windowExpired
                ? "Use a template to message this customer"
                : "Type a message…"
            }
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4096}
            placeholderTextColor={Colors.textTertiary}
            editable={!windowExpired}
          />

          <Pressable
            style={styles.composerBtn}
            onPress={handleAttachPress}
          >
            <Ionicons name="attach" size={22} color={Colors.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Android Attach Sheet */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setShowAttachMenu(false)}
        />
        <View style={styles.attachSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Attach</Text>

          {[
            { icon: "mail-outline" as const, label: "Send Template", onPress: () => { setShowAttachMenu(false); setShowTemplates(true); } },
            { icon: "image-outline" as const, label: "Send Image", onPress: handleSendImage },
            { icon: "videocam-outline" as const, label: "Send Video", onPress: handleSendVideo },
            { icon: "document-outline" as const, label: "Send Document", onPress: handleSendDocument },
            { icon: "cube-outline" as const, label: "Send Tour Package", onPress: () => { setShowAttachMenu(false); setShowCatalog(true); } },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.sheetItem}
              onPress={item.onPress}
            >
              <View style={styles.sheetItemIcon}>
                <Ionicons name={item.icon} size={22} color="#25D366" />
              </View>
              <Text style={styles.sheetItemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmoji}
        onClose={() => setShowEmoji(false)}
        onSelect={(emoji) => setText((prev) => prev + emoji)}
      />

      {/* Template Selector */}
      <TemplateSelector
        visible={showTemplates}
        phone={decodedPhone}
        onClose={() => setShowTemplates(false)}
        onSent={() => {
          setShowTemplates(false);
          fetchMessages(true);
          fetchWindow();
        }}
      />

      {/* Catalog Composer */}
      <CatalogComposer
        visible={showCatalog}
        phone={decodedPhone}
        onClose={() => setShowCatalog(false)}
        onSent={() => {
          setShowCatalog(false);
          fetchMessages(true);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ece5dd",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#075E54",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: "#fff",
  },
  headerPhone: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 4,
  },

  // Window Banner
  windowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexWrap: "wrap",
  },
  windowBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: "#92400e",
    lineHeight: 16,
  },
  windowBannerAction: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#b45309",
    textDecorationLine: "underline",
  },

  // Message List
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: "center",
  },
  messageList: {
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingMore: {
    padding: Spacing.md,
    alignItems: "center",
  },
  loadMoreIndicator: {
    padding: Spacing.md,
    alignItems: "center",
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  loadMoreText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textDecorationLine: "underline",
  },

  // Composer
  composer: {
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: Colors.primaryBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  uploadingText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: "600",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  composerBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  composerInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textTertiary,
  },

  // Android Attach Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  attachSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "500",
  },
});
