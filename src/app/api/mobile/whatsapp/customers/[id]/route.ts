import { NextResponse } from "next/server";
import {
  getWhatsAppCustomerById,
  updateWhatsAppCustomer,
} from "@/lib/whatsapp-customers";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    createdAt:
      c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt:
      c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    lastContactedAt:
      c.lastContactedAt instanceof Date
        ? c.lastContactedAt.toISOString()
        : c.lastContactedAt ?? null,
  };
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const customer = await getWhatsAppCustomerById(id);
    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }
    return NextResponse.json({ customer: serialize(customer) });
  } catch (error) {
    console.log("[MOBILE_WA_CUSTOMER_BY_ID_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (body.firstName !== undefined) update.firstName = body.firstName;
    if (body.lastName !== undefined) update.lastName = body.lastName;
    if (body.email !== undefined) update.email = body.email;
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.isOptedIn !== undefined) update.isOptedIn = !!body.isOptedIn;
    if (Array.isArray(body.tags)) {
      update.tags = Array.from(
        new Set(
          body.tags
            .filter((t: unknown) => typeof t === "string")
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0),
        ),
      );
    }

    if (Object.keys(update).length === 0) {
      const existing = await getWhatsAppCustomerById(id);
      if (!existing) return new NextResponse("Customer not found", { status: 404 });
      return NextResponse.json({ customer: serialize(existing) });
    }

    const updated = await updateWhatsAppCustomer(id, update as any);
    return NextResponse.json({ customer: serialize(updated) });
  } catch (error: any) {
    console.log("[MOBILE_WA_CUSTOMER_BY_ID_PATCH]", error);
    return new NextResponse(error?.message ?? "Internal error", {
      status: 500,
    });
  }
}
