import { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SkeletonListItem } from "@/components/skeleton/SkeletonLoader";

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
  const { signOut } = useClerk();
  const { isAdmin, travelUser, isLoading: userLoading } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState<Date | null>(null);
  const [newEnd, setNewEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonOpacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonOpacity]);

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
      const body: Record<string, string | undefined> = {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      };
      if (newStart) body.tourStartDate = newStart.toISOString().split("T")[0];
      if (newEnd) body.tourEndDate = newEnd.toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/chat/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewStart(null);
        setNewEnd(null);
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
      <View testID="chat-login-prompt" style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Your Trip Chats</Text>
        <Text style={styles.emptySubtitle}>
          Login to see your trip group chats and stay connected with your tour.
        </Text>
        <TouchableOpacity testID="login-button" style={styles.loginButton} onPress={() => router.push("/login")}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (userLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.userStripSkeleton}>
          <Animated.View style={[styles.userStripAvatarSkeleton, { opacity: skeletonOpacity }]} />
          <Animated.View style={[styles.userStripNameSkeleton, { opacity: skeletonOpacity }]} />
        </View>
        <SkeletonListItem count={6} />
      </View>
    );
  }

  function handleSignOut() {
    Alert.alert(
      travelUser?.name ?? "Account",
      "Sign out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => signOut() },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {isSignedIn && (
        <TouchableOpacity style={styles.userStrip} onPress={handleSignOut} activeOpacity={0.7}>
          <View style={styles.userStripAvatar}>
            <Text style={styles.userStripAvatarText}>
              {(travelUser?.name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userStripName} numberOfLines={1}>
            {travelUser?.name ?? "Logged in"}
          </Text>
          <Text style={styles.userStripSignOut}>Sign out</Text>
        </TouchableOpacity>
      )}
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
        contentContainerStyle={groups.length === 0 ? { flex: 1 } : { paddingBottom: insets.bottom + 80 }}
      />

      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
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
            <Text style={styles.fieldLabel}>Tour Start Date</Text>
            <TouchableOpacity
              style={styles.fieldInput}
              onPress={() => setShowStartPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select tour start date"
            >
              <Text style={[styles.fieldInputText, !newStart && styles.fieldInputPlaceholder]}>
                {newStart ? newStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Select start date"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={newStart || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_event: any, date?: Date) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (date) setNewStart(date);
                }}
                minimumDate={new Date()}
              />
            )}
            <Text style={styles.fieldLabel}>Tour End Date</Text>
            <TouchableOpacity
              style={styles.fieldInput}
              onPress={() => setShowEndPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select tour end date"
            >
              <Text style={[styles.fieldInputText, !newEnd && styles.fieldInputPlaceholder]}>
                {newEnd ? newEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Select end date"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={newEnd || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_event: any, date?: Date) => {
                  setShowEndPicker(Platform.OS === "ios");
                  if (date) setNewEnd(date);
                }}
                minimumDate={newStart || new Date()}
              />
            )}
          </View>
        </SafeAreaView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldInputText: { fontSize: 15, color: Colors.text },
  fieldInputPlaceholder: { color: Colors.textTertiary },
  userStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
    backgroundColor: Colors.background,
  },
  userStripAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userStripAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  userStripName: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.text },
  userStripSignOut: { fontSize: 13, color: Colors.textTertiary },
  userStripSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 10,
    backgroundColor: Colors.background,
  },
  userStripAvatarSkeleton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
  },
  userStripNameSkeleton: {
    flex: 1,
    height: 14,
    borderRadius: 6,
    backgroundColor: Colors.surfaceAlt,
  },
});
