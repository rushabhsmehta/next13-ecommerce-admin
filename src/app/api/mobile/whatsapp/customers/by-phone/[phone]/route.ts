import { NextResponse } from "next/server";
import whatsappPrisma from "@/lib/whatsapp-prismadb";
import {
  normalizeWhatsAppPhone,
  updateWhatsAppCustomer,
} from "@/lib/whatsapp-customers";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ phone: string }>;
}

async function findCustomerByPhone(rawPhone: string) {
  const normalized = normalizeWhatsAppPhone(rawPhone);
  return whatsappPrisma.whatsAppCustomer.findFirst({
    where: {
      OR: [
        { phoneNumber: normalized },
        { phoneNumber: normalized.replace(/^\+/, "") },
        { phoneNumber: rawPhone },
      ],
    },
  });
}

function serialize(customer: Awaited<ReturnType<typeof findCustomerByPhone>>) {
  if (!customer) return null;
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName:
      [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
    phoneNumber: customer.phoneNumber,
    email: customer.email,
    tags: customer.tags ?? [],
    notes: customer.notes ?? null,
    isOptedIn: customer.isOptedIn,
    importedFrom: customer.importedFrom,
    associatePartnerId: customer.associatePartnerId,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    lastContactedAt: customer.lastContactedAt
      ? customer.lastContactedAt.toISOString()
      : null,
  };
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const rawPhone = decodeURIComponent(params.phone);
    const customer = await findCustomerByPhone(rawPhone);
    return NextResponse.json({ customer: serialize(customer) });
  } catch (error) {
    console.log("[MOBILE_WA_CUSTOMER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params;
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const rawPhone = decodeURIComponent(params.phone);
    const body = await req.json().catch(() => ({}));

    const existing = await findCustomerByPhone(rawPhone);
    if (!existing) {
      return new NextResponse("Customer not found", { status: 404 });
    }

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
      return NextResponse.json({ customer: serialize(existing) });
    }

    const updated = await updateWhatsAppCustomer(existing.id, update as any);
    return NextResponse.json({ customer: serialize(updated) });
  } catch (error: any) {
    console.log("[MOBILE_WA_CUSTOMER_PATCH]", error);
    return new NextResponse(error?.message ?? "Internal error", { status: 500 });
  }
}
