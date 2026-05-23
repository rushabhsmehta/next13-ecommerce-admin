// Lightweight Expo push helper — talks to https://exp.host/--/api/v2/push/send
// directly so we don't pull in expo-server-sdk as a server dependency.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

import prismadb from "@/lib/prismadb";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_PER_BATCH = 100;

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoTicketError {
  status: "error";
  message: string;
  details?: { error?: string };
}

interface ExpoTicketOk {
  status: "ok";
  id: string;
}

type ExpoTicket = ExpoTicketOk | ExpoTicketError;

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<ExpoTicket[]> {
  const valid = messages.filter((m) => isExpoToken(m.to));
  if (valid.length === 0) return [];

  const tickets: ExpoTicket[] = [];

  for (const batch of chunk(valid, MAX_PER_BATCH)) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
          "content-type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error("[EXPO_PUSH] HTTP", res.status, await res.text().catch(() => ""));
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      if (Array.isArray(json.data)) tickets.push(...json.data);
    } catch (err) {
      console.error("[EXPO_PUSH] send failed", err);
    }
  }

  // Deactivate any tokens Expo reports as invalid so we don't keep retrying them.
  const invalidIndexes: number[] = [];
  tickets.forEach((t, i) => {
    if (
      t.status === "error" &&
      (t.details?.error === "DeviceNotRegistered" || t.details?.error === "InvalidCredentials")
    ) {
      invalidIndexes.push(i);
    }
  });
  if (invalidIndexes.length > 0) {
    const badTokens = invalidIndexes.map((i) => valid[i]?.to).filter(Boolean);
    if (badTokens.length > 0) {
      // Both `MobilePushToken` (travel app users) and `AdminMobileToken`
      // (Clerk admins) can hold the same token if a device switches roles, so
      // clear both. The queries are no-ops when a token isn't found.
      try {
        await prismadb.mobilePushToken.updateMany({
          where: { expoPushToken: { in: badTokens } },
          data: { isActive: false },
        });
      } catch (err) {
        console.error("[EXPO_PUSH] failed to deactivate stale travel tokens", err);
      }
      try {
        await prismadb.adminMobileToken.updateMany({
          where: { pushToken: { in: badTokens } },
          data: { pushToken: null },
        });
      } catch (err) {
        console.error("[EXPO_PUSH] failed to clear stale admin tokens", err);
      }
    }
  }

  return tickets;
}

export interface ChatPushPayload {
  groupId: string;
  messageId: string;
  senderName: string;
  groupName: string;
  preview: string;
}

export async function sendChatMessagePush(opts: {
  groupId: string;
  excludeTravelAppUserId: string;
  payload: ChatPushPayload;
}): Promise<void> {
  const { groupId, excludeTravelAppUserId, payload } = opts;

  // Recipients: active members of this group (not muted), except the sender.
  const tokens = await prismadb.mobilePushToken.findMany({
    where: {
      isActive: true,
      travelAppUserId: { not: excludeTravelAppUserId },
      travelAppUser: {
        chatMemberships: {
          some: {
            chatGroupId: groupId,
            isActive: true,
            notificationsMuted: false,
          },
        },
      },
    },
    select: { expoPushToken: true },
  });

  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.expoPushToken,
    title: payload.groupName,
    body: payload.preview ? `${payload.senderName}: ${payload.preview}` : payload.senderName,
    data: {
      type: "chat_message",
      groupId: payload.groupId,
      messageId: payload.messageId,
    },
    sound: "default",
    channelId: "chat-messages",
  }));

  await sendExpoPushBatch(messages);
}

export interface WhatsAppInboundPushPayload {
  phone: string;
  senderName: string;
  preview: string;
  messageId?: string;
  messageSid?: string;
}

/**
 * Fan-out an Expo push to every admin device that has a registered token.
 * Used by the WhatsApp webhook to wake mobile admins when a customer sends
 * an inbound message. Fire-and-forget — never block the webhook on this.
 */
export async function sendWhatsAppInboundPush(
  payload: WhatsAppInboundPushPayload,
): Promise<void> {
  const admins = await prismadb.adminMobileToken.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });
  const tokens = admins
    .map((a) => a.pushToken)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title: `WhatsApp · ${payload.senderName}`,
    body: payload.preview || "(media)",
    data: {
      type: "whatsapp_message",
      phone: payload.phone,
      messageId: payload.messageId,
      messageSid: payload.messageSid,
    },
    sound: "default",
    channelId: "whatsapp",
  }));

  await sendExpoPushBatch(messages);
}
