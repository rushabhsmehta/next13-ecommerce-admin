import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { assertCrmApiAccessForRequest, crmAccessErrorResponse } from "@/lib/crm-route-access";
import { formatSupplierEmails, isValidEmailAddress, parseSupplierEmails } from "@/lib/supplier-emails";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    const body = await req.json();
    const { name, contact, email, emails, locationIds, gstNumber, address, contacts, phoneNumber } = body;

    // Validation
    if (!name) return new NextResponse("Name is required", { status: 400 });

    const emailList = Array.isArray(emails)
      ? parseSupplierEmails(emails.join(","))
      : parseSupplierEmails(email ?? "");
    const invalidEmails = emailList.filter((e) => !isValidEmailAddress(e));
    if (invalidEmails.length > 0) {
      return new NextResponse(`Invalid email: ${invalidEmails.join(", ")}`, { status: 400 });
    }
    const normalizedEmail = formatSupplierEmails(emailList);

    // Define location connections if provided
    let locationData = {};
    if (locationIds && locationIds.length > 0) {
      locationData = {
        locations: {
          create: locationIds.map((locationId: string) => ({
            location: {
              connect: { id: locationId }
            }
          }))
        }
      };
    }

    // Create new supplier entry with associated locations
    const supplierContactCreates = [
      ...(phoneNumber && String(phoneNumber).trim()
        ? [{ number: String(phoneNumber).trim(), isPrimary: true }]
        : []),
      ...(contacts && contacts.length > 0
        ? contacts.map((num: string) => ({ number: String(num), isPrimary: false }))
        : []),
    ];

    const supplier = await prismadb.supplier.create({
      data: {
        name,
        contact,
        email: normalizedEmail,
        gstNumber,
        address,
        ...locationData,
        contacts: supplierContactCreates.length > 0 ? {
          create: supplierContactCreates
        } : undefined
      },
      include: {
        locations: {
          include: {
            location: true
          }
        },
        contacts: true
      }
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Fetch all suppliers with locations
    const suppliers = await prismadb.supplier.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        gstNumber: true,
        address: true,
        email: true,
        createdAt: true,
        locations: {
          select: {
            location: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        contacts: {
          select: {
            number: true,
            label: true,
            isPrimary: true
          }
        }
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.log("[SUPPLIERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

