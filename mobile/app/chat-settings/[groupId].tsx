import { useEffect, useState, useCallback } from "react";
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
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  fetchGroupDetail,
  fetchGroupMemberSummary,
  updateGroup,
  removeGroupMember,
  changeMemberRole,
  leaveGroup,
  cancelGroupInvite,
  setGroupNotificationsMuted,
  type ChatGroupDetail,
  type ChatRole,
  type ChatGroupInvite,
  type GroupMember,
} from "@/lib/chat/api";
import { MemberList } from "@/components/chat/MemberList";
import { AddMemberSheet } from "@/components/chat/AddMemberSheet";
import { DateField } from "@/components/ui/DateField";

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
  const { travelUser } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<ChatGroupDetail | null>(null);
  const [myRole, setMyRole] = useState<ChatRole>("TOURIST");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ChatGroupInvite[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tourStartDate, setTourStartDate] = useState("");
  const [tourEndDate, setTourEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [roleEditTarget, setRoleEditTarget] = useState<GroupMember | null>(null);
  const [memberAction, setMemberAction] = useState<GroupMember | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const isAdmin = myRole === "ADMIN";
  const canManage = myRole === "ADMIN" || myRole === "OPERATIONS";
  const canChangeRoles = isAdmin;

  useEffect(() => {
    navigation.setOptions({ headerTitle: "Group settings", headerBackTitle: "Back" });
  }, [navigation]);

  const reload = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [detail, membersList] = await Promise.all([
        fetchGroupDetail({ groupId, getToken }),
        fetchGroupMemberSummary({ groupId, getToken }),
      ]);
      setGroup(detail.group);
      setMyRole(detail.myRole);
      setMembers(membersList.members);
      setPendingInvites(membersList.pendingInvites);
      setNotificationsMuted(!!(detail.notificationsMuted ?? membersList.notificationsMuted));
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
  }, [groupId, getToken, router]);

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
        getToken,
      });
      Alert.alert("Saved", "Group settings updated.");
      void reload();
    } catch (err: any) {
      Alert.alert("Couldn't save", err?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleMute(next: boolean) {
    if (!groupId) return;
    const previous = notificationsMuted;
    setNotificationsMuted(next);
    try {
      const saved = await setGroupNotificationsMuted({
        groupId,
        notificationsMuted: next,
        getToken,
      });
      setNotificationsMuted(saved);
    } catch (err: any) {
      setNotificationsMuted(previous);
      Alert.alert("Couldn't update notifications", err?.message ?? "Please try again.");
    }
  }

  function onCancelInvite(invite: ChatGroupInvite) {
    if (!groupId) return;
    Alert.alert(
      "Cancel invite?",
      `${invite.invitedName} will no longer be able to join from this invite.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel invite",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelGroupInvite({ groupId, inviteId: invite.id, getToken });
              void reload();
            } catch (err: any) {
              Alert.alert("Couldn't cancel invite", err?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
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
        getToken,
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
                getToken,
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
              await leaveGroup({ groupId, getToken });
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
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Notifications</Text>
            <Text style={styles.settingCaption}>
              {notificationsMuted
                ? "Muted for this trip group."
                : "New messages send WhatsApp-like push alerts."}
            </Text>
          </View>
          <Switch
            value={!notificationsMuted}
            onValueChange={(enabled) => void onToggleMute(!enabled)}
            accessibilityLabel="Trip chat notifications"
          />
        </View>
      </View>

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
        {pendingInvites.length > 0 ? (
          <View style={styles.pendingInvites}>
            <Text style={styles.pendingInvitesTitle}>
              Pending invites ({pendingInvites.length})
            </Text>
            {pendingInvites.map((invite) => (
              <TouchableOpacity
                key={invite.id}
                style={styles.pendingInviteRow}
                onPress={() => canManage && onCancelInvite(invite)}
                disabled={!canManage}
                accessibilityRole={canManage ? "button" : undefined}
                accessibilityLabel={`Pending invite for ${invite.invitedName}`}
              >
                <View style={styles.pendingInviteAvatar}>
                  <Text style={styles.pendingInviteAvatarText}>
                    {invite.invitedName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingInviteName}>{invite.invitedName}</Text>
                  <Text style={styles.pendingInviteMeta} numberOfLines={1}>
                    {invite.invitedEmail || invite.invitedPhone || "Invite pending"}
                  </Text>
                </View>
                <Text style={styles.pendingInviteRole}>{ROLE_LABEL[invite.role]}</Text>
                {canManage ? (
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
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
        getToken={getToken}
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
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingCaption: {
    paddingTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
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
  pendingInvites: {
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pendingInvitesTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  pendingInviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pendingInviteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingInviteAvatarText: { color: "#92400E", fontSize: 14, fontWeight: "900" },
  pendingInviteName: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  pendingInviteMeta: { color: Colors.textTertiary, fontSize: 12, marginTop: 2 },
  pendingInviteRole: { color: Colors.primary, fontSize: 11, fontWeight: "900" },
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
