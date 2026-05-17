import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate, OfflineGate } from "@/components/auth/PermissionGate";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createTravelAppAdminClient,
  type TravelAdminChatGroup,
  type TravelAdminOverview,
  type TravelAdminUser,
} from "@/lib/travel-app-admin";

type TabKey = "users" | "chats" | "access";

export default function TravelAppAdminScreen() {
  return (
    <PermissionGate permission="travelAppAdmin.read">
      <OfflineGate policy="online_only">
        <TravelAppAdminInner />
      </OfflineGate>
    </PermissionGate>
  );
}

function TravelAppAdminInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTravelAppAdminClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [tab, setTab] = useState<TabKey>("users");
  const [data, setData] = useState<TravelAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setData(await client.getOverview());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load travel app admin.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    setBusyId("new-user");
    try {
      await client.createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim() || null,
      });
      setNewUser({ name: "", email: "", phone: "" });
      await load("refresh");
    } catch (err) {
      Alert.alert("Create failed", err instanceof ApiError ? err.message : "Could not create user.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateUser(user: TravelAdminUser, patch: Partial<TravelAdminUser>) {
    setBusyId(user.id);
    try {
      await client.updateUser(user.id, patch);
      await load("refresh");
    } catch (err) {
      Alert.alert("Update failed", err instanceof ApiError ? err.message : "Could not update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function createGroup() {
    if (!newGroup.name.trim()) return;
    setBusyId("new-group");
    try {
      await client.createChatGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || null,
      });
      setNewGroup({ name: "", description: "" });
      await load("refresh");
    } catch (err) {
      Alert.alert("Create failed", err instanceof ApiError ? err.message : "Could not create chat group.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleGroup(group: TravelAdminChatGroup) {
    setBusyId(group.id);
    try {
      await client.updateChatGroup(group.id, { isActive: !group.isActive });
      await load("refresh");
    } catch (err) {
      Alert.alert("Update failed", err instanceof ApiError ? err.message : "Could not update group.");
    } finally {
      setBusyId(null);
    }
  }

  async function addFirstAvailableMember(group: TravelAdminChatGroup, role = "TOURIST") {
    const users = data?.users ?? [];
    const existingIds = new Set(group.members.map((member) => member.travelAppUserId));
    const candidate = users.find((user) => user.isActive && !existingIds.has(user.id));
    if (!candidate) {
      Alert.alert("No available users", "All active travel users are already in this group.");
      return;
    }
    setBusyId(group.id);
    try {
      await client.addMember(group.id, { travelAppUserId: candidate.id, role });
      await load("refresh");
    } catch (err) {
      Alert.alert("Member failed", err instanceof ApiError ? err.message : "Could not add member.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(group: TravelAdminChatGroup, userId: string) {
    setBusyId(group.id);
    try {
      await client.removeMember(group.id, userId);
      await load("refresh");
    } catch (err) {
      Alert.alert("Member failed", err instanceof ApiError ? err.message : "Could not remove member.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: "Travel App Admin", headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Travel App</Text>
          <Text style={styles.headerSubtitle}>
            {data ? `${data.users.length} users - ${data.chatGroups.length} groups` : "Loading..."}
          </Text>
        </View>
      </View>

      <View style={styles.segmentRail}>
        {(["users", "chats", "access"] as TabKey[]).map((key) => (
          <Pressable
            key={key}
            testID={`travel-admin-tab-${key}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${key}`}
            accessibilityState={{ selected: tab === key }}
            style={[styles.segment, tab === key ? styles.segmentActive : null]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.segmentText, tab === key ? styles.segmentTextActive : null]}>
              {key === "users" ? "Users" : key === "chats" ? "Chats" : "Access"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        testID="travel-app-admin-screen"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
      >
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading && !data ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : data ? (
          <>
            {tab === "users" ? (
              <>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Add user</Text>
                  <Field testID="travel-user-name" label="Name" value={newUser.name} onChangeText={(name) => setNewUser((v) => ({ ...v, name }))} />
                  <Field testID="travel-user-email" label="Email" value={newUser.email} onChangeText={(email) => setNewUser((v) => ({ ...v, email }))} keyboardType="email-address" />
                  <Field testID="travel-user-phone" label="Phone" value={newUser.phone} onChangeText={(phone) => setNewUser((v) => ({ ...v, phone }))} keyboardType="phone-pad" />
                  <PrimaryButton
                    testID="travel-user-create"
                    label="Create user"
                    icon="person-add-outline"
                    busy={busyId === "new-user"}
                    disabled={!newUser.name.trim() || !newUser.email.trim() || busyId !== null}
                    onPress={() => void createUser()}
                  />
                </View>
                {data.users.map((user) => (
                  <View key={user.id} style={styles.row} testID={`travel-user-${user.id}`}>
                    <View style={styles.rowTop}>
                      <Ionicons name="person-circle-outline" size={28} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{user.name}</Text>
                        <Text style={styles.rowMeta}>{user.email}</Text>
                      </View>
                      <StatusPill label={!user.isActive ? "Inactive" : user.isApproved ? "Approved" : "Pending"} tone={!user.isActive ? "bad" : user.isApproved ? "ok" : "warn"} />
                    </View>
                    <Text style={styles.rowMeta}>
                      {user.chatGroupCount} groups - {user.messageCount} messages - {user.activePushTokenCount} push tokens
                    </Text>
                    <View style={styles.actions}>
                      <SmallButton
                        testID={`travel-user-approve-${user.id}`}
                        label={user.isApproved ? "Revoke" : "Approve"}
                        icon={user.isApproved ? "shield-outline" : "checkmark-outline"}
                        disabled={busyId !== null}
                        onPress={() => void updateUser(user, { isApproved: !user.isApproved })}
                      />
                      <SmallButton
                        testID={`travel-user-active-${user.id}`}
                        label={user.isActive ? "Deactivate" : "Activate"}
                        icon={user.isActive ? "close-outline" : "refresh-outline"}
                        disabled={busyId !== null}
                        onPress={() => void updateUser(user, { isActive: !user.isActive })}
                      />
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {tab === "chats" ? (
              <>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Create group</Text>
                  <Field testID="travel-chat-name" label="Name" value={newGroup.name} onChangeText={(name) => setNewGroup((v) => ({ ...v, name }))} />
                  <Field testID="travel-chat-description" label="Description" value={newGroup.description} onChangeText={(description) => setNewGroup((v) => ({ ...v, description }))} />
                  <PrimaryButton
                    testID="travel-chat-create"
                    label="Create group"
                    icon="chatbubbles-outline"
                    busy={busyId === "new-group"}
                    disabled={!newGroup.name.trim() || busyId !== null}
                    onPress={() => void createGroup()}
                  />
                </View>
                {data.chatGroups.map((group) => (
                  <View key={group.id} style={styles.row} testID={`travel-chat-${group.id}`}>
                    <View style={styles.rowTop}>
                      <Ionicons name="chatbubbles-outline" size={24} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{group.name}</Text>
                        <Text style={styles.rowMeta}>{group.members.length} members - {group.messageCount} messages</Text>
                      </View>
                      <StatusPill label={group.isActive ? "Active" : "Closed"} tone={group.isActive ? "ok" : "bad"} />
                    </View>
                    <View style={styles.memberChips}>
                      {group.members.map((member) => (
                        <Pressable
                          key={member.id}
                          testID={`travel-chat-remove-${member.travelAppUserId}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${member.user.name}`}
                          style={styles.memberChip}
                          onPress={() => void removeMember(group, member.travelAppUserId)}
                        >
                          <Text style={styles.memberChipText}>{member.user.name}</Text>
                          <Ionicons name="close" size={12} color={Colors.textTertiary} />
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.actions}>
                      <SmallButton
                        testID={`travel-chat-add-${group.id}`}
                        label="Add next user"
                        icon="person-add-outline"
                        disabled={busyId !== null}
                        onPress={() => void addFirstAvailableMember(group)}
                      />
                      <SmallButton
                        testID={`travel-chat-toggle-${group.id}`}
                        label={group.isActive ? "Close" : "Reopen"}
                        icon={group.isActive ? "archive-outline" : "refresh-outline"}
                        disabled={busyId !== null}
                        onPress={() => void toggleGroup(group)}
                      />
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {tab === "access" ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Mobile access health</Text>
                <Metric label="Travel push tokens" value={`${data.mobileAccess.activeMobileTokenCount}/${data.mobileAccess.mobileTokenCount} active`} />
                {data.mobileAccess.adminTokens.map((token) => (
                  <View key={token.id} style={styles.accessRow}>
                    <Ionicons name={token.hasPushToken ? "notifications-outline" : "notifications-off-outline"} size={20} color={token.hasPushToken ? Colors.primary : Colors.textTertiary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{token.userName || token.userId}</Text>
                      <Text style={styles.rowMeta}>{token.hasPushToken ? "Push registered" : "No push token"}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, testID, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; testID: string; keyboardType?: "default" | "email-address" | "phone-pad" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

function PrimaryButton({ label, icon, busy, disabled, onPress, testID }: { label: string; icon: keyof typeof Ionicons.glyphMap; busy?: boolean; disabled?: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={[styles.primaryButton, disabled ? styles.disabled : null]} onPress={onPress}>
      {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={icon} size={17} color="#fff" />}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, icon, disabled, onPress, testID }: { label: string; icon: keyof typeof Ionicons.glyphMap; disabled?: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} style={[styles.smallButton, disabled ? styles.disabled : null]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "bad" }) {
  return <View style={[styles.statusPill, tone === "ok" ? styles.statusOk : tone === "warn" ? styles.statusWarn : styles.statusBad]}><Text style={styles.statusText}>{label}</Text></View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  iconButton: { width: 38, height: 38, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  segmentRail: { flexDirection: "row", gap: Spacing.xs, marginHorizontal: Spacing.lg, padding: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.lg },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: BorderRadius.md },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textInverse },
  content: { padding: Spacing.lg, gap: Spacing.md },
  centered: { paddingTop: Spacing.xxl, alignItems: "center" },
  panel: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, gap: Spacing.md },
  panelTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  field: { gap: 6 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  input: { minHeight: 44, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderSubtle, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, fontSize: FontSize.sm, color: Colors.text },
  primaryButton: { minHeight: 46, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: Spacing.xs },
  primaryButtonText: { color: Colors.textInverse, fontSize: FontSize.sm, fontWeight: "900" },
  row: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, gap: Spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  smallButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primaryLight },
  smallButtonText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  disabled: { opacity: 0.45 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusOk: { backgroundColor: "#dcfce7" },
  statusWarn: { backgroundColor: "#fef3c7" },
  statusBad: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 10, fontWeight: "900", color: Colors.text },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderSubtle },
  memberChipText: { fontSize: FontSize.xs, fontWeight: "800", color: Colors.textSecondary },
  metric: { padding: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md },
  metricValue: { marginTop: 4, fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  accessRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderSubtle },
  errorCard: { borderRadius: BorderRadius.md, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3", padding: Spacing.sm, flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
});

