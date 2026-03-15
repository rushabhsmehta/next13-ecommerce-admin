import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerFlightTools(server: McpServer) {
  server.tool(
    "get_flight_ticket",
    "Get flight ticket details by PNR number.",
    {
      pnr: z.string().describe("The PNR number of the flight ticket"),
    },
    async ({ pnr }) => {
      try {
        const data = await callTool("get_flight_ticket", { pnr });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_flight_ticket", err);
      }
    }
  );

  server.tool(
    "list_flight_tickets",
    "List flight tickets for a specific tour query.",
    {
      tourPackageQueryId: z.string().describe("The tour query ID to list tickets for"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_flight_tickets", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_flight_tickets", err);
      }
    }
  );

  server.tool(
    "create_flight_ticket",
    "Create a new flight ticket record linked to a tour query.",
    {
      tourPackageQueryId: z.string().describe("The tour query ID to link the ticket to"),
      pnr: z.string().describe("PNR number"),
      airline: z.string().optional().describe("Airline name"),
      flightNumber: z.string().optional().describe("Flight number"),
      departureDate: z.string().optional().describe("Departure date (YYYY-MM-DD)"),
      departureTime: z.string().optional().describe("Departure time (HH:MM)"),
      arrivalDate: z.string().optional().describe("Arrival date (YYYY-MM-DD)"),
      arrivalTime: z.string().optional().describe("Arrival time (HH:MM)"),
      departureCity: z.string().optional().describe("Departure city"),
      arrivalCity: z.string().optional().describe("Arrival city"),
      passengerName: z.string().optional().describe("Passenger name"),
      ticketNumber: z.string().optional().describe("Ticket number"),
      fare: z.number().optional().describe("Ticket fare amount"),
    },
    async (params) => {
      try {
        const data = await callTool("create_flight_ticket", params);
        return {
          content: [{ type: "text", text: `Flight ticket created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_flight_ticket", err);
      }
    }
  );
}
