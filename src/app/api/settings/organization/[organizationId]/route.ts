import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    if (!params.organizationId) {
      return new NextResponse("Organization ID is required", { status: 400 });
    }

    const organization = await prismadb.organization.findUnique({
      where: {
        id: params.organizationId,
      }
    });
  
    return NextResponse.json(organization);
  } catch (error) {
    console.log('[ORGANIZATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { organizationId: string } }
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

    if (!params.organizationId) {
      return new NextResponse("Organization ID is required", { status: 400 });
    }

    const organization = await prismadb.organization.update({
      where: {
        id: params.organizationId,
      },
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
    console.log('[ORGANIZATION_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.organizationId) {
      return new NextResponse("Organization ID is required", { status: 400 });
    }

    const organization = await prismadb.organization.delete({
      where: {
        id: params.organizationId,
      }
    });
  
    return NextResponse.json(organization);
  } catch (error) {
    console.log('[ORGANIZATION_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
