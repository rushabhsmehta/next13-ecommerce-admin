import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerTourQueryTools(server: McpServer) {
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
      try {
        const data = await callTool("create_tour_query", params);
        return {
          content: [{
            type: "text",
            text: `Tour query created!\n\n${JSON.stringify(data, null, 2)}\n\nOpen it in the admin at /tourPackageQuery/${(data as any).id}`,
          }],
        };
      } catch (err) {
        return toolError("create_tour_query", err);
      }
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
      try {
        const data = await callTool("list_tour_queries", { locationId, customerName, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_tour_queries", err);
      }
    }
  );

  server.tool(
    "get_tour_query",
    "Get complete tour query details including itineraries, activities, room allocations, and financial records.",
    {
      tourQueryId: z.string().describe("The tour query ID"),
    },
    async ({ tourQueryId }) => {
      try {
        const data = await callTool("get_tour_query", { tourQueryId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_tour_query", err);
      }
    }
  );

  server.tool(
    "confirm_tour_query",
    "Confirm a tour query, enabling financial transactions to be recorded against it. Optionally specify a confirmedVariantId.",
    {
      tourQueryId: z.string().describe("The tour query ID to confirm"),
      confirmedVariantId: z.string().optional().describe("Optional variant ID to confirm a specific variant"),
    },
    async (params) => {
      try {
        const data = await callTool("confirm_tour_query", params);
        return {
          content: [{ type: "text", text: `Tour query confirmed!\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("confirm_tour_query", err);
      }
    }
  );

  server.tool(
    "get_query_financial_summary",
    "Get per-query profit & loss: total sales vs purchases, receipts vs payments, gross profit, and outstanding balances.",
    {
      tourQueryId: z.string().describe("The tour query ID"),
    },
    async ({ tourQueryId }) => {
      try {
        const data = await callTool("get_query_financial_summary", { tourQueryId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_query_financial_summary", err);
      }
    }
  );

  server.tool(
    "update_tour_query",
    "Update tour query fields like customer name, dates, transport, remarks, or price.",
    {
      tourQueryId: z.string().describe("The tour query ID to update"),
      customerName: z.string().optional().describe("Updated customer name"),
      customerNumber: z.string().optional().describe("Updated customer number"),
      tourStartsFrom: z.string().optional().describe("Updated start date (YYYY-MM-DD)"),
      tourEndsOn: z.string().optional().describe("Updated end date (YYYY-MM-DD)"),
      transport: z.string().optional().describe("Updated transport type"),
      remarks: z.string().optional().describe("Updated remarks"),
      price: z.string().optional().describe("Updated base price"),
      totalPrice: z.string().optional().describe("Updated total price"),
    },
    async (params) => {
      try {
        const data = await callTool("update_tour_query", params);
        return {
          content: [{ type: "text", text: `Tour query updated\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("update_tour_query", err);
      }
    }
  );

  server.tool(
    "archive_tour_query",
    "Archive (soft-delete) a tour query.",
    {
      tourQueryId: z.string().describe("The tour query ID to archive"),
    },
    async ({ tourQueryId }) => {
      try {
        const data = await callTool("archive_tour_query", { tourQueryId });
        return {
          content: [{ type: "text", text: `Tour query archived\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("archive_tour_query", err);
      }
    }
  );
}
