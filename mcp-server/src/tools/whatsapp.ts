import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerWhatsappTools(server: McpServer) {
  server.tool(
    "send_whatsapp_message",
    "Send a WhatsApp text message to a phone number via the Meta WhatsApp Business API.",
    {
      phoneNumber: z.string().describe("Recipient phone number (with country code, e.g. '919876543210')"),
      message: z.string().describe("Text message content to send"),
    },
    async (params) => {
      try {
        const data = await callTool("send_whatsapp_message", params);
        return {
          content: [{ type: "text", text: `WhatsApp message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_message", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_template",
    "Send a WhatsApp template message to a phone number.",
    {
      phoneNumber: z.string().describe("Recipient phone number (with country code)"),
      templateName: z.string().describe("Template name (use list_whatsapp_templates to find available templates)"),
      languageCode: z.string().optional().default("en").describe("Template language code (default: 'en')"),
      parameters: z.array(z.string()).optional().describe("Template parameter values in order"),
    },
    async (params) => {
      try {
        const data = await callTool("send_whatsapp_template", params);
        return {
          content: [{ type: "text", text: `WhatsApp template message sent\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_template", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_campaigns",
    "List WhatsApp marketing campaigns.",
    {
      status: z.string().optional().describe("Filter by campaign status"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_campaigns", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_campaigns", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_campaign_stats",
    "Get delivery statistics for a WhatsApp campaign.",
    {
      campaignId: z.string().describe("The campaign ID"),
    },
    async ({ campaignId }) => {
      try {
        const data = await callTool("get_whatsapp_campaign_stats", { campaignId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_campaign_stats", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_customers",
    "List WhatsApp customers/contacts.",
    {
      name: z.string().optional().describe("Search by customer name"),
      phoneNumber: z.string().optional().describe("Search by phone number"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_customers", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_customers", err);
      }
    }
  );

  server.tool(
    "create_whatsapp_customer",
    "Add a new WhatsApp customer/contact.",
    {
      name: z.string().describe("Customer name"),
      phoneNumber: z.string().describe("Phone number with country code (e.g. '919876543210')"),
      email: z.string().optional().describe("Email address"),
    },
    async (params) => {
      try {
        const data = await callTool("create_whatsapp_customer", params);
        return {
          content: [{ type: "text", text: `WhatsApp customer created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_whatsapp_customer", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_templates",
    "List available WhatsApp message templates.",
    {
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_templates", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_templates", err);
      }
    }
  );

  server.tool(
    "list_whatsapp_messages",
    "Get WhatsApp message history.",
    {
      phoneNumber: z.string().optional().describe("Filter by phone number"),
      direction: z.enum(["inbound", "outbound"]).optional().describe("Filter by message direction"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_whatsapp_messages", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_whatsapp_messages", err);
      }
    }
  );

  server.tool(
    "send_whatsapp_campaign",
    "Trigger sending a WhatsApp campaign to its recipients.",
    {
      campaignId: z.string().describe("The campaign ID to send"),
    },
    async ({ campaignId }) => {
      try {
        const data = await callTool("send_whatsapp_campaign", { campaignId });
        return {
          content: [{ type: "text", text: `WhatsApp campaign triggered\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("send_whatsapp_campaign", err);
      }
    }
  );

  server.tool(
    "get_whatsapp_database_health",
    "Check WhatsApp database connection health.",
    {},
    async () => {
      try {
        const data = await callTool("get_whatsapp_database_health", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_whatsapp_database_health", err);
      }
    }
  );
}
