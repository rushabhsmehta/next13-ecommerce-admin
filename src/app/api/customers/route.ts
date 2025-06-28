import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const body = await req.json();
    const { name, contact, email, associatePartnerId, birthdate, marriageAnniversary } = body;
    if (!name) return new NextResponse("Name is required", { status: 400 });

    // Create new customer entry
    const customer = await prismadb.customer.create({
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
    console.log("[CUSTOMERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    // Get search params for filtering
    const { searchParams } = new URL(req.url);
    const associatePartnerId = searchParams.get('associatePartnerId');

    const whereClause = associatePartnerId ? {
      associatePartnerId: associatePartnerId
    } : {};

    const customers = await prismadb.customer.findMany({
      where: whereClause,
      include: {
        associatePartner: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(customers);
  } catch (error) {
    console.log("[CUSTOMERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

