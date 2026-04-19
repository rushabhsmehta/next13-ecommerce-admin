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
    "get_hotel_pricing",
    `Get room tariffs/pricing for a specific hotel. Returns all active pricing periods with room type, occupancy type, meal plan, and price per night.

Use this to:
- Look up what a hotel charges per room type/occupancy combination
- Check pricing for a specific date range
- Get hotel tariffs when building tour package costs`,
    {
      hotelId: z.string().describe("Hotel ID (from list_hotels)"),
      startDate: z.string().optional().describe("Filter: pricing valid on/after this date (ISO 8601, e.g. 2025-10-01)"),
      endDate: z.string().optional().describe("Filter: pricing valid on/before this date (ISO 8601, e.g. 2025-10-31)"),
      roomTypeId: z.string().optional().describe("Filter by room type ID (from list_room_types)"),
      occupancyTypeId: z.string().optional().describe("Filter by occupancy type ID (from list_occupancy_types)"),
      mealPlanId: z.string().optional().describe("Filter by meal plan ID (from list_meal_plans)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_hotel_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_hotel_pricing", err);
      }
    }
  );

  server.tool(
    "create_hotel_pricing",
    "Add a new pricing period for a hotel. Specify the hotel, room type, occupancy type, date range, and price per night.",
    {
      hotelId: z.string().describe("Hotel ID (from list_hotels)"),
      startDate: z.string().describe("Start of pricing period (ISO 8601, e.g. 2025-10-01)"),
      endDate: z.string().describe("End of pricing period (ISO 8601, e.g. 2025-12-31)"),
      roomTypeId: z.string().describe("Room type ID (from list_room_types)"),
      occupancyTypeId: z.string().describe("Occupancy type ID (from list_occupancy_types)"),
      price: z.number().min(0).describe("Price per night in INR"),
      mealPlanId: z.string().optional().describe("Meal plan ID (from list_meal_plans), optional"),
    },
    async (params) => {
      try {
        const data = await callTool("create_hotel_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("create_hotel_pricing", err);
      }
    }
  );

  server.tool(
    "update_hotel_pricing",
    "Update an existing hotel pricing period. Only the fields you provide will be changed.",
    {
      hotelId: z.string().describe("Hotel ID the pricing belongs to"),
      pricingId: z.string().describe("Pricing record ID (from get_hotel_pricing)"),
      startDate: z.string().optional().describe("New start date (ISO 8601)"),
      endDate: z.string().optional().describe("New end date (ISO 8601)"),
      roomTypeId: z.string().optional().describe("New room type ID"),
      occupancyTypeId: z.string().optional().describe("New occupancy type ID"),
      price: z.number().min(0).optional().describe("New price per night in INR"),
      mealPlanId: z.string().nullable().optional().describe("New meal plan ID, or null to clear"),
    },
    async (params) => {
      try {
        const data = await callTool("update_hotel_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("update_hotel_pricing", err);
      }
    }
  );

  server.tool(
    "delete_hotel_pricing",
    "Delete a hotel pricing period permanently.",
    {
      hotelId: z.string().describe("Hotel ID the pricing belongs to"),
      pricingId: z.string().describe("Pricing record ID (from get_hotel_pricing)"),
    },
    async (params) => {
      try {
        const data = await callTool("delete_hotel_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("delete_hotel_pricing", err);
      }
    }
  );

  server.tool(
    "get_transport_pricing",
    `Get transport/vehicle pricing for a location. Returns active pricing with vehicle type, price, and whether it's charged per day or per trip.

Use this to:
- Look up transport costs for a destination when building tour packages
- Compare vehicle options (sedan, SUV, tempo traveller, etc.) and their rates
- Check pricing for a specific date range`,
    {
      locationId: z.string().optional().describe("Filter by location ID (from search_locations)"),
      vehicleTypeId: z.string().optional().describe("Filter by vehicle type ID (from list_vehicle_types)"),
      transportType: z.enum(["PerDay", "PerTrip"]).optional().describe("Filter by pricing type: PerDay or PerTrip"),
      startDate: z.string().optional().describe("Filter: pricing valid on/after this date (ISO 8601, e.g. 2025-10-01)"),
      endDate: z.string().optional().describe("Filter: pricing valid on/before this date (ISO 8601, e.g. 2025-10-31)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_transport_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_transport_pricing", err);
      }
    }
  );

  server.tool(
    "create_transport_pricing",
    "Add a new transport/vehicle pricing record for a location.",
    {
      locationId: z.string().describe("Location ID (from search_locations)"),
      vehicleTypeId: z.string().describe("Vehicle type ID (from list_vehicle_types)"),
      price: z.number().min(0).describe("Price in INR"),
      transportType: z.enum(["PerDay", "PerTrip"]).describe("Whether price is per day or per trip"),
      startDate: z.string().describe("Start of pricing period (ISO 8601, e.g. 2025-10-01)"),
      endDate: z.string().describe("End of pricing period (ISO 8601, e.g. 2025-12-31)"),
      description: z.string().optional().describe("Optional description or notes"),
    },
    async (params) => {
      try {
        const data = await callTool("create_transport_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("create_transport_pricing", err);
      }
    }
  );

  server.tool(
    "update_transport_pricing",
    "Update an existing transport pricing record. Only the fields you provide will be changed.",
    {
      pricingId: z.string().describe("Transport pricing record ID (from get_transport_pricing)"),
      locationId: z.string().optional().describe("New location ID"),
      vehicleTypeId: z.string().optional().describe("New vehicle type ID"),
      price: z.number().min(0).optional().describe("New price in INR"),
      transportType: z.enum(["PerDay", "PerTrip"]).optional().describe("New pricing type"),
      startDate: z.string().optional().describe("New start date (ISO 8601)"),
      endDate: z.string().optional().describe("New end date (ISO 8601)"),
      description: z.string().optional().describe("New description"),
      isActive: z.boolean().optional().describe("Set false to deactivate without deleting"),
    },
    async (params) => {
      try {
        const data = await callTool("update_transport_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("update_transport_pricing", err);
      }
    }
  );

  server.tool(
    "delete_transport_pricing",
    "Delete a transport pricing record permanently.",
    {
      pricingId: z.string().describe("Transport pricing record ID (from get_transport_pricing)"),
    },
    async (params) => {
      try {
        const data = await callTool("delete_transport_pricing", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("delete_transport_pricing", err);
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
