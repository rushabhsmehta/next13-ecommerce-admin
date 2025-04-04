import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { associatePartnerId: string } }
) {
  try {
    if (!params.associatePartnerId) {
      return new NextResponse("Partner ID is required", { status: 400 });
    }

    const associatePartner = await prismadb.associatePartner.findUnique({
      where: {
        id: params.associatePartnerId,
      }
    });
  
    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { associatePartnerId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { name, mobileNumber, email, gmail, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!mobileNumber) {
      return new NextResponse("Mobile number is required", { status: 400 });
    }

    if (!params.associatePartnerId) {
      return new NextResponse("Partner ID is required", { status: 400 });
    }

    const associatePartner = await prismadb.associatePartner.update({
      where: {
        id: params.associatePartnerId,
      },
      data: {
        name,
        mobileNumber,
        email,
        gmail,
        isActive
      }
    });
  
    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNER_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { associatePartnerId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.associatePartnerId) {
      return new NextResponse("Partner ID is required", { status: 400 });
    }

    const associatePartner = await prismadb.associatePartner.delete({
      where: {
        id: params.associatePartnerId,
      }
    });
  
    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
