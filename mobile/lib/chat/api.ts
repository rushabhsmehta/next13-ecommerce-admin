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

export interface GroupMember {
  id: string;
  role: ChatRole;
  isActive: boolean;
  travelAppUser: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    isApproved: boolean;
  };
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
}): Promise<{ group: ChatGroupDetail; myRole: ChatRole }> {
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
