import whatsappPrisma from "@/lib/whatsapp-prismadb";
import { z } from "zod";
import { McpError, NotFoundError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Meta WhatsApp API helper ─────────────────────────────────────────────────

const WHATSAPP_API_VERSION = "v21.0";

async function callWhatsAppApi(endpoint: string, body: Record<string, unknown>) {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new McpError("WhatsApp API credentials not configured", "WHATSAPP_NOT_CONFIGURED", 500);
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new McpError(
      `WhatsApp API error: ${data?.error?.message ?? response.statusText}`,
      "WHATSAPP_API_ERROR",
      response.status,
      data?.error
    );
  }

  return data;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const SendWhatsAppMessageSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
});

const SendWhatsAppTemplateSchema = z.object({
  to: z.string().min(1),
  templateName: z.string().min(1),
  languageCode: z.string().optional().default("en_US"),
  variables: z.array(z.string()).optional(),
});

const ListWhatsAppCampaignsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const GetWhatsAppCampaignSchema = z.object({
  campaignId: z.string().min(1),
});

const ListWhatsAppCustomersSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListWhatsAppTemplatesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(rawParams: unknown) {
  const { to, message } = SendWhatsAppMessageSchema.parse(rawParams);

  // Send via Meta API
  const apiResponse = await callWhatsAppApi("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: message },
  });

  // Store in DB
  const messageId = apiResponse?.messages?.[0]?.id ?? null;
  const dbMessage = await whatsappPrisma.whatsAppMessage.create({
    data: {
      to,
      message,
      direction: "outbound",
      status: "sent",
      messageSid: messageId,
      sentAt: new Date(),
    },
  });

  return {
    success: true,
    messageId: dbMessage.id,
    whatsappMessageId: messageId,
    to,
  };
}

async function sendWhatsAppTemplate(rawParams: unknown) {
  const { to, templateName, languageCode, variables } = SendWhatsAppTemplateSchema.parse(rawParams);

  // Build template components
  const components: Record<string, unknown>[] = [];
  if (variables && variables.length > 0) {
    components.push({
      type: "body",
      parameters: variables.map((v) => ({ type: "text", text: v })),
    });
  }

  const apiResponse = await callWhatsAppApi("messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 && { components }),
    },
  });

  const messageId = apiResponse?.messages?.[0]?.id ?? null;

  // Store in DB
  const dbMessage = await whatsappPrisma.whatsAppMessage.create({
    data: {
      to,
      message: `[Template: ${templateName}]`,
      direction: "outbound",
      status: "sent",
      messageSid: messageId,
      sentAt: new Date(),
      metadata: { templateName, languageCode, variables },
    },
  });

  return {
    success: true,
    messageId: dbMessage.id,
    whatsappMessageId: messageId,
    to,
    templateName,
  };
}

async function listWhatsAppCampaigns(rawParams: unknown) {
  const { status, limit } = ListWhatsAppCampaignsSchema.parse(rawParams);
  return whatsappPrisma.whatsAppCampaign.findMany({
    where: {
      ...(status && { status }),
    },
    select: {
      id: true, name: true, description: true, templateName: true,
      status: true, scheduledFor: true, startedAt: true, completedAt: true,
      totalRecipients: true, sentCount: true, deliveredCount: true,
      readCount: true, failedCount: true, respondedCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getWhatsAppCampaign(rawParams: unknown) {
  const { campaignId } = GetWhatsAppCampaignSchema.parse(rawParams);
  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        select: {
          id: true, phoneNumber: true, name: true, status: true,
          sentAt: true, deliveredAt: true, readAt: true, failedAt: true,
          errorMessage: true, respondedAt: true, responseMessage: true,
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!campaign) throw new NotFoundError(`Campaign ${campaignId} not found`);
  return campaign;
}

async function listWhatsAppCustomers(rawParams: unknown) {
  const { name, phoneNumber, tag, limit } = ListWhatsAppCustomersSchema.parse(rawParams);
  return whatsappPrisma.whatsAppCustomer.findMany({
    where: {
      ...(name && {
        OR: [
          { firstName: { contains: name, mode: "insensitive" as const } },
          { lastName: { contains: name, mode: "insensitive" as const } },
        ],
      }),
      ...(phoneNumber && { phoneNumber: { contains: phoneNumber } }),
      ...(tag && { tags: { has: tag } }),
    },
    select: {
      id: true, firstName: true, lastName: true, phoneNumber: true,
      email: true, tags: true, isOptedIn: true, lastContactedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function listWhatsAppTemplates(rawParams: unknown) {
  const { limit } = ListWhatsAppTemplatesSchema.parse(rawParams);
  return whatsappPrisma.whatsAppTemplate.findMany({
    select: {
      id: true, name: true, body: true, components: true,
      variables: true, createdAt: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const whatsappHandlers: ToolHandlerMap = {
  send_whatsapp_message: sendWhatsAppMessage,
  send_whatsapp_template: sendWhatsAppTemplate,
  list_whatsapp_campaigns: listWhatsAppCampaigns,
  get_whatsapp_campaign: getWhatsAppCampaign,
  list_whatsapp_customers: listWhatsAppCustomers,
  list_whatsapp_templates: listWhatsAppTemplates,
};
