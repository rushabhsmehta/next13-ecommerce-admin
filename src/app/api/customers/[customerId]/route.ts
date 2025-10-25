import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { normalizePhoneNumber } from "@/lib/phone-utils";
import { upsertWhatsAppCustomers } from "@/lib/whatsapp-customers";

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "" };
  }

  const parts = trimmed.split(/\s+/);
  const firstName = parts.shift() || "";
  const lastName = parts.length ? parts.join(" ") : undefined;

  return { firstName, lastName };
}

async function syncWhatsAppCustomer(params: {
  name: string;
  phone: string;
  email?: string | null;
  customerId: string;
}) {
  const { firstName, lastName } = splitName(params.name);

  try {
    await upsertWhatsAppCustomers(
      [
        {
          firstName: firstName || params.name,
          lastName: lastName ?? null,
          phoneNumber: params.phone,
          email: params.email ?? undefined,
          metadata: { crmCustomerId: params.customerId },
          importedFrom: "crm",
          importedAt: new Date(),
        },
      ],
      { importedFrom: "crm" }
    );
  } catch (error) {
    console.error("[CUSTOMERS_WHATSAPP_SYNC]", error);
  }
}

export async function GET(
  req: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    if (!params.customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const customer = await prismadb.customer.findUnique({
      where: { id: params.customerId },
      include: {
        associatePartner: true
      }
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[CUSTOMER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.customerId) return new NextResponse("Customer ID is required", { status: 400 });

    const customer = await prismadb.customer.delete({
      where: { id: params.customerId },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[CUSTOMER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { customerId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.customerId) return new NextResponse("Customer ID is required", { status: 400 });

    const body = await req.json();
    const { name, contact, email, associatePartnerId, birthdate, marriageAnniversary } = body;
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName) return new NextResponse("Name is required", { status: 400 });

    const normalizedEmail = typeof email === "string" && email.trim().length > 0 ? email.trim() : null;
    const sanitizedPartnerId =
      typeof associatePartnerId === "string" && associatePartnerId.trim().length > 0
        ? associatePartnerId.trim()
        : null;

    let contactValue: string | null = null;
    let shouldUpdateContact = false;

    if (contact !== undefined) {
      shouldUpdateContact = true;
      if (typeof contact === "string" && contact.trim().length > 0) {
        const normalizedContact = normalizePhoneNumber(contact);
        if (!normalizedContact) {
          return new NextResponse("Invalid contact number", { status: 400 });
        }
        contactValue = normalizedContact.e164;
      } else {
        contactValue = null;
      }
    }

    const updateData: Prisma.CustomerUpdateInput = {
      name: normalizedName,
      email: normalizedEmail,
      birthdate: dateToUtc(birthdate),
      marriageAnniversary: dateToUtc(marriageAnniversary),
    };

    if (shouldUpdateContact) {
      updateData.contact = contactValue;
    }

    if (associatePartnerId !== undefined) {
      updateData.associatePartner = sanitizedPartnerId
        ? { connect: { id: sanitizedPartnerId } }
        : { disconnect: true };
    }

    const customer = await prismadb.customer.update({
      where: { id: params.customerId },
      data: updateData,
      include: {
        associatePartner: true,
      },
    });

    if (contactValue) {
      await syncWhatsAppCustomer({
        name: normalizedName,
        phone: contactValue,
        email: normalizedEmail,
        customerId: customer.id,
      });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[CUSTOMER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
