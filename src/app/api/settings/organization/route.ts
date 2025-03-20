import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { 
      name,
      address,
      city,
      state,
      pincode,
      country,
      phone,
      email,
      website,
      gstNumber,
      panNumber,
      logoUrl,
      defaultCurrency,
      invoicePrefix,
      billPrefix
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const organization = await prismadb.organization.create({
      data: {
        name,
        address,
        city,
        state,
        pincode,
        country,
        phone,
        email,
        website,
        gstNumber,
        panNumber,
        logoUrl,
        defaultCurrency,
        invoicePrefix,
        billPrefix,
      }
    });
  
    return NextResponse.json(organization);
  } catch (error) {
    console.log('[ORGANIZATION_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
) {
  try {
    const organization = await prismadb.organization.findFirst({
      orderBy: {
        createdAt: 'asc'
      }
    });
  
    return NextResponse.json(organization);
  } catch (error) {
    console.log('[ORGANIZATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

