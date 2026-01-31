import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { name, contact, email, locationIds, gstNumber, address, contacts } = body;

    // Validation
    if (!name) return new NextResponse("Name is required", { status: 400 });

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
    const supplier = await prismadb.supplier.create({
      data: {
        name,
        contact,
        email,
        gstNumber,
        address,
        ...locationData,
        // Create supplier contact records if provided
        contacts: contacts && contacts.length > 0 ? {
          create: contacts.map((num: string) => ({ number: String(num) }))
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

