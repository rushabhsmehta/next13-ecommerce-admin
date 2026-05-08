import { NextResponse } from "next/server";
import {
  listWhatsAppCustomers,
  createWhatsAppCustomer,
  normalizeWhatsAppPhone,
} from "@/lib/whatsapp-customers";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parseTags(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  const tags = Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  );
  return tags.length > 0 ? tags : undefined;
}

function serialize(c: any) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName:
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || null,
    phoneNumber: c.phoneNumber,
    email: c.email,
    tags: c.tags ?? [],
    notes: c.notes ?? null,
    isOptedIn: c.isOptedIn,
    importedFrom: c.importedFrom,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    lastContactedAt:
      c.lastContactedAt instanceof Date
        ? c.lastContactedAt.toISOString()
        : c.lastContactedAt ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const tags = parseTags(searchParams.get("tags"));
    const optedInRaw = searchParams.get("optedIn");
    const isOptedIn =
      optedInRaw === "true"
        ? true
        : optedInRaw === "false"
          ? false
          : undefined;
    const limit = Math.min(
      Math.max(
        parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        1,
      ),
      MAX_LIMIT,
    );
    const page = Math.max(
      parseInt(searchParams.get("page") ?? "1", 10) || 1,
      1,
    );

    const result = await listWhatsAppCustomers({
      search,
      tags,
      isOptedIn,
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      items: result.data.map(serialize),
      total: result.total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
      tags: result.tags,
    });
  } catch (error) {
    console.log("[MOBILE_WA_CUSTOMERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, phoneNumber, email, tags, notes, isOptedIn } =
      body ?? {};

    if (!firstName || !phoneNumber) {
      return NextResponse.json(
        { error: "firstName and phoneNumber are required" },
        { status: 400 },
      );
    }

    try {
      const customer = await createWhatsAppCustomer({
        firstName,
        lastName,
        phoneNumber: normalizeWhatsAppPhone(phoneNumber),
        email,
        tags: Array.isArray(tags) ? tags : undefined,
        notes,
        isOptedIn: typeof isOptedIn === "boolean" ? isOptedIn : undefined,
        importedFrom: "mobile-admin",
        importedAt: new Date(),
      });
      return NextResponse.json(
        { customer: serialize(customer) },
        { status: 201 },
      );
    } catch (err: any) {
      if (err?.code === "P2002") {
        return NextResponse.json(
          { error: "Phone number already exists" },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.log("[MOBILE_WA_CUSTOMERS_POST]", error);
    return new NextResponse(error?.message ?? "Internal error", {
      status: 500,
    });
  }
}
