import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

// Shared itinerary day schema used in both create and update
const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1).describe("Day number (1, 2, 3, ...)"),
  itineraryTitle: z.string().describe("Title for this day e.g. 'Day 1: Arrival in Goa & Beach Visit'"),
  itineraryDescription: z.string().optional().describe("Brief description of the day's plan"),
  locationId: z.string().optional().describe("Override location for this specific day (defaults to query destination)"),
  hotelId: z.string().optional().describe("Hotel ID from list_hotels"),
  hotelName: z.string().optional().describe("Hotel name as fallback (searched at destination) — use list_hotels first"),
  mealPlanId: z.string().optional().describe("Meal plan ID from list_meal_plans"),
  mealPlanName: z.string().optional().describe("Meal plan name as fallback e.g. 'MAP', 'CP', 'AP'"),
  activities: z.array(z.object({
    activityTitle: z.string().describe("Activity name e.g. 'Dudhsagar Falls Excursion'"),
    activityDescription: z.string().optional().describe("Brief description of the activity"),
  })).optional().default([]).describe("List of activities/sightseeing for this day"),
  roomAllocations: z.array(z.object({
    roomTypeId: z.string().optional().describe("Room type ID from list_room_types"),
    roomTypeName: z.string().optional().describe("Room type name as fallback e.g. 'Deluxe Double', 'Standard'"),
    occupancyTypeId: z.string().optional().describe("Occupancy type ID from list_occupancy_types — REQUIRED"),
    occupancyTypeName: z.string().optional().describe("Occupancy type name as fallback e.g. 'Double', 'Triple', 'Single' — REQUIRED if no ID"),
    mealPlanId: z.string().optional().describe("Override meal plan for this room"),
    mealPlanName: z.string().optional().describe("Override meal plan name for this room"),
    quantity: z.number().int().min(1).optional().default(1).describe("Number of rooms of this type"),
    guestNames: z.string().optional().describe("Comma-separated guest names for this room"),
  })).optional().default([]).describe("Room allocation for this night"),
});

export function registerTourQueryTools(server: McpServer) {
  server.tool(
    "create_tour_query",
    `Create a complete tour package query (quote/itinerary proposal) for a customer.

PACKAGE-BASED WORKFLOW (recommended):
1. search_locations → get locationId
2. list_tour_packages with locationId → pick a package
3. get_tour_package → see variants (Budget/Standard/Deluxe) with hotel-per-day + pricing
4. create_tour_query with tourPackageId + selectedVariantIds → snapshots variants into PDF
   - If you pass selectedVariantIds, tourPackageId must also be present so the server can validate them.

IMPORTANT: Before calling this tool, collect ALL of the following from the user in one conversation:

REQUIRED INFORMATION:
- Destination: call search_locations first to get locationId (or use locationName as fallback)
- Tour package name e.g. "Goa Honeymoon 4N5D" → tourPackageQueryName
- Customer full name → customerName
- Customer phone number → customerNumber
- Tour type: Honeymoon / Family / Adventure / Group / Corporate → tourPackageQueryType
- Domestic or International → tourCategory
- Travel start date (YYYY-MM-DD) → tourStartsFrom
- Travel end date (YYYY-MM-DD) → tourEndsOn
- Duration string e.g. "3 Nights / 4 Days" → numDaysNight
- Number of adults → numAdults
- Children aged 5-12 → numChild5to12
- Children aged 0-5 → numChild0to5
- Total package price → totalPrice

FOR EACH DAY build an entry in the itineraries array:
- dayNumber, itineraryTitle (e.g. "Day 1: Arrival in Goa"), itineraryDescription
- Hotel for the night: call list_hotels first → hotelId (or hotelName as fallback)
- Activities for the day: title + description each
- Room allocation:
    * Room type: call list_room_types → roomTypeId (or roomTypeName)
    * Occupancy type: call list_occupancy_types → occupancyTypeId (or occupancyTypeName) — THIS IS REQUIRED
    * Meal plan: call list_meal_plans → mealPlanId (or mealPlanName)
    * Number of rooms (quantity) and guest names

OPTIONAL:
- Pickup / drop locations → pickup_location, drop_location
- Transport mode → transport (e.g. "Private Cab", "Flight + Cab")
- Extra notes → remarks
- Link to existing inquiry → inquiryId

POLICIES (ask the customer if they want to include):
- inclusions: string[] — what is included (e.g. ["Daily breakfast", "Airport transfers", "Hotel taxes"])
- exclusions: string[] — what is NOT included (e.g. ["Airfare", "Personal expenses", "Entry fees"])
- importantNotes: string[] — important notices
- paymentPolicy: string[] — payment schedule and terms
- usefulTip: string[] — optional helpful customer notes
- airlineCancellationPolicy: string[] — airline-specific cancellation terms
- termsconditions: string[] — general terms and conditions
- kitchenGroupPolicy: string[] — meal / kitchen policy notes
- cancellationPolicy: string[] — cancellation and refund rules`,
    {
      customerName: z.string().describe("Customer full name"),
      customerNumber: z.string().optional().describe("Customer phone number"),
      locationId: z.string().optional().describe("Destination location ID from search_locations"),
      locationName: z.string().optional().describe("Destination name if ID unknown e.g. 'Goa', 'Manali'"),
      tourPackageQueryName: z.string().optional().describe("Descriptive package name e.g. 'Goa Honeymoon 4N5D'"),
      numDaysNight: z.string().optional().describe("Duration string e.g. '4 Nights / 5 Days'"),
      tourCategory: z.enum(["Domestic", "International"]).optional().default("Domestic"),
      tourPackageQueryType: z.string().optional().describe("Tour type e.g. 'Honeymoon', 'Family', 'Adventure', 'Group'"),
      numAdults: z.string().optional().describe("Number of adults"),
      numChild5to12: z.string().optional().describe("Children aged 5-12"),
      numChild0to5: z.string().optional().describe("Children aged 0-5"),
      tourStartsFrom: z.string().optional().describe("Tour start date (YYYY-MM-DD)"),
      tourEndsOn: z.string().optional().describe("Tour end date (YYYY-MM-DD)"),
      transport: z.string().optional().describe("Transport mode e.g. 'Private Cab', 'Flight + Cab'"),
      pickup_location: z.string().optional().describe("Pickup location"),
      drop_location: z.string().optional().describe("Drop location"),
      remarks: z.string().optional().describe("Additional notes or special requests"),
      inquiryId: z.string().optional().describe("Link to an existing inquiry ID"),
      tourPackageId: z.string().optional().describe("Tour package ID from list_tour_packages — use get_tour_package to see its variants"),
      selectedVariantIds: z.array(z.string()).optional().describe("Variant IDs from get_tour_package to snapshot into this query — creates variant comparison table in PDF"),
      price: z.string().optional().describe("Base price"),
      totalPrice: z.string().optional().describe("Total package price"),
      itineraries: z.array(itineraryDaySchema).optional().default([])
        .describe("Day-by-day itinerary. Collect ALL days before calling this tool."),
      inclusions: z.array(z.string()).optional().describe("What is included e.g. ['Daily breakfast', 'Airport transfers']"),
      exclusions: z.array(z.string()).optional().describe("What is NOT included e.g. ['Airfare', 'Personal expenses']"),
      importantNotes: z.array(z.string()).optional().describe("Important notices for the customer"),
      paymentPolicy: z.array(z.string()).optional().describe("Payment schedule and terms"),
      usefulTip: z.array(z.string()).optional().describe("Optional helpful customer notes"),
      airlineCancellationPolicy: z.array(z.string()).optional().describe("Airline cancellation terms"),
      termsconditions: z.array(z.string()).optional().describe("General terms and conditions"),
      kitchenGroupPolicy: z.array(z.string()).optional().describe("Meal / kitchen policy notes"),
      cancellationPolicy: z.array(z.string()).optional().describe("Cancellation and refund policy"),
    },
    async (params) => {
      try {
        const data = await callTool("create_tour_query", params);
        const d = data as any;
        const itinCount = d?.itineraries?.length ?? 0;
        const snapshotCount = d?.queryVariantSnapshots?.length ?? 0;
        const name = d?.tourPackageQueryName ?? "Unnamed";
        const pdfUrl = d?.pdfGeneratorUrl ?? "";
        const variantInfo = snapshotCount > 0
          ? `\nVariants: ${snapshotCount} variant snapshot(s) created`
          : "";
        return {
          content: [{
            type: "text",
            text: `Tour query created with ${itinCount} itinerary day(s)!${variantInfo}\n\nID: ${d?.id}\nName: ${name}\nCustomer: ${d?.customerName}\nDestination: ${d?.location?.label ?? ""}\n\n📄 Download PDF: ${pdfUrl}\n\nOpen in admin: /tourPackageQuery/${d?.id}\n\n${JSON.stringify(data, null, 2)}`,
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
      tourPackageQueryId: z.string().describe("The tour query ID"),
    },
    async ({ tourPackageQueryId }) => {
      try {
        const data = await callTool("get_tour_query", { tourPackageQueryId });
        const d = data as any;
        const pdfUrl = d?.pdfGeneratorUrl ?? "";
        const header = pdfUrl ? `📄 Download PDF: ${pdfUrl}\n\n` : "";
        return { content: [{ type: "text", text: `${header}${JSON.stringify(data, null, 2)}` }] };
      } catch (err) {
        return toolError("get_tour_query", err);
      }
    }
  );

  server.tool(
    "confirm_tour_query",
    "Confirm a tour query, enabling financial transactions to be recorded against it. Optionally specify a confirmedVariantId.",
    {
      tourPackageQueryId: z.string().describe("The tour query ID to confirm"),
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
      tourPackageQueryId: z.string().describe("The tour query ID"),
    },
    async ({ tourPackageQueryId }) => {
      try {
        const data = await callTool("get_query_financial_summary", { tourPackageQueryId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_query_financial_summary", err);
      }
    }
  );

  server.tool(
    "update_tour_query",
    `Update fields on an existing tour query.

If itineraries are provided, ALL existing itineraries are deleted and replaced with the new ones (full replacement, not merge).
Call get_tour_query first to see the current state before replacing itineraries.

Supports the same itinerary structure as create_tour_query:
- hotelId or hotelName (searched at destination via list_hotels)
- roomTypeId or roomTypeName (via list_room_types)
- occupancyTypeId or occupancyTypeName (via list_occupancy_types) — REQUIRED per room allocation
- mealPlanId or mealPlanName (via list_meal_plans)`,
    {
      tourPackageQueryId: z.string().describe("The tour query ID to update"),
      customerName: z.string().optional().describe("Updated customer name"),
      customerNumber: z.string().optional().describe("Updated customer number"),
      tourPackageQueryName: z.string().optional().describe("Updated package name"),
      tourStartsFrom: z.string().optional().describe("Updated start date (YYYY-MM-DD)"),
      tourEndsOn: z.string().optional().describe("Updated end date (YYYY-MM-DD)"),
      numDaysNight: z.string().optional().describe("Updated duration string"),
      transport: z.string().optional().describe("Updated transport type"),
      pickup_location: z.string().optional().describe("Updated pickup location"),
      drop_location: z.string().optional().describe("Updated drop location"),
      remarks: z.string().optional().describe("Updated remarks"),
      totalPrice: z.string().optional().describe("Updated total price"),
      itineraries: z.array(itineraryDaySchema).optional()
        .describe("If provided, REPLACES all existing itineraries. Omit to leave itineraries unchanged."),
      inclusions: z.array(z.string()).optional(),
      exclusions: z.array(z.string()).optional(),
      importantNotes: z.array(z.string()).optional(),
      paymentPolicy: z.array(z.string()).optional(),
      usefulTip: z.array(z.string()).optional(),
      airlineCancellationPolicy: z.array(z.string()).optional(),
      termsconditions: z.array(z.string()).optional(),
      kitchenGroupPolicy: z.array(z.string()).optional(),
      cancellationPolicy: z.array(z.string()).optional(),
    },
    async (params) => {
      try {
        const data = await callTool("update_tour_query", params);
        const d = data as any;
        const itinCount = d?.itineraries?.length ?? 0;
        return {
          content: [{ type: "text", text: `Tour query updated. Itinerary days: ${itinCount}\n\n${JSON.stringify(data, null, 2)}` }],
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
      tourPackageQueryId: z.string().describe("The tour query ID to archive"),
    },
    async ({ tourPackageQueryId }) => {
      try {
        const data = await callTool("archive_tour_query", { tourPackageQueryId });
        return {
          content: [{ type: "text", text: `Tour query archived\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("archive_tour_query", err);
      }
    }
  );

  server.tool(
    "add_tour_query_variant",
    `Add one or more pricing variants to an existing tour package query.

Variants let customers compare alternative hotel/price options side-by-side (e.g., Budget, Standard, Deluxe).
Each variant has a name, a breakdown of pricing components (Hotel, Transport, Meals, etc.), and optional
hotel selections per day.

WHEN TO USE:
- After create_tour_query when the customer wants to see multiple price options
- Use replaceExisting: true to overwrite all current variants
- Use replaceExisting: false (default) to append new variants to existing ones

EXAMPLE VARIANTS:
- Budget: Economy hotels, shared transport → total ₹15,000
- Standard: 3-star hotels, private cab → total ₹22,000
- Deluxe: 5-star hotels, luxury vehicle → total ₹35,000

The response includes pdfGeneratorUrl — open it to download the PDF with variant comparison table.`,
    {
      tourPackageQueryId: z.string().describe("The tour query ID to add variants to"),
      replaceExisting: z.boolean().optional().default(false).describe("true = replace all existing variants, false = append to existing"),
      variants: z.array(z.object({
        name: z.string().describe("Variant name e.g. 'Budget', 'Standard', 'Deluxe'"),
        description: z.string().optional().describe("Short description of what makes this variant different"),
        totalPrice: z.number().optional().describe("Total price for this variant in INR"),
        pricingComponents: z.array(z.object({
          name: z.string().describe("Component name e.g. 'Hotel', 'Transport', 'Meals', 'Guide Charges'"),
          price: z.number().describe("Component price in INR"),
          description: z.string().optional().describe("Notes e.g. '3-star hotel for 2 nights'"),
        })).optional().default([]).describe("Itemized price breakdown for this variant"),
        hotelOverrides: z.array(z.object({
          dayNumber: z.number().int().min(1).describe("Day number (1, 2, 3, ...) from the itinerary"),
          hotelName: z.string().describe("Hotel name for this day in this variant"),
        })).optional().default([]).describe("Which hotel to use per day — only needed if different hotels per variant"),
        remarks: z.string().optional().describe("Additional notes for this variant"),
      })).min(1).describe("List of variants to add"),
    },
    async (params) => {
      try {
        const data = await callTool("add_tour_query_variant", params);
        const d = data as any;
        const count = Array.isArray(d?.customQueryVariants) ? d.customQueryVariants.length : params.variants.length;
        const pdfUrl = d?.pdfGeneratorUrl ?? "";
        return {
          content: [{
            type: "text",
            text: `${params.variants.length} variant(s) added. Query now has ${count} variant(s) total.\n\n📄 Download PDF with variant comparison: ${pdfUrl}\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("add_tour_query_variant", err);
      }
    }
  );
}
