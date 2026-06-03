import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Switch,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  fetchGroupDetail,
  fetchGroupMembers,
  fetchGroupInvites,
  cancelGroupInvite,
  setNotificationsMuted,
  updateGroup,
  removeGroupMember,
  changeMemberRole,
  leaveGroup,
  type ChatGroupDetail,
  type ChatRole,
  type GroupMember,
  type ChatGroupInvite,
} from "@/lib/chat/api";
import { MemberList } from "@/components/chat/MemberList";
import { AddMemberSheet } from "@/components/chat/AddMemberSheet";
import { DateField } from "@/components/ui/DateField";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";

const ROLE_OPTIONS: ChatRole[] = ["TOURIST", "COMPANION", "OPERATIONS", "ADMIN"];
const ROLE_LABEL: Record<ChatRole, string> = {
  ADMIN: "Admin",
  OPERATIONS: "Operations",
  TOURIST: "Tourist",
  COMPANION: "Companion",
};

function formatDateInput(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ChatSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const getAuthToken = useCallback(
    () => resolveMobileAuthToken(() => getTokenRef.current()),
    []
  );
  const { travelUser } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<ChatGroupDetail | null>(null);
  const [myRole, setMyRole] = useState<ChatRole>("TOURIST");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<ChatGroupInvite[]>([]);
  const [notificationsMuted, setNotificationsMutedState] = useState(false);
  const [muteSaving, setMuteSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tourStartDate, setTourStartDate] = useState("");
  const [tourEndDate, setTourEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [roleEditTarget, setRoleEditTarget] = useState<GroupMember | null>(null);
  const [memberAction, setMemberAction] = useState<GroupMember | null>(null);

  const isAdmin = myRole === "ADMIN";
  const canManage = myRole === "ADMIN" || myRole === "OPERATIONS";
  const canChangeRoles = isAdmin;

  useEffect(() => {
    navigation.setOptions({ headerTitle: "Group settings", headerBackTitle: "Back" });
  }, [navigation]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const reload = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const detail = await fetchGroupDetail({ groupId, getToken: getAuthToken });
      const canLoadInvites =
        detail.myRole === "ADMIN" || detail.myRole === "OPERATIONS";
      const [membersList, pendingInvites] = await Promise.all([
        fetchGroupMembers({ groupId, getToken: getAuthToken }),
        canLoadInvites ? fetchGroupInvites({ groupId, getToken: getAuthToken }) : Promise.resolve([]),
      ]);
      setGroup(detail.group);
      setMyRole(detail.myRole);
      setMembers(membersList);
      setInvites(pendingInvites);
      setNotificationsMutedState(detail.notificationsMuted);
      setName(detail.group.name);
      setDescription(detail.group.description ?? "");
      setTourStartDate(formatDateInput(detail.group.tourStartDate));
      setTourEndDate(formatDateInput(detail.group.tourEndDate));
      setImageUrl(detail.group.imageUrl ?? "");
    } catch (err: any) {
      Alert.alert("Couldn't load settings", err?.message ?? "Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [groupId, getAuthToken, router]);

  async function onToggleMute(next: boolean) {
    if (!groupId) return;
    setMuteSaving(true);
    try {
      const muted = await setNotificationsMuted({
        groupId,
        notificationsMuted: next,
        getToken: getAuthToken,
      });
      setNotificationsMutedState(muted);
    } catch (err: any) {
      Alert.alert("Couldn't update notifications", err?.message ?? "Please try again.");
    } finally {
      setMuteSaving(false);
    }
  }

  function onCancelInvite(invite: ChatGroupInvite) {
    if (!groupId) return;
    Alert.alert(
      "Cancel invite?",
      `${invite.invitedName} will no longer be invited.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel invite",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelGroupInvite({ groupId, inviteId: invite.id, getToken: getAuthToken });
              void reload();
            } catch (err: any) {
              Alert.alert("Couldn't cancel invite", err?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSave() {
    if (!groupId) return;
    if (!name.trim()) {
      Alert.alert("Name required", "Group name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateGroup({
        groupId,
        patch: {
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          tourStartDate: tourStartDate.trim() || null,
          tourEndDate: tourEndDate.trim() || null,
        },
        getToken: getAuthToken,
      });
      Alert.alert("Saved", "Group settings updated.");
      void reload();
    } catch (err: any) {
      Alert.alert("Couldn't save", err?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function onPressMember(m: GroupMember) {
    if (!canManage || m.travelAppUser.id === travelUser?.id) return;
    setMemberAction(m);
  }

  async function onChangeRole(m: GroupMember, role: ChatRole) {
    if (!groupId) return;
    setRoleEditTarget(null);
    try {
      await changeMemberRole({
        groupId,
        travelAppUserId: m.travelAppUser.id,
        role,
        getToken: getAuthToken,
      });
      void reload();
    } catch (err: any) {
      Alert.alert("Couldn't change role", err?.message ?? "Please try again.");
    }
  }

  function onRemoveMember(m: GroupMember) {
    if (!groupId) return;
    Alert.alert(
      "Remove member?",
      `${m.travelAppUser.name} will lose access to this group.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeGroupMember({
                groupId,
                travelAppUserId: m.travelAppUser.id,
                getToken: getAuthToken,
              });
              void reload();
            } catch (err: any) {
              Alert.alert("Couldn't remove", err?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  }

  function onLeave() {
    if (!groupId) return;
    Alert.alert(
      "Leave group?",
      "You'll lose access to this group's messages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup({ groupId, getToken: getAuthToken });
              router.replace("/(tabs)/chat");
            } catch (err: any) {
              Alert.alert("Couldn't leave", err?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  }

  if (loading || !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {canManage && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Group details</Text>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={Colors.textTertiary}
            maxLength={200}
            accessibilityLabel="Group name"
          />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor={Colors.textTertiary}
            multiline
            accessibilityLabel="Group description"
          />
          <Text style={styles.fieldLabel}>Image URL</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://… (optional)"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
            accessibilityLabel="Group image URL"
          />
          <Text style={styles.fieldLabel}>Tour start date</Text>
          <DateField
            style={styles.input}
            value={tourStartDate}
            onChange={setTourStartDate}
            placeholder="Choose start date"
            testID="chat-settings-start-date"
            accessibilityLabel="Tour start date"
          />
          <Text style={styles.fieldLabel}>Tour end date</Text>
          <DateField
            style={styles.input}
            value={tourEndDate}
            onChange={setTourEndDate}
            placeholder="Choose end date"
            testID="chat-settings-end-date"
            accessibilityLabel="Tour end date"
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save group settings"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!canManage && (
        <View style={styles.section}>
          <Text style={styles.readOnlyName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.readOnlyDesc}>{group.description}</Text>
          ) : null}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.muteRow}>
          <View style={styles.muteCopy}>
            <Text style={styles.muteTitle}>Mute notifications</Text>
            <Text style={styles.muteHint}>
              You will still see messages in the app, but push alerts are paused.
            </Text>
          </View>
          <Switch
            value={notificationsMuted}
            onValueChange={(value) => void onToggleMute(value)}
            disabled={muteSaving}
            accessibilityLabel="Mute group notifications"
          />
        </View>
      </View>

      {canManage && invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pending invites ({invites.length})</Text>
          {invites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteCopy}>
                <Text style={styles.inviteName}>{invite.invitedName}</Text>
                <Text style={styles.inviteMeta} numberOfLines={1}>
                  {[invite.invitedEmail, invite.invitedPhone].filter(Boolean).join(" · ") ||
                    "No contact details"}
                  {" · "}
                  {ROLE_LABEL[invite.role]}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onCancelInvite(invite)}
                accessibilityRole="button"
                accessibilityLabel={`Cancel invite for ${invite.invitedName}`}
              >
                <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>
            Members ({members.length})
          </Text>
          {canManage && (
            <TouchableOpacity
              onPress={() => setAddOpen(true)}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add member"
            >
              <Ionicons name="person-add" size={18} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <MemberList
          members={members}
          myUserId={travelUser?.id ?? null}
          canManage={canManage}
          canChangeRoles={canChangeRoles}
          onPressMember={onPressMember}
        />
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          onPress={onLeave}
          style={styles.leaveBtn}
          accessibilityRole="button"
          accessibilityLabel="Leave group"
        >
          <Ionicons name="exit-outline" size={20} color={Colors.error} />
          <Text style={styles.leaveBtnText}>Leave group</Text>
        </TouchableOpacity>
      </View>

      <AddMemberSheet
        visible={addOpen}
        groupId={groupId ?? ""}
        canPromoteToAdmin={isAdmin}
        onClose={() => setAddOpen(false)}
        onAdded={() => void reload()}
        getToken={getAuthToken}
      />

      {/* Member action sheet (Change role / Remove) */}
      <Modal
        visible={memberAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberAction(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setMemberAction(null)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {memberAction?.travelAppUser.name}
            </Text>
            {canChangeRoles && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  const target = memberAction;
                  setMemberAction(null);
                  if (target) setRoleEditTarget(target);
                }}
              >
                <Ionicons name="ribbon-outline" size={20} color={Colors.text} />
                <Text style={styles.actionLabel}>Change role</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowDanger]}
              onPress={() => {
                const target = memberAction;
                setMemberAction(null);
                if (target) onRemoveMember(target);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={[styles.actionLabel, styles.actionLabelDanger]}>
                Remove from group
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Role picker for change-role action */}
      <Modal
        visible={roleEditTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleEditTarget(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setRoleEditTarget(null)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>
              Set role for {roleEditTarget?.travelAppUser.name}
            </Text>
            {ROLE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.actionRow,
                  roleEditTarget?.role === r && styles.actionRowSelected,
                ]}
                onPress={() => {
                  if (roleEditTarget) onChangeRole(roleEditTarget, r);
                }}
              >
                <Text style={styles.actionLabel}>{ROLE_LABEL[r]}</Text>
                {roleEditTarget?.role === r && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={Colors.primary}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 80 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: {
    paddingTop: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 8,
    borderBottomColor: "#F1F5F9",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
    marginBottom: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  addBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textTertiary,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    margin: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  readOnlyName: {
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    paddingVertical: 8,
  },
  readOnlyDesc: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.textTertiary,
    paddingBottom: 16,
  },
  muteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  muteCopy: { flex: 1 },
  muteTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  muteHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 12,
  },
  inviteCopy: { flex: 1 },
  inviteName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  inviteMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  leaveBtnText: { color: Colors.error, fontSize: 15, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  actionSheetTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textTertiary,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionRowDanger: {},
  actionRowSelected: { backgroundColor: "#EFF6FF" },
  actionLabel: { fontSize: 16, color: Colors.text, fontWeight: "500" },
  actionLabelDanger: { color: Colors.error },
});
