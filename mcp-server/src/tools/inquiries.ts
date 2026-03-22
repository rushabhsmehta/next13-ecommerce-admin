import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";
import { SHARED_TOOL_CONTRACT_OVERRIDES } from "../contracts/overrides.js";

const unassignInquiryStaffContract = SHARED_TOOL_CONTRACT_OVERRIDES.unassign_inquiry_staff;
const setInquiryFollowUpContract = SHARED_TOOL_CONTRACT_OVERRIDES.set_inquiry_follow_up;
const updateInquiryContract = SHARED_TOOL_CONTRACT_OVERRIDES.update_inquiry;
const listFollowUpsDueContract = SHARED_TOOL_CONTRACT_OVERRIDES.list_follow_ups_due;

export function registerInquiryTools(server: McpServer) {
  server.tool(
    "create_inquiry",
    `Create a new customer travel inquiry.
    You can provide locationName (e.g. 'Goa') instead of locationId and it will be resolved automatically.
    journeyDate must be an ISO date string like '2026-04-15'.
    Example: "Create inquiry for Rahul Sharma, 9876543210, wants to go to Goa on April 15 with 2 adults"`,
    {
      customerName: z.string().describe("Full name of the customer"),
      customerMobileNumber: z.string().describe("Customer mobile number (10 digits)"),
      locationId: z.string().optional().describe("Location/destination ID (from search_locations)"),
      locationName: z.string().optional().describe("Location name if ID is unknown (e.g. 'Goa')"),
      numAdults: z.number().int().min(1).describe("Number of adults"),
      numChildrenAbove11: z.number().int().min(0).optional().default(0).describe("Children above 11 years"),
      numChildren5to11: z.number().int().min(0).optional().default(0).describe("Children 5-11 years"),
      numChildrenBelow5: z.number().int().min(0).optional().default(0).describe("Children below 5 years"),
      journeyDate: z.string().describe("Planned travel date (ISO format: YYYY-MM-DD)"),
      remarks: z.string().optional().describe("Additional notes or requirements"),
      status: z.string().optional().default("PENDING").describe("Inquiry status (default: PENDING)"),
    },
    async (params) => {
      try {
        const data = await callTool("create_inquiry", params);
        return {
          content: [{ type: "text", text: `Inquiry created successfully!\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_inquiry", err);
      }
    }
  );

  server.tool(
    "list_inquiries",
    "List or search customer inquiries. ALWAYS use this first when asked about a customer's inquiry - search by customerName (partial name works, e.g. 'Sheetal'). Do NOT ask the user for an inquiry ID; find it yourself using this tool.",
    {
      status: z.string().optional().describe("Filter by status: PENDING, CONFIRMED, CANCELLED, HOT_QUERY, QUERY_SENT, ALL"),
      customerName: z.string().optional().describe("Search by customer name (partial match works, e.g. 'Sheetal' will find 'Sheetal Sharma')"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async ({ status, customerName, limit }) => {
      try {
        const data = await callTool("list_inquiries", { status, customerName, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_inquiries", err);
      }
    }
  );

  server.tool(
    "get_inquiry",
    "Get full details of a specific inquiry including actions/notes and linked tour queries. Use list_inquiries first to find the inquiryId if you only have the customer name.",
    {
      inquiryId: z.string().describe("The inquiry ID to retrieve (use list_inquiries to find it by customer name if unknown)"),
    },
    async ({ inquiryId }) => {
      try {
        const data = await callTool("get_inquiry", { inquiryId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_inquiry", err);
      }
    }
  );

  server.tool(
    "update_inquiry_status",
    "Update the status of an inquiry. Valid statuses: PENDING, CONFIRMED, CANCELLED, HOT_QUERY, QUERY_SENT.",
    {
      inquiryId: z.string().describe("The inquiry ID to update"),
      status: z
        .enum(["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"])
        .describe("New status for the inquiry"),
      remarks: z.string().optional().describe("Optional remarks/reason for the status change"),
    },
    async ({ inquiryId, status, remarks }) => {
      try {
        const data = await callTool("update_inquiry_status", { inquiryId, status, remarks });
        return {
          content: [{ type: "text", text: `Status updated to ${status}\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("update_inquiry_status", err);
      }
    }
  );

  server.tool(
    "add_inquiry_note",
    "Add a follow-up note or action log to an inquiry.",
    {
      inquiryId: z.string().describe("The inquiry ID"),
      note: z.string().describe("The note content to add"),
      actionType: z
        .string()
        .optional()
        .default("NOTE")
        .describe("Type of action: NOTE, CALL, EMAIL, WHATSAPP, MEETING"),
    },
    async ({ inquiryId, note, actionType }) => {
      try {
        const data = await callTool("add_inquiry_note", { inquiryId, note, actionType });
        return {
          content: [{ type: "text", text: `Note added to inquiry\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("add_inquiry_note", err);
      }
    }
  );

  server.tool(
    "assign_inquiry_staff",
    "Assign an operational staff member to an inquiry for follow-up.",
    {
      inquiryId: z.string().describe("The inquiry ID"),
      staffId: z.string().describe("The operational staff member ID (use list_operational_staff to find it)"),
    },
    async (params) => {
      try {
        const data = await callTool("assign_inquiry_staff", params);
        return {
          content: [{ type: "text", text: `Staff assigned to inquiry\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("assign_inquiry_staff", err);
      }
    }
  );

  server.tool(
    unassignInquiryStaffContract.name,
    unassignInquiryStaffContract.description,
    unassignInquiryStaffContract.inputSchema,
    async (params: Record<string, unknown>) => {
      try {
        const data = await callTool(unassignInquiryStaffContract.name, params);
        return {
          content: [{ type: "text", text: `Staff unassigned from inquiry\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError(unassignInquiryStaffContract.name, err);
      }
    }
  );

  server.tool(
    setInquiryFollowUpContract.name,
    setInquiryFollowUpContract.description,
    setInquiryFollowUpContract.inputSchema,
    async (params: Record<string, unknown>) => {
      try {
        const data = await callTool(setInquiryFollowUpContract.name, params);
        return {
          content: [{ type: "text", text: `Follow-up date set\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError(setInquiryFollowUpContract.name, err);
      }
    }
  );

  server.tool(
    "get_inquiry_actions",
    "Get the complete action/note history for an inquiry.",
    {
      inquiryId: z.string().describe("The inquiry ID"),
    },
    async ({ inquiryId }) => {
      try {
        const data = await callTool("get_inquiry_actions", { inquiryId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_inquiry_actions", err);
      }
    }
  );

  server.tool(
    updateInquiryContract.name,
    updateInquiryContract.description,
    updateInquiryContract.inputSchema,
    async (params: Record<string, unknown>) => {
      try {
        const data = await callTool(updateInquiryContract.name, params);
        return {
          content: [{ type: "text", text: `Inquiry updated\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError(updateInquiryContract.name, err);
      }
    }
  );

  server.tool(
    "delete_inquiry",
    "Delete an inquiry. Will fail if the inquiry has linked tour queries.",
    {
      inquiryId: z.string().describe("The inquiry ID to delete"),
    },
    async ({ inquiryId }) => {
      try {
        const data = await callTool("delete_inquiry", { inquiryId });
        return {
          content: [{ type: "text", text: `Inquiry deleted\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("delete_inquiry", err);
      }
    }
  );

  server.tool(
    listFollowUpsDueContract.name,
    listFollowUpsDueContract.description,
    listFollowUpsDueContract.inputSchema,
    async (params: Record<string, unknown>) => {
      try {
        const data = await callTool(listFollowUpsDueContract.name, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError(listFollowUpsDueContract.name, err);
      }
    }
  );

  server.tool(
    "get_inquiry_summary",
    "Get aggregate inquiry statistics broken down by status.",
    {},
    async () => {
      try {
        const data = await callTool("get_inquiry_summary", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_inquiry_summary", err);
      }
    }
  );
}