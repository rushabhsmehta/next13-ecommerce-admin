import { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import {
  searchTravelUsers,
  addGroupMember,
  createGroupInvite,
  type ChatRole,
  type UserSearchResult,
} from "@/lib/chat/api";

const DEBOUNCE_MS = 350;
const ROLE_OPTIONS: ChatRole[] = ["TOURIST", "COMPANION", "OPERATIONS", "ADMIN"];
const ROLE_LABEL: Record<ChatRole, string> = {
  ADMIN: "Admin",
  OPERATIONS: "Operations",
  TOURIST: "Tourist",
  COMPANION: "Companion",
};

interface Props {
  visible: boolean;
  groupId: string;
  canPromoteToAdmin: boolean;
  onClose: () => void;
  onAdded: () => void;
  getToken: () => Promise<string | null>;
}

export function AddMemberSheet({
  visible,
  groupId,
  canPromoteToAdmin,
  onClose,
  onAdded,
  getToken,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserSearchResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"search" | "invite">("search");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<ChatRole>("TOURIST");
  const reqRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setPendingUser(null);
      setMode("search");
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
      setInviteRole("TOURIST");
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
      const found = await searchTravelUsers({ groupId, query: trimmed, getToken });
      if (reqId !== reqRef.current) return;
      setResults(found);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [visible, groupId, query, getToken]);

  async function chooseRoleAndAdd(role: ChatRole) {
    if (!pendingUser) return;
    setAdding(true);
    try {
      await addGroupMember({
        groupId,
        travelAppUserId: pendingUser.id,
        role,
        getToken,
      });
      onAdded();
      onClose();
    } catch (err: any) {
      Alert.alert("Couldn't add member", err?.message ?? "Please try again.");
    } finally {
      setAdding(false);
      setPendingUser(null);
    }
  }

  async function submitInvite() {
    const name = inviteName.trim();
    if (!name) {
      Alert.alert("Name required", "Enter the invitee's name.");
      return;
    }
    if (!inviteEmail.trim() && !invitePhone.trim()) {
      Alert.alert("Contact required", "Enter an email or phone number.");
      return;
    }
    setAdding(true);
    try {
      await createGroupInvite({
        groupId,
        invitedName: name,
        invitedEmail: inviteEmail.trim() || undefined,
        invitedPhone: invitePhone.trim() || undefined,
        role: inviteRole,
        getToken,
      });
      Alert.alert("Invite sent", "They will join automatically when they sign up.");
      onAdded();
      onClose();
    } catch (err: any) {
      Alert.alert("Couldn't send invite", err?.message ?? "Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const roles = canPromoteToAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => r !== "ADMIN");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add member</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "search" && styles.modeBtnActive]}
            onPress={() => setMode("search")}
            accessibilityRole="button"
            accessibilityLabel="Search existing users"
          >
            <Text style={[styles.modeBtnText, mode === "search" && styles.modeBtnTextActive]}>
              Existing user
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "invite" && styles.modeBtnActive]}
            onPress={() => setMode("invite")}
            accessibilityRole="button"
            accessibilityLabel="Invite by email or phone"
          >
            <Text style={[styles.modeBtnText, mode === "invite" && styles.modeBtnTextActive]}>
              Invite guest
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "invite" ? (
          <View style={styles.inviteForm}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Guest name"
              placeholderTextColor={Colors.textTertiary}
            />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@example.com"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.fieldInput}
              value={invitePhone}
              onChangeText={setInvitePhone}
              placeholder="+91…"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleChips}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, inviteRole === r && styles.roleChipActive]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      inviteRole === r && styles.roleChipTextActive,
                    ]}
                  >
                    {ROLE_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.inviteBtn, adding && styles.inviteBtnDisabled]}
              onPress={() => void submitInvite()}
              disabled={adding}
              accessibilityRole="button"
              accessibilityLabel="Send invite"
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.inviteBtnText}>Send invite</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, email, or phone…"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
            autoCapitalize="none"
            accessibilityLabel="Search users"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : query.trim().length < 2 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Type at least 2 characters to search.
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matching users.</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => setPendingUser(item)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.text}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            )}
          />
        )}

        </>
        )}

        <Modal
          visible={pendingUser !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPendingUser(null)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => !adding && setPendingUser(null)}
          >
            <View style={styles.roleSheet}>
              <Text style={styles.roleSheetTitle}>
                Add {pendingUser?.name} as…
              </Text>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.roleSheetRow}
                  onPress={() => chooseRoleAndAdd(r)}
                  disabled={adding}
                  accessibilityRole="button"
                  accessibilityLabel={`Add as ${ROLE_LABEL[r]}`}
                >
                  <Text style={styles.roleSheetLabel}>{ROLE_LABEL[r]}</Text>
                </TouchableOpacity>
              ))}
              {adding && (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: Colors.text },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textTertiary },
  modeBtnTextActive: { color: Colors.primary },
  inviteForm: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textTertiary,
    marginTop: 10,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleChipActive: { borderColor: Colors.primary, backgroundColor: "rgba(59,130,246,0.08)" },
  roleChipText: { fontSize: 13, color: Colors.textTertiary, fontWeight: "600" },
  roleChipTextActive: { color: Colors.primary },
  inviteBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    margin: 16,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  text: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  rowEmail: { fontSize: 12, color: Colors.textTertiary },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  roleSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  roleSheetTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textTertiary,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  roleSheetRow: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  roleSheetLabel: { fontSize: 16, color: Colors.text, fontWeight: "500" },
});
