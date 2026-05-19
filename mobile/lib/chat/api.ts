const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export type ChatRole = "ADMIN" | "OPERATIONS" | "TOURIST" | "COMPANION";

export interface ChatGroupDetail {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  tourPackageQueryId: string | null;
  tourStartDate: string | null;
  tourEndDate: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LatestPinnedAnnouncement {
  id: string;
  content: string | null;
  messageType: string;
  isAnnouncement: boolean;
  isImportant: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  sender: { id: string; name: string } | null;
}

export interface ChatGroupListItem extends ChatGroupDetail {
  myRole: ChatRole | null;
  members: { id: string; travelAppUser: { name: string } }[];
  lastMessage: {
    id: string;
    content: string | null;
    messageType: string;
    createdAt: string;
    sender: { name: string } | null;
  } | null;
  unreadCount: number;
  notificationsMuted: boolean;
  latestPinnedAnnouncement: LatestPinnedAnnouncement | null;
}

export interface GroupMember {
  id: string;
  role: ChatRole;
  isActive: boolean;
  notificationsMuted?: boolean;
  travelAppUser: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    isApproved: boolean;
  };
}

export interface ChatGroupInvite {
  id: string;
  invitedName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
  role: ChatRole;
  status: "PENDING" | "ACCEPTED" | "CANCELLED";
  createdAt: string;
}

export interface GroupMemberSummary {
  group: ChatGroupDetail | null;
  members: GroupMember[];
  pendingInvites: ChatGroupInvite[];
  myRole: ChatRole;
  notificationsMuted: boolean;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isApproved: boolean;
}

export interface EditResult {
  id: string;
  content: string;
  editedAt: string;
}

export async function fetchGroupDetail(opts: {
  groupId: string;
  getToken: () => Promise<string | null>;
}): Promise<{
  group: ChatGroupDetail;
  myRole: ChatRole;
  notificationsMuted?: boolean;
  unreadCount?: number;
  latestPinnedAnnouncement?: LatestPinnedAnnouncement | null;
}> {
  const token = await opts.getToken();
  const res = await fetch(`${API_BASE_URL}/api/chat/groups/${opts.groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Load group failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as { group: ChatGroupDetail; myRole: ChatRole };
}

export async function fetchChatGroups(opts: {
  getToken: () => Promise<string | null>;
}): Promise<ChatGroupListItem[]> {
  const token = await opts.getToken();
  const res = await fetch(`${API_BASE_URL}/api/chat/groups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data.groups ?? []) as ChatGroupListItem[];
}

export async function findChatGroupByTrip(opts: {
  tourPackageQueryId: string;
  getToken: () => Promise<string | null>;
}): Promise<ChatGroupListItem | null> {
  const groups = await fetchChatGroups({ getToken: opts.getToken });
  return groups.find((g) => g.tourPackageQueryId === opts.tourPackageQueryId) ?? null;
}

export async function createChatGroup(opts: {
  name: string;
  description?: string | null;
  tourPackageQueryId?: string | null;
  tourStartDate?: string | null;
  tourEndDate?: string | null;
  memberIds?: Array<{ userId: string; role: ChatRole }>;
  getToken: () => Promise<string | null>;
}): Promise<ChatGroupDetail> {
  const token = await opts.getToken();
  const res = await fetch(`${API_BASE_URL}/api/chat/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: opts.name,
      description: opts.description ?? null,
      tourPackageQueryId: opts.tourPackageQueryId ?? null,
      tourStartDate: opts.tourStartDate ?? null,
      tourEndDate: opts.tourEndDate ?? null,
      memberIds: opts.memberIds ?? [],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create group failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as ChatGroupDetail;
}

export async function updateGroup(opts: {
  groupId: string;
  patch: Partial<{
    name: string;
    description: string | null;
    imageUrl: string | null;
    tourPackageQueryId: string | null;
    tourStartDate: string | null;
    tourEndDate: string | null;
    isActive: boolean;
  }>;
  getToken: () => Promise<string | null>;
}): Promise<ChatGroupDetail> {
  const token = await opts.getToken();
  const res = await fetch(`${API_BASE_URL}/api/chat/groups/${opts.groupId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opts.patch),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update group failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.group as ChatGroupDetail;
}

export async function fetchGroupMembers(opts: {
  groupId: string;
  getToken: () => Promise<string | null>;
}): Promise<GroupMember[]> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.members ?? []) as GroupMember[];
}

export async function fetchGroupMemberSummary(opts: {
  groupId: string;
  getToken: () => Promise<string | null>;
}): Promise<GroupMemberSummary> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    return {
      group: null,
      members: [],
      pendingInvites: [],
      myRole: "TOURIST",
      notificationsMuted: false,
    };
  }
  const data = await res.json();
  return {
    group: data.group ?? null,
    members: (data.members ?? []) as GroupMember[],
    pendingInvites: (data.pendingInvites ?? []) as ChatGroupInvite[],
    myRole: (data.myRole ?? "TOURIST") as ChatRole,
    notificationsMuted: !!data.notificationsMuted,
  };
}

export async function addGroupMember(opts: {
  groupId: string;
  travelAppUserId: string;
  role: ChatRole;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        travelAppUserId: opts.travelAppUserId,
        role: opts.role,
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Add member failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function inviteGroupMember(opts: {
  groupId: string;
  invitedName: string;
  invitedEmail?: string | null;
  invitedPhone?: string | null;
  role: ChatRole;
  getToken: () => Promise<string | null>;
}): Promise<ChatGroupInvite> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        invitedName: opts.invitedName,
        invitedEmail: opts.invitedEmail ?? null,
        invitedPhone: opts.invitedPhone ?? null,
        role: opts.role,
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Invite member failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.invite as ChatGroupInvite;
}

export async function cancelGroupInvite(opts: {
  groupId: string;
  inviteId: string;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members?inviteId=${encodeURIComponent(
      opts.inviteId
    )}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cancel invite failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function setGroupNotificationsMuted(opts: {
  groupId: string;
  notificationsMuted: boolean;
  getToken: () => Promise<string | null>;
}): Promise<boolean> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members/me/notifications`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notificationsMuted: opts.notificationsMuted }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Notification update failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  return !!data.member?.notificationsMuted;
}

export async function removeGroupMember(opts: {
  groupId: string;
  travelAppUserId: string;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members?memberId=${encodeURIComponent(
      opts.travelAppUserId
    )}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Remove member failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function leaveGroup(opts: {
  groupId: string;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  // The DELETE /members route now allows self-leave when memberId === own travel user id.
  // Omitting memberId param defaults to the caller's own id server-side.
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Leave group failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function changeMemberRole(opts: {
  groupId: string;
  travelAppUserId: string;
  role: ChatRole;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/members/${encodeURIComponent(
      opts.travelAppUserId
    )}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: opts.role }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Change role failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function searchTravelUsers(opts: {
  groupId: string;
  query: string;
  getToken: () => Promise<string | null>;
}): Promise<UserSearchResult[]> {
  if (opts.query.trim().length < 2) return [];
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/mobile/users/search?groupId=${encodeURIComponent(
      opts.groupId
    )}&q=${encodeURIComponent(opts.query.trim())}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []) as UserSearchResult[];
}

export async function editMessage(opts: {
  groupId: string;
  messageId: string;
  content: string;
  getToken: () => Promise<string | null>;
}): Promise<EditResult> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/messages/${opts.messageId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: opts.content }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edit failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as EditResult;
}

export async function deleteMessage(opts: {
  groupId: string;
  messageId: string;
  getToken: () => Promise<string | null>;
}): Promise<void> {
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/messages/${opts.messageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Delete failed: HTTP ${res.status} ${txt.slice(0, 200)}`);
  }
}

export async function markMessagesRead(opts: {
  groupId: string;
  messageIds: string[];
  getToken: () => Promise<string | null>;
}): Promise<number> {
  if (opts.messageIds.length === 0) return 0;
  const token = await opts.getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/chat/groups/${opts.groupId}/messages/read`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messageIds: opts.messageIds }),
    }
  );
  if (!res.ok) return 0;
  const data = await res.json().catch(() => ({}));
  return typeof data.marked === "number" ? data.marked : 0;
}
