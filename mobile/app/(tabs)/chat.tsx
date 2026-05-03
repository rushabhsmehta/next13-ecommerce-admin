import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  tourStartDate: string | null;
  tourEndDate: string | null;
  myRole: string;
  members: { id: string; travelAppUser: { name: string } }[];
  lastMessage: {
    id: string;
    content: string | null;
    messageType: string;
    createdAt: string;
    sender: { name: string } | null;
  } | null;
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "Now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function lastMessagePreview(msg: ChatGroup["lastMessage"]): string {
  if (!msg) return "No messages yet";
  if (msg.messageType !== "TEXT") return `📎 ${msg.messageType.charAt(0) + msg.messageType.slice(1).toLowerCase()}`;
  const preview = msg.content ?? "";
  const prefix = msg.sender ? `${msg.sender.name.split(" ")[0]}: ` : "";
  const full = prefix + preview;
  return full.length > 42 ? full.slice(0, 42) + "…" : full;
}

function GroupAvatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function ChatTab() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { isAdmin, isLoading: userLoading } = useCurrentUser();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchGroups(silent = false) {
    if (!isSignedIn) return;
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/chat/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (isSignedIn && !userLoading) fetchGroups();
  }, [isSignedIn, userLoading]);

  async function handleCreateGroup() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/chat/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || undefined,
          tourStartDate: newStart.trim() || undefined,
          tourEndDate: newEnd.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewStart("");
        setNewEnd("");
        fetchGroups(true);
      } else {
        Alert.alert("Error", "Failed to create group. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setCreating(false);
  }

  if (!isSignedIn) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Your Trip Chats</Text>
        <Text style={styles.emptySubtitle}>
          Login to see your trip group chats and stay connected with your tour.
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/login")}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (userLoading || loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGroups(true); }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No trip groups yet</Text>
            <Text style={styles.emptySubtitle}>
              {isAdmin
                ? "Create a group to start chatting with your tour travellers."
                : "You'll be added to your trip group once your booking is confirmed."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dateRange = formatDateRange(item.tourStartDate, item.tourEndDate);
          return (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              <GroupAvatar name={item.name} />
              <View style={styles.groupInfo}>
                <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
                {dateRange ? (
                  <Text style={styles.groupDates} numberOfLines={1}>{dateRange}</Text>
                ) : null}
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {lastMessagePreview(item.lastMessage)}
                </Text>
              </View>
              <View style={styles.groupMeta}>
                {item.lastMessage ? (
                  <Text style={styles.timeText}>{relativeTime(item.lastMessage.createdAt)}</Text>
                ) : null}
                {isAdmin && (
                  <View style={styles.memberBadge}>
                    <Ionicons name="people-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.memberCount}>{item.members.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={groups.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
      />

      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Trip Group</Text>
            <TouchableOpacity onPress={handleCreateGroup} disabled={creating || !newName.trim()}>
              {creating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={[styles.modalDone, !newName.trim() && styles.modalDoneDisabled]}>
                  Create
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Group Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Manali Group Tour"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80 }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Optional description"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
            <Text style={styles.fieldLabel}>Tour Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newStart}
              onChangeText={setNewStart}
              placeholder="e.g. 2026-03-15"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.fieldLabel}>Tour End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newEnd}
              onChangeText={setNewEnd}
              placeholder="e.g. 2026-03-20"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
  },
  loginButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  groupCard: {
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
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  groupInfo: { flex: 1, gap: 2 },
  groupName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  groupDates: { fontSize: 12, color: Colors.primary, fontWeight: "500" },
  lastMessage: { fontSize: 13, color: Colors.textTertiary },
  groupMeta: { alignItems: "flex-end", gap: 4 },
  timeText: { fontSize: 11, color: Colors.textTertiary },
  memberBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  memberCount: { fontSize: 11, color: Colors.textTertiary },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  modalCancel: { fontSize: 16, color: Colors.textTertiary },
  modalDone: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  modalDoneDisabled: { opacity: 0.4 },
  modalBody: { padding: 20, gap: 4 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textTertiary,
    marginTop: 16,
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
});
