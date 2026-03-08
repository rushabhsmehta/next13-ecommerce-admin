/**
 * MCP (Model Context Protocol) Gateway
 *
 * Single authenticated endpoint for all MCP tool calls.
 * Claude's MCP server calls this route with x-mcp-api-secret header.
 *
 * POST /api/mcp
 * Headers: x-mcp-api-secret: <secret>
 * Body: { tool: string, params: object }
 */

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

// ── Auth ────────────────────────────────────────────────────────────────────

function authenticateMcp(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  if (!secret || !process.env.MCP_API_SECRET) return false;
  return secret === process.env.MCP_API_SECRET;
}

// ── Tool handlers ────────────────────────────────────────────────────────────

async function searchLocations(params: { query: string; limit?: number }) {
  const { query, limit = 10 } = params;
  return prismadb.location.findMany({
    where: {
      isActive: true,
      label: { contains: query },
    },
    select: { id: true, label: true, value: true, slug: true },
    take: limit,
  });
}

async function listTourPackages(params: {
  locationId?: string;
  tourCategory?: string;
  limit?: number;
}) {
  const { locationId, tourCategory, limit = 20 } = params;
  return prismadb.tourPackage.findMany({
    where: {
      isArchived: false,
      ...(locationId && { locationId }),
      ...(tourCategory && { tourCategory: tourCategory as any }),
    },
    select: {
      id: true,
      tourPackageName: true,
      tourCategory: true,
      tourPackageType: true,
      numDaysNight: true,
      price: true,
      pricePerAdult: true,
      transport: true,
      pickup_location: true,
      drop_location: true,
      location: { select: { id: true, label: true } },
    },
    orderBy: { websiteSortOrder: "asc" },
    take: limit,
  });
}

async function listHotels(params: {
  locationId?: string;
  name?: string;
  limit?: number;
}) {
  const { locationId, name, limit = 20 } = params;
  return prismadb.hotel.findMany({
    where: {
      ...(locationId && { locationId }),
      ...(name && { name: { contains: name } }),
    },
    select: {
      id: true,
      name: true,
      link: true,
      location: { select: { id: true, label: true } },
    },
    take: limit,
  });
}

async function createInquiry(params: {
  customerName: string;
  customerMobileNumber: string;
  locationId?: string;
  locationName?: string;
  numAdults: number;
  numChildrenAbove11?: number;
  numChildren5to11?: number;
  numChildrenBelow5?: number;
  journeyDate: string;
  remarks?: string;
  status?: string;
}) {
  let locationId = params.locationId;

  // Resolve location by name if ID not provided
  if (!locationId && params.locationName) {
    const loc = await prismadb.location.findFirst({
      where: {
        isActive: true,
        label: { contains: params.locationName },
      },
    });
    if (!loc) throw new Error(`Location "${params.locationName}" not found. Use search_locations first.`);
    locationId = loc.id;
  }

  if (!locationId) throw new Error("locationId or locationName is required");

  const inquiry = await prismadb.inquiry.create({
    data: {
      customerName: params.customerName,
      customerMobileNumber: params.customerMobileNumber,
      locationId,
      numAdults: params.numAdults,
      numChildrenAbove11: params.numChildrenAbove11 ?? 0,
      numChildren5to11: params.numChildren5to11 ?? 0,
      numChildrenBelow5: params.numChildrenBelow5 ?? 0,
      journeyDate: new Date(params.journeyDate),
      remarks: params.remarks ?? null,
      status: params.status ?? "NEW",
    },
    include: {
      location: { select: { id: true, label: true } },
    },
  });

  return inquiry;
}

async function listInquiries(params: {
  status?: string;
  limit?: number;
  customerName?: string;
}) {
  const { status, limit = 25, customerName } = params;
  return prismadb.inquiry.findMany({
    where: {
      ...(status && status !== "ALL" && { status }),
      ...(customerName && { customerName: { contains: customerName } }),
    },
    select: {
      id: true,
      customerName: true,
      customerMobileNumber: true,
      customerEmail: true,
      status: true,
      journeyDate: true,
      numAdults: true,
      numChildrenAbove11: true,
      numChildren5to11: true,
      numChildrenBelow5: true,
      remarks: true,
      nextFollowUpDate: true,
      createdAt: true,
      location: { select: { id: true, label: true } },
      associatePartner: { select: { id: true, name: true } },
      tourPackageQueries: { select: { id: true, tourPackageQueryName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getInquiry(params: { inquiryId: string }) {
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    include: {
      location: true,
      associatePartner: true,
      actions: { orderBy: { createdAt: "desc" } },
      tourPackageQueries: {
        select: {
          id: true,
          tourPackageQueryNumber: true,
          tourPackageQueryName: true,
          totalPrice: true,
          confirmedVariantId: true,
        },
      },
      roomAllocations: {
        include: { roomType: true, occupancyType: true, mealPlan: true },
      },
    },
  });
  if (!inquiry) throw new Error(`Inquiry ${params.inquiryId} not found`);
  return inquiry;
}

async function updateInquiryStatus(params: {
  inquiryId: string;
  status: string;
  remarks?: string;
}) {
  return prismadb.inquiry.update({
    where: { id: params.inquiryId },
    data: {
      status: params.status,
      ...(params.remarks !== undefined && { remarks: params.remarks }),
    },
    select: {
      id: true,
      customerName: true,
      status: true,
      updatedAt: true,
    },
  });
}

async function addInquiryNote(params: {
  inquiryId: string;
  note: string;
  actionType?: string;
}) {
  // Verify inquiry exists
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!inquiry) throw new Error(`Inquiry ${params.inquiryId} not found`);

  return (prismadb as any).inquiryAction.create({
    data: {
      inquiryId: params.inquiryId,
      actionType: params.actionType ?? "NOTE",
      description: params.note,
    },
  });
}

async function createTourQuery(params: {
  customerName: string;
  customerNumber?: string;
  locationId?: string;
  locationName?: string;
  numDaysNight?: string;
  tourCategory?: "Domestic" | "International";
  tourPackageQueryType?: string;
  numAdults?: string;
  numChild5to12?: string;
  numChild0to5?: string;
  tourStartsFrom?: string;
  tourEndsOn?: string;
  transport?: string;
  pickup_location?: string;
  drop_location?: string;
  remarks?: string;
  inquiryId?: string;
  price?: string;
  totalPrice?: string;
}) {
  let locationId = params.locationId;

  if (!locationId && params.locationName) {
    const loc = await prismadb.location.findFirst({
      where: { isActive: true, label: { contains: params.locationName } },
    });
    if (!loc) throw new Error(`Location "${params.locationName}" not found. Use search_locations first.`);
    locationId = loc.id;
  }

  if (!locationId) throw new Error("locationId or locationName is required");

  // Auto-generate query number
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const queryNumber = `TPQ-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const query = await prismadb.tourPackageQuery.create({
    data: {
      tourPackageQueryNumber: queryNumber,
      customerName: params.customerName,
      customerNumber: params.customerNumber ?? null,
      locationId,
      tourCategory: (params.tourCategory as any) ?? "Domestic",
      tourPackageQueryType: params.tourPackageQueryType ?? null,
      numDaysNight: params.numDaysNight ?? null,
      numAdults: params.numAdults ?? null,
      numChild5to12: params.numChild5to12 ?? null,
      numChild0to5: params.numChild0to5 ?? null,
      tourStartsFrom: params.tourStartsFrom ? new Date(params.tourStartsFrom) : null,
      tourEndsOn: params.tourEndsOn ? new Date(params.tourEndsOn) : null,
      transport: params.transport ?? null,
      pickup_location: params.pickup_location ?? null,
      drop_location: params.drop_location ?? null,
      remarks: params.remarks ?? null,
      inquiryId: params.inquiryId ?? null,
      price: params.price ?? null,
      totalPrice: params.totalPrice ?? null,
      isFeatured: false,
      isArchived: false,
    } as any,
    include: {
      location: { select: { id: true, label: true } },
    },
  });

  return query;
}

async function listTourQueries(params: {
  locationId?: string;
  customerName?: string;
  limit?: number;
}) {
  const { locationId, customerName, limit = 20 } = params;
  const result = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      ...(locationId && { locationId }),
      ...(customerName && { customerName: { contains: customerName } }),
    },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      customerNumber: true,
      tourCategory: true,
      numDaysNight: true,
      totalPrice: true,
      tourStartsFrom: true,
      tourEndsOn: true,
      remarks: true,
      confirmedVariantId: true,
      createdAt: true,
      location: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return result;
}

async function generateItinerary(params: {
  destination: string;
  nights: number;
  days: number;
  groupType: "family" | "couple" | "friends" | "solo" | "corporate" | "seniors";
  budgetCategory: "budget" | "mid-range" | "premium" | "luxury";
  specialRequirements?: string;
  customerName?: string;
  startDate?: string;
  numAdults?: number;
  numChildren?: number;
}) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Generate a detailed ${params.nights}-night/${params.days}-day tour itinerary for ${params.destination}.

Group type: ${params.groupType}
Budget: ${params.budgetCategory}
${params.customerName ? `Customer: ${params.customerName}` : ""}
${params.startDate ? `Start date: ${params.startDate}` : ""}
${params.numAdults ? `Adults: ${params.numAdults}` : ""}
${params.numChildren ? `Children: ${params.numChildren}` : ""}
${params.specialRequirements ? `Special requirements: ${params.specialRequirements}` : ""}

Output ONLY a valid JSON object with this structure:
{
  "tourPackageName": "string",
  "tourCategory": "Domestic" or "International",
  "tourPackageType": "string",
  "numDaysNight": "${params.nights} Nights / ${params.days} Days",
  "transport": "string",
  "pickup_location": "string",
  "drop_location": "string",
  "highlights": ["string"],
  "itineraries": [
    {
      "dayNumber": 1,
      "days": "Day 1",
      "itineraryTitle": "string",
      "itineraryDescription": "string",
      "mealsIncluded": "string",
      "activities": [{ "activityTitle": "string", "activityDescription": "string" }]
    }
  ]
}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  });

  const text = result.response.text().replace(/\n/g, " ").trim();
  return JSON.parse(text);
}

async function getStats(_params: Record<string, never>) {
  const [total, pending, active, confirmed, cancelled, totalQueries] =
    await Promise.all([
      prismadb.inquiry.count(),
      prismadb.inquiry.count({ where: { status: "NEW" } }),
      prismadb.inquiry.count({ where: { status: "ACTIVE" } }),
      prismadb.inquiry.count({ where: { status: "CONFIRMED" } }),
      prismadb.inquiry.count({ where: { status: "CANCELLED" } }),
      prismadb.tourPackageQuery.count({ where: { isArchived: false } }),
    ]);

  return {
    inquiries: { total, pending, active, confirmed, cancelled },
    tourQueries: { total: totalQueries },
  };
}

// ── Tool registry ────────────────────────────────────────────────────────────

const TOOLS: Record<string, (params: any) => Promise<unknown>> = {
  search_locations: searchLocations,
  list_tour_packages: listTourPackages,
  list_hotels: listHotels,
  create_inquiry: createInquiry,
  list_inquiries: listInquiries,
  get_inquiry: getInquiry,
  update_inquiry_status: updateInquiryStatus,
  add_inquiry_note: addInquiryNote,
  create_tour_query: createTourQuery,
  list_tour_queries: listTourQueries,
  generate_itinerary: generateItinerary,
  get_stats: getStats,
};

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!authenticateMcp(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { tool: string; params: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool, params = {} } = body;

  if (!tool) {
    return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
  }

  const handler = TOOLS[tool];
  if (!handler) {
    return NextResponse.json(
      {
        error: `Unknown tool: ${tool}`,
        availableTools: Object.keys(TOOLS),
      },
      { status: 400 }
    );
  }

  try {
    const result = await handler(params);
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error(`[MCP] Tool ${tool} failed:`, err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Allow health-check GET (no auth needed)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    server: "travel-admin-mcp-gateway",
    tools: Object.keys(TOOLS),
  });
}
