import { API_BASE_URL } from "@/constants/api";
import { getAdminApiToken } from "@/lib/clerk-token-provider";

async function authHeaders() {
  const token = await getAdminApiToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

export interface Conversation {
  phone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastDirection: string;
  unreadCount: number;
  lastOutboundAt: string | null;
}

export interface WaMessage {
  id: string;
  message: string | null;
  direction: "inbound" | "outbound";
  status: string;
  from: string | null;
  to: string | null;
  createdAt: string;
  metadata: Record<string, any> | null;
  whatsappCustomer: {
    id: string;
    firstName: string;
    lastName: string | null;
    phoneNumber: string;
  } | null;
}

export interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: any;
  qualityScore: string | null;
}

export interface WindowStatus {
  canSendFreeForm: boolean;
  lastInboundAt?: string;
  windowExpiresAt?: string;
}

export const whatsappApi = {
  getConversations: (): Promise<Conversation[]> =>
    get("/api/mobile/whatsapp/conversations"),

  getMessages: (phone: string, cursor?: string): Promise<{ messages: WaMessage[]; nextCursor: string | null }> => {
    const qs = new URLSearchParams({ phone });
    if (cursor) qs.set("cursor", cursor);
    return get(`/api/mobile/whatsapp/messages?${qs}`);
  },

  sendText: (phone: string, message: string) =>
    post("/api/mobile/whatsapp/send", { type: "text", phone, message }),

  sendTemplate: (phone: string, templateName: string, parameters: string[]) =>
    post("/api/mobile/whatsapp/send", {
      type: "template",
      phone,
      templateName,
      parameters,
    }),

  sendMedia: (
    phone: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "audio" | "document",
    caption?: string
  ) =>
    post("/api/mobile/whatsapp/send", {
      type: mediaType,
      phone,
      mediaUrl,
      mediaType,
      caption,
    }),

  getTemplates: (): Promise<Template[]> => get("/api/mobile/whatsapp/templates"),

  checkWindow: (phone: string): Promise<WindowStatus> => {
    const qs = new URLSearchParams({ phone });
    return get(`/api/mobile/whatsapp/window?${qs}`);
  },

  uploadMedia: async (
    fileUri: string,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; publicId: string; type: string }> => {
    const token = await getAdminApiToken();
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
};
