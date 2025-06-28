import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";

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
    if (!name) return new NextResponse("Name is required", { status: 400 });

    const customer = await prismadb.customer.update({
      where: { id: params.customerId },
      data: { 
        name, 
        contact, 
        email,
        associatePartnerId: associatePartnerId || null,
        birthdate: dateToUtc(birthdate),
        marriageAnniversary: dateToUtc(marriageAnniversary),
      },
      include: {
        associatePartner: true
      }
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.log("[CUSTOMER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
