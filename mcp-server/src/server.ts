import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool } from "./api-client.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "travel-admin",
    version: "1.0.0",
  });

  // ── Locations ───────────────────────────────────────────────────────────────

  server.tool(
    "search_locations",
    "Search travel destinations/locations by name. Use this first to find location IDs before creating inquiries or queries.",
    {
      query: z.string().describe("Destination name to search (e.g. 'Goa', 'Kerala', 'Maldives')"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Max results to return"),
    },
    async ({ query, limit }) => {
      const data = await callTool("search_locations", { query, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── Tour Packages ───────────────────────────────────────────────────────────

  server.tool(
    "list_tour_packages",
    "Browse available tour packages. Filter by destination or category.",
    {
      locationId: z.string().optional().describe("Filter by location ID (from search_locations)"),
      tourCategory: z.enum(["Domestic", "International"]).optional().describe("Filter by tour category"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, tourCategory, limit }) => {
      const data = await callTool("list_tour_packages", { locationId, tourCategory, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── Hotels ──────────────────────────────────────────────────────────────────

  server.tool(
    "list_hotels",
    "Browse hotels available in the system, optionally filtered by location or name.",
    {
      locationId: z.string().optional().describe("Filter by location ID"),
      name: z.string().optional().describe("Search by hotel name"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, name, limit }) => {
      const data = await callTool("list_hotels", { locationId, name, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── Inquiries ───────────────────────────────────────────────────────────────

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
      status: z.string().optional().default("NEW").describe("Inquiry status (default: NEW)"),
    },
    async (params) => {
      const data = await callTool("create_inquiry", params);
      return {
        content: [
          {
            type: "text",
            text: `✅ Inquiry created successfully!\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "list_inquiries",
    "List customer inquiries with optional filters. Shows recent inquiries by default.",
    {
      status: z.string().optional().describe("Filter by status: NEW, ACTIVE, CONFIRMED, CANCELLED, ALL"),
      customerName: z.string().optional().describe("Search by customer name"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async ({ status, customerName, limit }) => {
      const data = await callTool("list_inquiries", { status, customerName, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.tool(
    "get_inquiry",
    "Get full details of a specific inquiry including actions/notes and linked tour queries.",
    {
      inquiryId: z.string().describe("The inquiry ID to retrieve"),
    },
    async ({ inquiryId }) => {
      const data = await callTool("get_inquiry", { inquiryId });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.tool(
    "update_inquiry_status",
    "Update the status of an inquiry. Valid statuses: NEW, ACTIVE, CONFIRMED, CANCELLED.",
    {
      inquiryId: z.string().describe("The inquiry ID to update"),
      status: z
        .enum(["NEW", "ACTIVE", "CONFIRMED", "CANCELLED", "FOLLOW_UP"])
        .describe("New status for the inquiry"),
      remarks: z.string().optional().describe("Optional remarks/reason for the status change"),
    },
    async ({ inquiryId, status, remarks }) => {
      const data = await callTool("update_inquiry_status", { inquiryId, status, remarks });
      return {
        content: [
          {
            type: "text",
            text: `✅ Status updated to ${status}\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
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
      const data = await callTool("add_inquiry_note", { inquiryId, note, actionType });
      return {
        content: [
          {
            type: "text",
            text: `✅ Note added to inquiry\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    }
  );

  // ── Tour Queries (Quotes) ───────────────────────────────────────────────────

  server.tool(
    "create_tour_query",
    `Create a new tour package query (quote) for a customer.
    A tour query is a detailed quote/itinerary proposal for a customer.
    You can link it to an existing inquiry via inquiryId.
    Use locationName if you don't have the locationId.`,
    {
      customerName: z.string().describe("Customer name"),
      customerNumber: z.string().optional().describe("Customer phone number"),
      locationId: z.string().optional().describe("Location ID (from search_locations)"),
      locationName: z.string().optional().describe("Location name if ID unknown (e.g. 'Goa')"),
      numDaysNight: z.string().optional().describe("Duration e.g. '4 Nights / 5 Days'"),
      tourCategory: z.enum(["Domestic", "International"]).optional().default("Domestic"),
      tourPackageQueryType: z.string().optional().describe("Tour type e.g. 'Honeymoon', 'Family', 'Adventure'"),
      numAdults: z.string().optional().describe("Number of adults as string"),
      numChild5to12: z.string().optional().describe("Children 5-12 years"),
      numChild0to5: z.string().optional().describe("Children 0-5 years"),
      tourStartsFrom: z.string().optional().describe("Tour start date (ISO: YYYY-MM-DD)"),
      tourEndsOn: z.string().optional().describe("Tour end date (ISO: YYYY-MM-DD)"),
      transport: z.string().optional().describe("Transport type e.g. 'Private Cab', 'Flight + Cab'"),
      pickup_location: z.string().optional().describe("Pickup location"),
      drop_location: z.string().optional().describe("Drop location"),
      remarks: z.string().optional().describe("Additional notes"),
      inquiryId: z.string().optional().describe("Link to existing inquiry ID"),
      price: z.string().optional().describe("Base price"),
      totalPrice: z.string().optional().describe("Total price"),
    },
    async (params) => {
      const data = await callTool("create_tour_query", params);
      return {
        content: [
          {
            type: "text",
            text: `✅ Tour query created!\n\n${JSON.stringify(data, null, 2)}\n\nOpen it in the admin at /tourPackageQuery/${(data as any).id}`,
          },
        ],
      };
    }
  );

  server.tool(
    "list_tour_queries",
    "List existing tour package queries (quotes). Filter by customer name or location.",
    {
      locationId: z.string().optional().describe("Filter by location ID"),
      customerName: z.string().optional().describe("Search by customer name"),
      limit: z.number().int().min(1).max(100).optional().default(20).describe("Max results"),
    },
    async ({ locationId, customerName, limit }) => {
      const data = await callTool("list_tour_queries", { locationId, customerName, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  // ── AI Itinerary Generation ─────────────────────────────────────────────────

  server.tool(
    "generate_itinerary",
    `Use AI (Gemini) to generate a detailed day-by-day travel itinerary.
    Returns a structured itinerary JSON that can be used to create a tour query.
    Great for quickly drafting a proposal for a customer.`,
    {
      destination: z.string().describe("Travel destination (e.g. 'Goa', 'Kerala Backwaters')"),
      nights: z.number().int().min(1).max(30).describe("Number of nights"),
      days: z.number().int().min(1).max(31).describe("Number of days"),
      groupType: z
        .enum(["family", "couple", "friends", "solo", "corporate", "seniors"])
        .describe("Type of travel group"),
      budgetCategory: z
        .enum(["budget", "mid-range", "premium", "luxury"])
        .describe("Budget category"),
      specialRequirements: z
        .string()
        .optional()
        .describe("Any special requirements (e.g. 'vegetarian food', 'beach resort', 'adventure activities')"),
      customerName: z.string().optional().describe("Customer name to personalize the proposal"),
      startDate: z.string().optional().describe("Trip start date (ISO: YYYY-MM-DD)"),
      numAdults: z.number().int().optional().describe("Number of adults"),
      numChildren: z.number().int().optional().describe("Number of children"),
    },
    async (params) => {
      const data = await callTool("generate_itinerary", params);
      return {
        content: [
          {
            type: "text",
            text: `🗺️ AI-Generated Itinerary for ${params.destination}\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    }
  );

  // ── Dashboard Stats ─────────────────────────────────────────────────────────

  server.tool(
    "get_stats",
    "Get dashboard statistics: inquiry counts by status and total tour queries.",
    {},
    async () => {
      const data = await callTool("get_stats", {});
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  return server;
}
