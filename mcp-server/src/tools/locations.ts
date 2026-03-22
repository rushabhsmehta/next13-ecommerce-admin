import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerLocationTools(server: McpServer) {
  server.tool(
    "search_locations",
    "Search travel destinations/locations by name. Use this first to find location IDs before creating inquiries or queries.",
    {
      query: z.string().describe("Destination name to search (e.g. 'Goa', 'Kerala', 'Maldives')"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Max results to return"),
    },
    async ({ query, limit }) => {
      try {
        const data = await callTool("search_locations", { query, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("search_locations", err);
      }
    }
  );

  server.tool(
    "list_tour_packages",
    "Browse available tour packages. Filter by destination or category.",
    {
      locationId: z.string().optional().describe("Filter by location ID (from search_locations)"),
      tourCategory: z.enum(["Domestic", "International"]).optional().describe("Filter by tour category"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, tourCategory, limit }) => {
      try {
        const data = await callTool("list_tour_packages", { locationId, tourCategory, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_tour_packages", err);
      }
    }
  );

  server.tool(
    "get_tour_package",
    `Get a tour package with its full variant details — hotels per day per variant, pricing tiers, and itinerary.

WHEN TO USE:
- After list_tour_packages, once the user has picked a package
- To show the user which variants (Budget/Standard/Deluxe) are available and what hotels/prices they include
- To get the variant IDs needed for create_tour_query selectedVariantIds

The response includes:
- packageVariants[].id — use this as selectedVariantIds in create_tour_query
- packageVariants[].name — e.g. "Budget", "Standard", "Deluxe"
- packageVariants[].variantHotelMappings — hotel per day per variant
- packageVariants[].tourPackagePricings — pricing tiers with components
- itineraries — day-by-day itinerary of the base package`,
    {
      tourPackageId: z.string().describe("Tour package ID from list_tour_packages"),
    },
    async ({ tourPackageId }) => {
      try {
        const data = await callTool("get_tour_package", { tourPackageId });
        const d = data as any;
        const variantSummary = (d?.packageVariants ?? [])
          .map((v: any) => {
            const pricing = v.tourPackagePricings?.[0];
            const total = pricing ? `₹${pricing.totalPrice ?? "—"}` : "price not set";
            return `  • ${v.name} (ID: ${v.id}) — ${total}`;
          })
          .join("\n");
        const header = `Package: ${d?.tourPackageName}\nDuration: ${d?.numDaysNight}\nLocation: ${d?.location?.label}\n\nVariants:\n${variantSummary || "  No variants defined"}\n\n`;
        return { content: [{ type: "text", text: `${header}${JSON.stringify(data, null, 2)}` }] };
      } catch (err) {
        return toolError("get_tour_package", err);
      }
    }
  );

  server.tool(
    "list_hotels",
    "Browse hotels available in the system, optionally filtered by location or name.",
    {
      locationId: z.string().optional().describe("Filter by location ID"),
      name: z.string().optional().describe("Search by hotel name"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, name, limit }) => {
      try {
        const data = await callTool("list_hotels", { locationId, name, limit });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_hotels", err);
      }
    }
  );

  server.tool(
    "list_destinations",
    "List tour destinations, optionally filtered by location.",
    {
      locationId: z.string().optional().describe("Filter by parent location ID"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_destinations", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_destinations", err);
      }
    }
  );
}
