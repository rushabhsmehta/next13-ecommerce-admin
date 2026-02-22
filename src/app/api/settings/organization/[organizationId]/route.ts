import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ organizationId: string }> }) {
  const params = await props.params;
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

export async function PATCH(req: Request, props: { params: Promise<{ organizationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
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
      billPrefix,
      // TDS additions
      tanNumber,
      tdsDeductorType,
      tdsSignatoryName,
      tdsSignatoryTitle,
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

    const data: any = {
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
    };

    if (tanNumber !== undefined) data.tanNumber = tanNumber;
    if (tdsDeductorType !== undefined) data.tdsDeductorType = tdsDeductorType;
    if (tdsSignatoryName !== undefined) data.tdsSignatoryName = tdsSignatoryName;
    if (tdsSignatoryTitle !== undefined) data.tdsSignatoryTitle = tdsSignatoryTitle;

    const organization = await prismadb.organization.update({
      where: {
        id: params.organizationId,
      },
      data,
    });
  
    return NextResponse.json(organization);
  } catch (error) {
    console.log('[ORGANIZATION_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ organizationId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

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
