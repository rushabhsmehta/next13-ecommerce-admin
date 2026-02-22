import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ supplierId: string }> }) {
  const params = await props.params;
  try {
    if (!params.supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    const supplier = await prismadb.supplier.findUnique({
        where: { id: params.supplierId },
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
              location: true
            }
          },
          contacts: {
            select: {
              id: true,
              number: true,
              label: true,
              isPrimary: true
            }
          }
        },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ supplierId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.supplierId) return new NextResponse("Supplier ID is required", { status: 400 });

    const supplier = await prismadb.supplier.delete({
      where: { id: params.supplierId },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[SUPPLIER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ supplierId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });
    if (!params.supplierId) return new NextResponse("Supplier ID is required", { status: 400 });

    const body = await req.json();
    const { name, contact, email, locationIds, gstNumber, address, contacts } = body;
    if (!name) return new NextResponse("Name is required", { status: 400 });

    // Delete existing supplier-location relationships
    await prismadb.supplierLocation.deleteMany({
      where: { supplierId: params.supplierId }
    });
    // Delete existing supplier contacts and recreate if provided
    await prismadb.supplierContact.deleteMany({ where: { supplierId: params.supplierId } });
    
    // Create new supplier-location relationships
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

    const supplier = await prismadb.supplier.update({
      where: { id: params.supplierId },
      data: {
        name,
        contact,
        email,
        gstNumber,
        address,
        ...locationData,
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
    console.log("[SUPPLIER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
