import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(
  req: Request,
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { name, mobileNumber, email, gmail } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!mobileNumber) {
      return new NextResponse("Mobile number is required", { status: 400 });
    }

    const associatePartner = await prismadb.associatePartner.create({
      data: {
        name,
        mobileNumber,
        email,
        gmail,
      }
    });
  
    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNERS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(
  req: Request,
) {
  try {
    const associatePartners = await prismadb.associatePartner.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    return NextResponse.json(associatePartners);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNERS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

