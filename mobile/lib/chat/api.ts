const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export interface EditResult {
  id: string;
  content: string;
  editedAt: string;
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
