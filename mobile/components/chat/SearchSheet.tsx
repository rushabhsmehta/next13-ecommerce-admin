import { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/api";
const DEBOUNCE_MS = 350;

interface SearchResult {
  id: string;
  content: string | null;
  createdAt: string;
  sender: { id: string; name: string } | null;
}

interface Props {
  visible: boolean;
  groupId: string | undefined;
  onClose: () => void;
  onSelect: (messageId: string) => void;
  getToken: () => Promise<string | null>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SearchSheet({ visible, groupId, onClose, onSelect, getToken }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !groupId) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reqId = ++reqRef.current;
    const handle = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE_URL}/api/chat/groups/${groupId}/messages/search?q=${encodeURIComponent(
            trimmed
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reqId !== reqRef.current) return; // stale
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } catch {
        // ignore network errors; user can retype
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [visible, groupId, query, getToken]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close search">
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search messages…"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Search messages"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={6} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : query.trim().length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Type at least 2 characters to search.</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches.</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Open message"
              >
                <Text style={styles.rowSender} numberOfLines={1}>
                  {item.sender?.name ?? "Unknown"} · {formatDate(item.createdAt)}
                </Text>
                <Text style={styles.rowContent} numberOfLines={2}>
                  {item.content ?? ""}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
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
  input: { flex: 1, fontSize: 15, color: Colors.text },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowSender: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  rowContent: { fontSize: 14, color: Colors.text, marginTop: 4 },
});
