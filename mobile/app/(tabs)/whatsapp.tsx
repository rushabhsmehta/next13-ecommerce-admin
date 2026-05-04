import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface Conversation {
  phone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastDirection: string;
  unreadCount: number;
  lastOutboundAt: string | null;
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "Now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function ContactAvatar({ name, phone }: { name: string | null; phone: string }) {
  const letter = name ? name.charAt(0).toUpperCase() : phone.replace(/\D/g, "").charAt(0) || "?";
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

export default function WhatsAppTab() {
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchConversations(silent = false) {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
        applySearch(data, search);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  function applySearch(data: Conversation[], q: string) {
    if (!q.trim()) {
      setFiltered(data);
      return;
    }
    const lower = q.toLowerCase();
    setFiltered(
      data.filter(
        (c) =>
          (c.customerName && c.customerName.toLowerCase().includes(lower)) ||
          c.phone.includes(q)
      )
    );
  }

  useEffect(() => {
    fetchConversations();
    const poll = setInterval(() => fetchConversations(true), 30000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    applySearch(conversations, search);
  }, [search, conversations]);

  function openConversation(phone: string) {
    const encoded = encodeURIComponent(phone);
    router.push(`/whatsapp/${encoded}`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
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
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
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
            onRefresh={() => { setRefreshing(true); fetchConversations(true); }}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              {search ? "No matching conversations" : "No WhatsApp conversations yet"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convCard}
            onPress={() => openConversation(item.phone)}
            activeOpacity={0.7}
          >
            <ContactAvatar name={item.customerName} phone={item.phone} />
            <View style={styles.convInfo}>
              <Text style={styles.convName} numberOfLines={1}>
                {item.customerName || "Unknown"}
              </Text>
              <Text style={styles.convPhone} numberOfLines={1}>{item.phone}</Text>
              <Text style={styles.convLast} numberOfLines={1}>
                {item.lastDirection === "outbound" ? "You: " : ""}
                {item.lastMessage ? (
                  item.lastMessage.length > 45
                    ? item.lastMessage.slice(0, 45) + "…"
                    : item.lastMessage
                ) : "Media"}
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
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 20 }}
      />
    </View>
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
});
