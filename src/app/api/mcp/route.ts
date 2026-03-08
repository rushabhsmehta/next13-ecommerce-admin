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
import { dateToUtc } from "@/lib/timezone-utils";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

// ── Auth ────────────────────────────────────────────────────────────────────

function authenticateMcp(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  if (!secret || !process.env.MCP_API_SECRET) return false;
  return secret === process.env.MCP_API_SECRET;
}

// ── Allowed status values ─────────────────────────────────────────────────────

const ALLOWED_INQUIRY_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"] as const;

// ── Custom error types ────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── Per-tool Zod schemas (server-side validation) ─────────────────────────────

const SearchLocationsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

const ListTourPackagesSchema = z.object({
  locationId: z.string().optional(),
  tourCategory: z.enum(["Domestic", "International"]).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const ListHotelsSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

const CreateInquirySchema = z.object({
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  numAdults: z.number().int().min(1),
  numChildrenAbove11: z.number().int().min(0).optional().default(0),
  numChildren5to11: z.number().int().min(0).optional().default(0),
  numChildrenBelow5: z.number().int().min(0).optional().default(0),
  journeyDate: z.string().refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date" }),
  remarks: z.string().optional(),
  status: z.enum(ALLOWED_INQUIRY_STATUSES).optional().default("PENDING"),
});

const ListInquiriesSchema = z.object({
  status: z.string().optional(),
  customerName: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(25),
});

const GetInquirySchema = z.object({ inquiryId: z.string().min(1) });

const UpdateInquiryStatusSchema = z.object({
  inquiryId: z.string().min(1),
  status: z.enum(ALLOWED_INQUIRY_STATUSES),
  remarks: z.string().optional(),
});

const AddInquiryNoteSchema = z.object({
  inquiryId: z.string().min(1),
  note: z.string().min(1),
  actionType: z.string().optional(),
});

const CreateTourQuerySchema = z.object({
  customerName: z.string().min(1),
  customerNumber: z.string().optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  numDaysNight: z.string().optional(),
  tourCategory: z.enum(["Domestic", "International"]).optional(),
  tourPackageQueryType: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  tourStartsFrom: z.string().refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date" }).optional(),
  tourEndsOn: z.string().refine((d) => !isNaN(Date.parse(d)), { message: "Invalid date" }).optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  remarks: z.string().optional(),
  inquiryId: z.string().optional(),
  price: z.string().optional(),
  totalPrice: z.string().optional(),
});

const ListTourQueriesSchema = z.object({
  locationId: z.string().optional(),
  customerName: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(20),
});

const GenerateItinerarySchema = z.object({
  destination: z.string().min(1),
  nights: z.number().int().min(1).max(30),
  days: z.number().int().min(1).max(31),
  groupType: z.enum(["family", "couple", "friends", "solo", "corporate", "seniors"]),
  budgetCategory: z.enum(["budget", "mid-range", "premium", "luxury"]),
  specialRequirements: z.string().optional(),
  customerName: z.string().optional(),
  startDate: z.string().optional(),
  numAdults: z.number().int().min(0).optional(),
  numChildren: z.number().int().min(0).optional(),
});

// ── Tool handlers ────────────────────────────────────────────────────────────

async function searchLocations(rawParams: unknown) {
  const params = SearchLocationsSchema.parse(rawParams);
  const { query, limit } = params;
  return prismadb.location.findMany({
    where: {
      isActive: true,
      label: { contains: query },
    },
    select: { id: true, label: true, value: true, slug: true },
    take: limit,
  });
}

async function listTourPackages(rawParams: unknown) {
  const params = ListTourPackagesSchema.parse(rawParams);
  const { locationId, tourCategory, limit } = params;
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

async function listHotels(rawParams: unknown) {
  const params = ListHotelsSchema.parse(rawParams);
  const { locationId, name, limit } = params;
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

async function createInquiry(rawParams: unknown) {
  const params = CreateInquirySchema.parse(rawParams);
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

  const journeyDate = dateToUtc(params.journeyDate);
  // dateToUtc returns undefined only when input is falsy; Zod already ensured journeyDate is a valid date string
  if (!journeyDate) throw new Error("Invalid journeyDate");

  const inquiry = await prismadb.inquiry.create({
    data: {
      customerName: params.customerName,
      customerMobileNumber: params.customerMobileNumber,
      locationId,
      numAdults: params.numAdults,
      numChildrenAbove11: params.numChildrenAbove11 ?? 0,
      numChildren5to11: params.numChildren5to11 ?? 0,
      numChildrenBelow5: params.numChildrenBelow5 ?? 0,
      journeyDate,
      remarks: params.remarks ?? null,
      status: params.status ?? "PENDING",
    },
    include: {
      location: { select: { id: true, label: true } },
    },
  });

  return inquiry;
}

async function listInquiries(rawParams: unknown) {
  const params = ListInquiriesSchema.parse(rawParams);
  const { status, limit, customerName } = params;
  return prismadb.inquiry.findMany({
    where: {
      ...(status && status !== "ALL" && { status }),
      ...(customerName && { customerName: { contains: customerName } }),
    },
    select: {
      id: true,
      customerName: true,
      customerMobileNumber: true,
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

async function getInquiry(rawParams: unknown) {
  const params = GetInquirySchema.parse(rawParams);
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
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`);
  return inquiry;
}

async function updateInquiryStatus(rawParams: unknown) {
  const params = UpdateInquiryStatusSchema.parse(rawParams);
  const existing = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`);

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

async function addInquiryNote(rawParams: unknown) {
  const params = AddInquiryNoteSchema.parse(rawParams);
  // Verify inquiry exists
  const inquiry = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`);

  return prismadb.inquiryAction.create({
    data: {
      inquiryId: params.inquiryId,
      actionType: params.actionType ?? "NOTE",
      remarks: params.note,
      actionDate: new Date(),
    },
  });
}

async function createTourQuery(rawParams: unknown) {
  const params = CreateTourQuerySchema.parse(rawParams);
  let locationId = params.locationId;

  if (!locationId && params.locationName) {
    const loc = await prismadb.location.findFirst({
      where: { isActive: true, label: { contains: params.locationName } },
    });
    if (!loc) throw new Error(`Location "${params.locationName}" not found. Use search_locations first.`);
    locationId = loc.id;
  }

  if (!locationId) throw new Error("locationId or locationName is required");

  // Generate a collision-resistant query number using milliseconds + random suffix
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const queryNumber = `TPQ-${datePart}-${Date.now()}-${randomSuffix}`;

  // Zod already validated the date strings; dateToUtc returns undefined only for falsy input
  const tourStartsFrom = params.tourStartsFrom ? dateToUtc(params.tourStartsFrom) ?? null : null;
  const tourEndsOn = params.tourEndsOn ? dateToUtc(params.tourEndsOn) ?? null : null;

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
      tourStartsFrom,
      tourEndsOn,
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

async function listTourQueries(rawParams: unknown) {
  const params = ListTourQueriesSchema.parse(rawParams);
  const { locationId, customerName, limit } = params;
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

async function generateItinerary(rawParams: unknown) {
  const params = GenerateItinerarySchema.parse(rawParams);
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

async function getStats(_rawParams: unknown) {
  const [total, pending, confirmed, cancelled, totalQueries] =
    await Promise.all([
      prismadb.inquiry.count(),
      prismadb.inquiry.count({ where: { status: "PENDING" } }),
      prismadb.inquiry.count({ where: { status: "CONFIRMED" } }),
      prismadb.inquiry.count({ where: { status: "CANCELLED" } }),
      prismadb.tourPackageQuery.count({ where: { isArchived: false } }),
    ]);

  return {
    inquiries: { total, pending, confirmed, cancelled },
    tourQueries: { total: totalQueries },
  };
}

// ── Tool registry ────────────────────────────────────────────────────────────

const TOOLS: Record<string, (params: unknown) => Promise<unknown>> = {
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
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { tool: string; params: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool, params = {} } = body;

  if (!tool) {
    return NextResponse.json({ success: false, error: "Missing tool name" }, { status: 400 });
  }

  const handler = TOOLS[tool];
  if (!handler) {
    return NextResponse.json(
      {
        success: false,
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

    // Zod validation errors → 422 Unprocessable Entity
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: err.flatten() },
        { status: 422 }
      );
    }

    // Not-found errors → 404
    if (err instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Health-check GET — requires the same x-mcp-api-secret to avoid leaking capability details
export async function GET(req: Request) {
  if (!authenticateMcp(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ok",
    server: "travel-admin-mcp-gateway",
    tools: Object.keys(TOOLS),
  });
}
