import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  AppState,
  AppStateStatus,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { withAuth, ApiError } from "@/lib/api";
import { useWhatsAppUnread } from "@/hooks/useWhatsAppUnread";

const POLL_ACTIVE_MS = 30_000;
const POLL_BACKGROUND_MS = 120_000;
const PAGE_LIMIT = 30;

interface Conversation {
  phone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastDirection: string;
  lastStatus: string | null;
  unreadCount: number;
  lastOutboundAt: string | null;
}

interface ConversationsResponse {
  items: Conversation[];
  nextCursor: string | null;
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "Now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function ContactAvatar({ name, phone }: { name: string | null; phone: string }) {
  const letter = name
    ? name.charAt(0).toUpperCase()
    : phone.replace(/\D/g, "").charAt(0) || "?";
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

export default function WhatsAppTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { setTotal: setWhatsAppUnread } = useWhatsAppUnread();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const api = useRef(withAuth(getToken)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocused = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const errorShown = useRef(false);

  const applySearch = useCallback((data: Conversation[], q: string) => {
    if (!q.trim()) {
      setFiltered(data);
      return;
    }
    const lower = q.toLowerCase();
    setFiltered(
      data.filter(
        (c) =>
          (c.customerName && c.customerName.toLowerCase().includes(lower)) ||
          c.phone.includes(q),
      ),
    );
  }, []);

  const updateUnread = useCallback(
    (list: Conversation[]) => {
      const total = list.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      setWhatsAppUnread(total);
    },
    [setWhatsAppUnread],
  );

  const fetchConversations = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await api<ConversationsResponse>(
          `/api/mobile/whatsapp/conversations?limit=${PAGE_LIMIT}`,
        );
        setConversations(data.items);
        setNextCursor(data.nextCursor);
        applySearch(data.items, search);
        updateUnread(data.items);
        errorShown.current = false;
      } catch (error) {
        if (!silent && !errorShown.current) {
          errorShown.current = true;
          const message =
            error instanceof ApiError
              ? error.message
              : "Could not load conversations.";
          Alert.alert("WhatsApp", message);
        }
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [api, applySearch, search, updateUnread],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<ConversationsResponse>(
        `/api/mobile/whatsapp/conversations?limit=${PAGE_LIMIT}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      const merged = [...conversations, ...data.items];
      setConversations(merged);
      setNextCursor(data.nextCursor);
      applySearch(merged, search);
      updateUnread(merged);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not load more conversations.";
      Alert.alert("WhatsApp", message);
    } finally {
      setLoadingMore(false);
    }
  }, [api, applySearch, conversations, loadingMore, nextCursor, search, updateUnread]);

  const startPolling = useCallback(
    (intervalMs: number) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        if (appState.current === "active") {
          fetchConversations({ silent: true });
        }
      }, intervalMs);
    },
    [fetchConversations],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // AppState transitions adjust polling cadence.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev !== "active" && next === "active" && isFocused.current) {
        fetchConversations({ silent: true });
        startPolling(POLL_ACTIVE_MS);
      } else if (next !== "active") {
        startPolling(POLL_BACKGROUND_MS);
      }
    });
    return () => {
      sub.remove();
    };
  }, [fetchConversations, startPolling]);

  // Initial load + adaptive polling tied to screen focus. Runs on first mount
  // (the tab is focused immediately) and every subsequent focus.
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      fetchConversations();
      startPolling(POLL_ACTIVE_MS);
      return () => {
        isFocused.current = false;
        stopPolling();
      };
    }, [fetchConversations, startPolling, stopPolling]),
  );

  useEffect(() => {
    applySearch(conversations, search);
  }, [search, conversations, applySearch]);

  // Header overflow: opens a sheet linking to templates / customers / campaigns.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.headerBtn}
          accessibilityLabel="Open WhatsApp menu"
          testID="whatsapp-tab-menu"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  function openMenuRoute(
    target: "templates" | "customers" | "campaigns" | "catalog" | "flows",
  ) {
    setShowMenu(false);
    if (target === "templates") router.push("/whatsapp/templates");
    else if (target === "customers") router.push("/whatsapp/customers");
    else if (target === "campaigns") router.push("/whatsapp/campaigns");
    else if (target === "catalog") router.push("/whatsapp/catalog");
    else router.push("/whatsapp/flows");
  }

  function openConversation(phone: string) {
    const encoded = encodeURIComponent(phone);
    router.push(`/whatsapp/${encoded}`);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations({ silent: true });
  }, [fetchConversations]);

  if (loading) {
    return (
      <View style={styles.center} testID="whatsapp-tab-loading">
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Search conversations"
          testID="whatsapp-search-input"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            accessibilityLabel="Clear search"
            testID="whatsapp-search-clear"
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.phone}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25D366"
          />
        }
        onEndReached={search.trim() ? undefined : loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>
              {search ? "No matching conversations" : "No WhatsApp conversations yet"}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color="#25D366" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convCard}
            onPress={() => openConversation(item.phone)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Open conversation with ${item.customerName ?? item.phone}`}
            testID={`whatsapp-conv-${item.phone}`}
          >
            <ContactAvatar name={item.customerName} phone={item.phone} />
            <View style={styles.convInfo}>
              <Text style={styles.convName} numberOfLines={1}>
                {item.customerName || "Unknown"}
              </Text>
              <Text style={styles.convPhone} numberOfLines={1}>
                {item.phone}
              </Text>
              <Text style={styles.convLast} numberOfLines={1}>
                {item.lastDirection === "outbound" ? "You: " : ""}
                {item.lastMessage
                  ? item.lastMessage.length > 45
                    ? item.lastMessage.slice(0, 45) + "…"
                    : item.lastMessage
                  : "Media"}
              </Text>
            </View>
            <View style={styles.convMeta}>
              <Text style={styles.convTime}>{relativeTime(item.lastMessageAt)}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={
          filtered.length === 0
            ? { flex: 1 }
            : { paddingBottom: insets.bottom + 20 }
        }
      />

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
          <Pressable
            style={[styles.menuSheet, { paddingBottom: insets.bottom + 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.menuHandle} />
            <MenuRow
              icon="document-text-outline"
              label="Templates"
              hint="Send a pre-approved template"
              onPress={() => openMenuRoute("templates")}
            />
            <MenuRow
              icon="people-outline"
              label="Customers"
              hint="Browse contacts, tags, opt-in"
              onPress={() => openMenuRoute("customers")}
            />
            <MenuRow
              icon="megaphone-outline"
              label="Campaigns"
              hint="Launch and monitor broadcasts"
              onPress={() => openMenuRoute("campaigns")}
            />
            <MenuRow
              icon="bag-handle-outline"
              label="Catalog"
              hint="Browse tour packages and send products"
              onPress={() => openMenuRoute("catalog")}
            />
            <MenuRow
              icon="flash-outline"
              label="Flows"
              hint="Read-only — edit on web"
              onPress={() => openMenuRoute("flows")}
              isLast
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label}`}
      testID={`whatsapp-menu-${label.toLowerCase()}`}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={22} color="#075E54" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, textAlign: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.border,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6c757d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  convInfo: { flex: 1, gap: 2 },
  convName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  convPhone: { fontSize: 12, color: Colors.textTertiary },
  convLast: { fontSize: 13, color: Colors.textTertiary },
  convMeta: { alignItems: "flex-end", gap: 6 },
  convTime: { fontSize: 11, color: Colors.textTertiary },
  unreadBadge: {
    backgroundColor: "#25D366",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  footer: { paddingVertical: 16, alignItems: "center" },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E0F7E9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 15, fontWeight: "700", color: Colors.text },
  menuHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
});
