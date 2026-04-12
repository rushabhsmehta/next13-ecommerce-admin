import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mobileNumber, accessToken } = body;

    if (!mobileNumber || !accessToken) {
      return new NextResponse("Mobile number and access token are required", { status: 400 });
    }

    const associate = await prismadb.associatePartner.findFirst({
      where: {
        mobileNumber: mobileNumber.trim(),
        accessToken: accessToken.trim(),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        email: true,
        accessToken: true,
      },
    });

    if (!associate) {
      return new NextResponse("Invalid credentials or inactive account", { status: 401 });
    }

    return NextResponse.json({
      associate: {
        id: associate.id,
        name: associate.name,
        mobileNumber: associate.mobileNumber,
        email: associate.email,
      },
      accessToken: associate.accessToken,
    });
  } catch (error) {
    console.log("[ASSOCIATE_AUTH_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
