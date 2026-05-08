import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import type { ChatRole, GroupMember } from "@/lib/chat/api";

interface Props {
  members: GroupMember[];
  myUserId: string | null;
  canManage: boolean;
  canChangeRoles: boolean;
  onPressMember: (m: GroupMember) => void;
}

const ROLE_LABEL: Record<ChatRole, string> = {
  ADMIN: "Admin",
  OPERATIONS: "Ops",
  TOURIST: "Tourist",
  COMPANION: "Companion",
};

const ROLE_COLOR: Record<ChatRole, string> = {
  ADMIN: "#7C3AED",
  OPERATIONS: "#0EA5E9",
  TOURIST: "#10B981",
  COMPANION: "#F59E0B",
};

export function MemberList({ members, myUserId, canManage, canChangeRoles, onPressMember }: Props) {
  return (
    <View>
      {members.map((m) => {
        const isMe = m.travelAppUser.id === myUserId;
        const tappable = canManage && !isMe;
        const showChevron = (canChangeRoles && !isMe) || (canManage && !isMe);
        return (
          <TouchableOpacity
            key={m.id}
            style={styles.row}
            onPress={() => tappable && onPressMember(m)}
            disabled={!tappable}
            activeOpacity={0.6}
            accessibilityRole={tappable ? "button" : undefined}
            accessibilityLabel={`Member ${m.travelAppUser.name}, role ${ROLE_LABEL[m.role]}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {m.travelAppUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {m.travelAppUser.name}
                {isMe ? " (you)" : ""}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {m.travelAppUser.email}
              </Text>
            </View>
            <View style={[styles.roleChip, { backgroundColor: ROLE_COLOR[m.role] + "22" }]}>
              <Text style={[styles.roleText, { color: ROLE_COLOR[m.role] }]}>
                {ROLE_LABEL[m.role]}
              </Text>
            </View>
            {!m.travelAppUser.isApproved && (
              <View style={styles.pendingChip}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            )}
            {showChevron && (
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  name: { fontSize: 15, fontWeight: "600", color: Colors.text },
  email: { fontSize: 12, color: Colors.textTertiary },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: { fontSize: 11, fontWeight: "700" },
  pendingChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#FEF3C7",
  },
  pendingText: { fontSize: 10, fontWeight: "700", color: "#92400E" },
});
