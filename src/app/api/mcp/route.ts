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
import { INQUIRY_STATUSES } from "@/lib/inquiry-statuses";

export const dynamic = "force-dynamic";

// ── Auth ────────────────────────────────────────────────────────────────────

function authenticateMcp(req: Request): boolean {
  const secret = req.headers.get("x-mcp-api-secret");
  if (!secret || !process.env.MCP_API_SECRET) return false;
  return secret === process.env.MCP_API_SECRET;
}

// ── Allowed status values (imported from shared lib) ─────────────────────────

const ALLOWED_INQUIRY_STATUSES = INQUIRY_STATUSES;

// ── Custom error types ────────────────────────────────────────────────────────

class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusHint: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "McpError";
  }
}

class NotFoundError extends McpError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, code, 404);
    this.name = "NotFoundError";
  }
}

// ── Prisma error mapper ───────────────────────────────────────────────────────

function mapPrismaError(err: unknown): McpError | null {
  if (typeof err !== "object" || err === null || !("code" in err)) return null;
  const c = (err as any).code as string;
  const meta = (err as any).meta as Record<string, unknown> | undefined;
  switch (c) {
    case "P2002": {
      const fields = Array.isArray(meta?.target) ? (meta!.target as string[]).join(", ") : "unknown";
      return new McpError(
        `Duplicate value: a record with this ${fields} already exists`,
        "DB_CONSTRAINT", 409, { prismaCode: c, fields }
      );
    }
    case "P2025":
      return new McpError("Record not found or already deleted", "NOT_FOUND", 404, { prismaCode: c });
    case "P2003": {
      const field = meta?.field_name ?? "unknown";
      return new McpError(
        `Foreign key constraint failed on: ${field}`,
        "DB_CONSTRAINT", 409, { prismaCode: c, field }
      );
    }
    case "P2000": {
      const field = meta?.column_name ?? "unknown";
      return new McpError(
        `Value too long for field: ${field}`,
        "DB_VALUE_TOO_LONG", 422, { prismaCode: c, field }
      );
    }
    default: return null;
  }
}

// ── Zod error summarizer ──────────────────────────────────────────────────────

function summarizeZodError(err: ZodError): string {
  const flat = err.flatten();
  const parts = [
    ...Object.entries(flat.fieldErrors).slice(0, 3).map(([f, m]) => `${f}: ${(m ?? []).join("; ")}`),
    ...flat.formErrors.slice(0, 2),
  ];
  return parts.length ? parts.join(" | ") : "Invalid parameters";
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

// ISO date-only string (YYYY-MM-DD) — matches what parseISO() expects in dateToUtc()
const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" });

const CreateInquirySchema = z.object({
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  numAdults: z.number().int().min(1),
  numChildrenAbove11: z.number().int().min(0).optional().default(0),
  numChildren5to11: z.number().int().min(0).optional().default(0),
  numChildrenBelow5: z.number().int().min(0).optional().default(0),
  journeyDate: isoDateString,
  remarks: z.string().optional(),
  status: z.enum(ALLOWED_INQUIRY_STATUSES).optional().default("PENDING"),
}).refine((d: { locationId?: string; locationName?: string }) => !!(d.locationId || d.locationName), {
  message: "locationId or locationName is required",
  path: ["locationId"],
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
  tourStartsFrom: isoDateString.optional(),
  tourEndsOn: isoDateString.optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  remarks: z.string().optional(),
  inquiryId: z.string().optional(),
  price: z.string().optional(),
  totalPrice: z.string().optional(),
}).refine((d: { locationId?: string; locationName?: string }) => !!(d.locationId || d.locationName), {
  message: "locationId or locationName is required",
  path: ["locationId"],
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

// ── Accounts schemas ──────────────────────────────────────────────────────────

const ListAccountsSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const GetAccountTransactionsSchema = z.object({
  accountId: z.string().min(1),
  accountType: z.enum(["bank", "cash"]),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

const GetFinancialSummarySchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const CreatePaymentSchema = z.object({
  paymentDate: isoDateString,
  amount: z.number().positive(),
  // Required: payments must be tied to a confirmed tour package query
  tourPackageQueryId: z.string().min(1, "tourPackageQueryId is required — use list_tour_queries to find the confirmed tour query ID"),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  method: z.string().optional(),
  transactionId: z.string().optional(),
  remarks: z.string().optional(),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  paymentType: z.enum(["supplier_payment", "customer_refund"]).optional().default("supplier_payment"),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateReceiptSchema = z.object({
  receiptDate: isoDateString,
  amount: z.number().positive(),
  // Required: receipts must be tied to a confirmed tour package query
  tourPackageQueryId: z.string().min(1, "tourPackageQueryId is required — use list_tour_queries to find the confirmed tour query ID"),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  reference: z.string().optional(),
  remarks: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  receiptType: z.string().optional().default("customer_receipt"),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateExpenseSchema = z.object({
  expenseDate: isoDateString,
  amount: z.number().positive(),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  expenseCategoryName: z.string().optional(),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateIncomeSchema = z.object({
  incomeDate: isoDateString,
  amount: z.number().positive(),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  incomeCategoryId: z.string().optional(),
  incomeCategoryName: z.string().optional(),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateTransferSchema = z.object({
  transferDate: isoDateString,
  amount: z.number().positive(),
  fromBankAccountId: z.string().optional(),
  fromBankAccountName: z.string().optional(),
  fromCashAccountId: z.string().optional(),
  fromCashAccountName: z.string().optional(),
  toBankAccountId: z.string().optional(),
  toBankAccountName: z.string().optional(),
  toCashAccountId: z.string().optional(),
  toCashAccountName: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (d) => !!(d.fromBankAccountId || d.fromBankAccountName || d.fromCashAccountId || d.fromCashAccountName),
  { message: "Provide a source account (fromBankAccountId/Name or fromCashAccountId/Name)", path: ["fromBankAccountId"] }
).refine(
  (d) => !!(d.toBankAccountId || d.toBankAccountName || d.toCashAccountId || d.toCashAccountName),
  { message: "Provide a destination account (toBankAccountId/Name or toCashAccountId/Name)", path: ["toBankAccountId"] }
);

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
    if (!loc) throw new NotFoundError(
      `Location "${params.locationName}" not found. Call search_locations first to find the correct name.`,
      "LOCATION_NOT_FOUND"
    );
    locationId = loc.id;
  }

  // locationId is guaranteed by the Zod refine — narrowing for TypeScript
  const resolvedLocationId = locationId!;

  const journeyDate = dateToUtc(params.journeyDate);
  // dateToUtc returns undefined only when input is falsy; Zod already ensured journeyDate is a valid date string
  if (!journeyDate) throw new Error("Invalid journeyDate");

  const inquiry = await prismadb.inquiry.create({
    data: {
      customerName: params.customerName,
      customerMobileNumber: params.customerMobileNumber,
      locationId: resolvedLocationId,
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
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");
  return inquiry;
}

async function updateInquiryStatus(rawParams: unknown) {
  const params = UpdateInquiryStatusSchema.parse(rawParams);
  const existing = await prismadb.inquiry.findUnique({
    where: { id: params.inquiryId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");

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
  if (!inquiry) throw new NotFoundError(`Inquiry ${params.inquiryId} not found`, "INQUIRY_NOT_FOUND");

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
    if (!loc) throw new NotFoundError(
      `Location "${params.locationName}" not found. Call search_locations first to find the correct name.`,
      "LOCATION_NOT_FOUND"
    );
    locationId = loc.id;
  }

  // locationId is guaranteed by the Zod refine — narrowing for TypeScript
  const resolvedLocationId = locationId!;

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
      locationId: resolvedLocationId,
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

  let text: string;
  try {
    text = result.response.text().replace(/\n/g, " ").trim();
  } catch (e) {
    throw new McpError("Gemini returned an empty or inaccessible response", "AI_GENERATION_FAILED", 502, { cause: String(e) });
  }

  // Strip markdown code fences Gemini sometimes emits despite responseMimeType: "application/json"
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[MCP] generateItinerary: non-JSON from Gemini:", jsonText.slice(0, 300));
    throw new McpError(
      `AI returned malformed JSON. Snippet: ${jsonText.slice(0, 120)}`,
      "AI_PARSE_ERROR", 502, { rawSnippet: jsonText.slice(0, 300) }
    );
  }
}

// ── Account resolution helper ─────────────────────────────────────────────────

type ResolvedAccount = { type: "bank"; id: string } | { type: "cash"; id: string };

async function resolveAccount(opts: {
  bankAccountId?: string;
  bankAccountName?: string;
  cashAccountId?: string;
  cashAccountName?: string;
}): Promise<ResolvedAccount> {
  const { bankAccountId, bankAccountName, cashAccountId, cashAccountName } = opts;

  if (bankAccountId) {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: bankAccountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Bank account "${bankAccountId}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "bank", id: acct.id };
  }
  if (cashAccountId) {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: cashAccountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Cash account "${cashAccountId}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "cash", id: acct.id };
  }
  if (bankAccountName) {
    const acct = await prismadb.bankAccount.findFirst({
      where: { accountName: { contains: bankAccountName }, isActive: true },
      select: { id: true },
    });
    if (!acct) throw new NotFoundError(`Bank account named "${bankAccountName}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "bank", id: acct.id };
  }
  if (cashAccountName) {
    const acct = await prismadb.cashAccount.findFirst({
      where: { accountName: { contains: cashAccountName }, isActive: true },
      select: { id: true },
    });
    if (!acct) throw new NotFoundError(`Cash account named "${cashAccountName}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "cash", id: acct.id };
  }
  throw new McpError("No account specified", "VALIDATION_ERROR", 400);
}

// ── Accounts handlers ─────────────────────────────────────────────────────────

async function listAccounts(rawParams: unknown) {
  const params = ListAccountsSchema.parse(rawParams);
  const where = params.includeInactive ? {} : { isActive: true };

  const [bankAccounts, cashAccounts] = await Promise.all([
    prismadb.bankAccount.findMany({
      where,
      select: {
        id: true,
        accountName: true,
        bankName: true,
        accountNumber: true,
        branch: true,
        openingBalance: true,
        currentBalance: true,
        isActive: true,
      },
      orderBy: { accountName: "asc" },
    }),
    prismadb.cashAccount.findMany({
      where,
      select: {
        id: true,
        accountName: true,
        openingBalance: true,
        currentBalance: true,
        isActive: true,
      },
      orderBy: { accountName: "asc" },
    }),
  ]);

  return {
    bankAccounts: bankAccounts.map((a) => ({ ...a, type: "bank" })),
    cashAccounts: cashAccounts.map((a) => ({ ...a, type: "cash" })),
    totalBalance:
      bankAccounts.reduce((s, a) => s + a.currentBalance, 0) +
      cashAccounts.reduce((s, a) => s + a.currentBalance, 0),
  };
}

async function getAccountTransactions(rawParams: unknown) {
  const params = GetAccountTransactionsSchema.parse(rawParams);
  const { accountId, accountType, limit } = params;

  if (accountType === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: accountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Bank account ${accountId} not found`, "ACCOUNT_NOT_FOUND");
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: accountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Cash account ${accountId} not found`, "ACCOUNT_NOT_FOUND");
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.startDate) { const d = dateToUtc(params.startDate); if (d) dateFilter.gte = d; }
  if (params.endDate) {
    const d = dateToUtc(params.endDate);
    if (d) { d.setUTCHours(23, 59, 59, 999); dateFilter.lte = d; }
  }
  const hasDates = Object.keys(dateFilter).length > 0;

  const bankFilter = accountType === "bank" ? { bankAccountId: accountId } : { cashAccountId: accountId };

  const [receipts, payments, incomes, expenses, transfersIn, transfersOut] = await Promise.all([
    prismadb.receiptDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { receiptDate: dateFilter }) },
      select: { id: true, receiptDate: true, amount: true, receiptType: true, reference: true, note: true, customer: { select: { id: true, name: true } } },
      orderBy: { receiptDate: "desc" },
      take: limit,
    }),
    prismadb.paymentDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { paymentDate: dateFilter }) },
      select: { id: true, paymentDate: true, amount: true, paymentType: true, method: true, transactionId: true, note: true, supplier: { select: { id: true, name: true } } },
      orderBy: { paymentDate: "desc" },
      take: limit,
    }),
    prismadb.incomeDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { incomeDate: dateFilter }) },
      select: { id: true, incomeDate: true, amount: true, description: true, incomeCategory: { select: { id: true, name: true } } },
      orderBy: { incomeDate: "desc" },
      take: limit,
    }),
    prismadb.expenseDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { expenseDate: dateFilter }) },
      select: { id: true, expenseDate: true, amount: true, description: true, isAccrued: true, expenseCategory: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
      take: limit,
    }),
    prismadb.transfer.findMany({
      where: {
        ...(accountType === "bank" ? { toBankAccountId: accountId } : { toCashAccountId: accountId }),
        ...(hasDates && { transferDate: dateFilter }),
      },
      select: { id: true, transferDate: true, amount: true, reference: true, description: true, fromBankAccount: { select: { id: true, accountName: true } }, fromCashAccount: { select: { id: true, accountName: true } } },
      orderBy: { transferDate: "desc" },
      take: limit,
    }),
    prismadb.transfer.findMany({
      where: {
        ...(accountType === "bank" ? { fromBankAccountId: accountId } : { fromCashAccountId: accountId }),
        ...(hasDates && { transferDate: dateFilter }),
      },
      select: { id: true, transferDate: true, amount: true, reference: true, description: true, toBankAccount: { select: { id: true, accountName: true } }, toCashAccount: { select: { id: true, accountName: true } } },
      orderBy: { transferDate: "desc" },
      take: limit,
    }),
  ]);

  return {
    receipts: receipts.map((r) => ({ ...r, txType: "receipt", isInflow: true })),
    payments: payments.map((p) => ({ ...p, txType: "payment", isInflow: false })),
    incomes: incomes.map((i) => ({ ...i, txType: "income", isInflow: true })),
    expenses: expenses.map((e) => ({ ...e, txType: "expense", isInflow: false })),
    transfersIn: transfersIn.map((t) => ({ ...t, txType: "transfer_in", isInflow: true })),
    transfersOut: transfersOut.map((t) => ({ ...t, txType: "transfer_out", isInflow: false })),
  };
}

async function getFinancialSummary(rawParams: unknown) {
  const params = GetFinancialSummarySchema.parse(rawParams);
  const now = new Date();
  const startDate = params.startDate
    ? (dateToUtc(params.startDate) ?? new Date(now.getFullYear(), now.getMonth(), 1))
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = params.endDate
    ? (() => { const d = dateToUtc(params.endDate)!; d.setUTCHours(23, 59, 59, 999); return d; })()
    : now;
  const dateRange = { gte: startDate, lte: endDate };

  const [bankAccounts, cashAccounts, receipts, payments, incomes, expenses] = await Promise.all([
    prismadb.bankAccount.findMany({ where: { isActive: true }, select: { id: true, accountName: true, currentBalance: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true }, select: { id: true, accountName: true, currentBalance: true } }),
    prismadb.receiptDetail.findMany({ where: { receiptDate: dateRange }, select: { amount: true } }),
    prismadb.paymentDetail.findMany({ where: { paymentDate: dateRange }, select: { amount: true } }),
    prismadb.incomeDetail.findMany({ where: { incomeDate: dateRange }, select: { amount: true } }),
    prismadb.expenseDetail.findMany({ where: { expenseDate: dateRange, isAccrued: false }, select: { amount: true } }),
  ]);

  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const bankBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const cashBalance = cashAccounts.reduce((s, a) => s + a.currentBalance, 0);

  return {
    period: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
    inflows: { receipts: totalReceipts, incomes: totalIncome, total: totalReceipts + totalIncome },
    outflows: { payments: totalPayments, expenses: totalExpenses, total: totalPayments + totalExpenses },
    netCashFlow: totalReceipts + totalIncome - totalPayments - totalExpenses,
    balances: {
      bankTotal: bankBalance,
      cashTotal: cashBalance,
      grandTotal: bankBalance + cashBalance,
      accounts: [
        ...bankAccounts.map((a) => ({ type: "bank", ...a })),
        ...cashAccounts.map((a) => ({ type: "cash", ...a })),
      ],
    },
  };
}

// ── Tour query confirmation guard ─────────────────────────────────────────────

/**
 * Validates that a tour package query exists and is confirmed (confirmedVariantId is set).
 * Required before recording any financial transaction against a tour query.
 */
async function validateConfirmedTourQuery(tourPackageQueryId: string) {
  const query = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      confirmedVariantId: true,
      isArchived: true,
    },
  });
  if (!query) throw new NotFoundError(
    `Tour package query "${tourPackageQueryId}" not found. Use list_tour_queries to find the correct ID.`,
    "TOUR_QUERY_NOT_FOUND"
  );
  if (query.isArchived) throw new McpError(
    `Tour package query "${query.tourPackageQueryNumber ?? tourPackageQueryId}" is archived and cannot accept financial entries.`,
    "TOUR_QUERY_ARCHIVED", 422
  );
  if (!query.confirmedVariantId) throw new McpError(
    `Tour package query "${query.tourPackageQueryNumber ?? tourPackageQueryId}" (customer: ${query.customerName ?? "unknown"}) is not yet confirmed. Financial entries can only be recorded against confirmed tour queries.`,
    "TOUR_QUERY_NOT_CONFIRMED", 422,
    { queryId: query.id, queryNumber: query.tourPackageQueryNumber, customerName: query.customerName }
  );
  return query;
}

async function createPayment(rawParams: unknown) {
  const params = CreatePaymentSchema.parse(rawParams);

  // tourPackageQueryId is required and query must be confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  const paymentDate = dateToUtc(params.paymentDate);
  if (!paymentDate) throw new McpError("Invalid paymentDate", "VALIDATION_ERROR", 422);

  const payment = await prismadb.paymentDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      paymentDate,
      amount: params.amount,
      method: params.method ?? null,
      transactionId: params.transactionId ?? null,
      note: params.remarks ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      supplierId: params.supplierId ?? null,
      customerId: params.customerId ?? null,
      paymentType: params.paymentType ?? "supplier_payment",
    },
  });

  // Outflow: subtract from account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  }

  return {
    ...payment,
    accountType: account.type,
    accountId: account.id,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function createReceipt(rawParams: unknown) {
  const params = CreateReceiptSchema.parse(rawParams);

  // tourPackageQueryId is required and query must be confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  const receiptDate = dateToUtc(params.receiptDate);
  if (!receiptDate) throw new McpError("Invalid receiptDate", "VALIDATION_ERROR", 422);

  const receipt = await prismadb.receiptDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      receiptDate,
      amount: params.amount,
      reference: params.reference ?? null,
      note: params.remarks ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      customerId: params.customerId ?? null,
      supplierId: params.supplierId ?? null,
      receiptType: params.receiptType ?? "customer_receipt",
    },
  });

  // Inflow: add to account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  }

  return {
    ...receipt,
    accountType: account.type,
    accountId: account.id,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function createExpense(rawParams: unknown) {
  const params = CreateExpenseSchema.parse(rawParams);
  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  // If tourPackageQueryId provided, it must belong to a confirmed query
  let tourQuery: { id: string; tourPackageQueryNumber: string | null; customerName: string | null } | null = null;
  if (params.tourPackageQueryId) {
    tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);
  }

  let expenseCategoryId = params.expenseCategoryId ?? null;
  if (!expenseCategoryId && params.expenseCategoryName) {
    const cat = await prismadb.expenseCategory.findFirst({
      where: { name: { contains: params.expenseCategoryName }, isActive: true },
      select: { id: true },
    });
    if (!cat) throw new NotFoundError(`Expense category "${params.expenseCategoryName}" not found`, "CATEGORY_NOT_FOUND");
    expenseCategoryId = cat.id;
  }

  const expenseDate = dateToUtc(params.expenseDate);
  if (!expenseDate) throw new McpError("Invalid expenseDate", "VALIDATION_ERROR", 422);

  const expense = await prismadb.expenseDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      expenseDate,
      amount: params.amount,
      expenseCategoryId,
      description: params.description ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      isAccrued: false,
    },
  });

  // Outflow: subtract from account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  }

  return {
    ...expense,
    accountType: account.type,
    accountId: account.id,
    ...(tourQuery && { tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName } }),
  };
}

async function createIncome(rawParams: unknown) {
  const params = CreateIncomeSchema.parse(rawParams);
  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  // If tourPackageQueryId provided, it must belong to a confirmed query
  let tourQuery: { id: string; tourPackageQueryNumber: string | null; customerName: string | null } | null = null;
  if (params.tourPackageQueryId) {
    tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);
  }

  let incomeCategoryId = params.incomeCategoryId ?? null;
  if (!incomeCategoryId && params.incomeCategoryName) {
    const cat = await prismadb.incomeCategory.findFirst({
      where: { name: { contains: params.incomeCategoryName }, isActive: true },
      select: { id: true },
    });
    if (!cat) throw new NotFoundError(`Income category "${params.incomeCategoryName}" not found`, "CATEGORY_NOT_FOUND");
    incomeCategoryId = cat.id;
  }

  const incomeDate = dateToUtc(params.incomeDate);
  if (!incomeDate) throw new McpError("Invalid incomeDate", "VALIDATION_ERROR", 422);

  const income = await prismadb.incomeDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      incomeDate,
      amount: params.amount,
      incomeCategoryId,
      description: params.description ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
    },
  });

  // Inflow: add to account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  }

  return {
    ...income,
    accountType: account.type,
    accountId: account.id,
    ...(tourQuery && { tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName } }),
  };
}

async function createTransfer(rawParams: unknown) {
  const params = CreateTransferSchema.parse(rawParams);

  const fromAccount = await resolveAccount({
    bankAccountId: params.fromBankAccountId,
    bankAccountName: params.fromBankAccountName,
    cashAccountId: params.fromCashAccountId,
    cashAccountName: params.fromCashAccountName,
  });
  const toAccount = await resolveAccount({
    bankAccountId: params.toBankAccountId,
    bankAccountName: params.toBankAccountName,
    cashAccountId: params.toCashAccountId,
    cashAccountName: params.toCashAccountName,
  });

  if (fromAccount.type === toAccount.type && fromAccount.id === toAccount.id) {
    throw new McpError("Cannot transfer to the same account", "VALIDATION_ERROR", 400);
  }

  const transferDate = dateToUtc(params.transferDate);
  if (!transferDate) throw new McpError("Invalid transferDate", "VALIDATION_ERROR", 422);

  const transfer = await prismadb.transfer.create({
    data: {
      transferDate,
      amount: params.amount,
      reference: params.reference ?? null,
      description: params.description ?? null,
      fromBankAccountId: fromAccount.type === "bank" ? fromAccount.id : null,
      fromCashAccountId: fromAccount.type === "cash" ? fromAccount.id : null,
      toBankAccountId: toAccount.type === "bank" ? toAccount.id : null,
      toCashAccountId: toAccount.type === "cash" ? toAccount.id : null,
    },
    include: {
      fromBankAccount: { select: { id: true, accountName: true } },
      fromCashAccount: { select: { id: true, accountName: true } },
      toBankAccount: { select: { id: true, accountName: true } },
      toCashAccount: { select: { id: true, accountName: true } },
    },
  });

  // Update source account — outflow
  if (fromAccount.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: fromAccount.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: fromAccount.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: fromAccount.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: fromAccount.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  }

  // Update destination account — inflow
  if (toAccount.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: toAccount.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: toAccount.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: toAccount.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: toAccount.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  }

  return transfer;
}

async function getStats(_rawParams: unknown) {
  let counts: [number, number, number, number, number, number, number];
  try {
    counts = await Promise.all([
      prismadb.inquiry.count(),
      prismadb.inquiry.count({ where: { status: "PENDING" } }),
      prismadb.inquiry.count({ where: { status: "CONFIRMED" } }),
      prismadb.inquiry.count({ where: { status: "CANCELLED" } }),
      prismadb.inquiry.count({ where: { status: "HOT_QUERY" } }),
      prismadb.inquiry.count({ where: { status: "QUERY_SENT" } }),
      prismadb.tourPackageQuery.count({ where: { isArchived: false } }),
    ]);
  } catch (err) {
    const pe = mapPrismaError(err);
    if (pe) throw pe;
    throw new McpError(
      "Failed to fetch dashboard statistics from the database",
      "INTERNAL_ERROR", 500,
      { cause: err instanceof Error ? err.message : String(err) }
    );
  }
  const [total, pending, confirmed, cancelled, hotQuery, querySent, totalQueries] = counts;
  return {
    inquiries: { total, pending, confirmed, cancelled, hotQuery, querySent },
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
  list_accounts: listAccounts,
  get_account_transactions: getAccountTransactions,
  get_financial_summary: getFinancialSummary,
  create_payment: createPayment,
  create_receipt: createReceipt,
  create_expense: createExpense,
  create_income: createIncome,
  create_transfer: createTransfer,
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
    console.error(`[MCP] Tool ${tool} failed:`, err);

    // Zod validation errors → 422 Unprocessable Entity
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${summarizeZodError(err)}`,
          code: "VALIDATION_ERROR",
          details: err.flatten(),
        },
        { status: 422 }
      );
    }

    // Typed McpError hierarchy (includes NotFoundError, etc.)
    if (err instanceof McpError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: err.code,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
        { status: err.statusHint }
      );
    }

    // Prisma-specific errors
    const pe = mapPrismaError(err);
    if (pe) {
      return NextResponse.json(
        { success: false, error: pe.message, code: pe.code, details: pe.details },
        { status: pe.statusHint }
      );
    }

    // Generic fallback
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message, code: "INTERNAL_ERROR" }, { status: 500 });
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
