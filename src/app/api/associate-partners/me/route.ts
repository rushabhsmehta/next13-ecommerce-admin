import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the user's email address
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return new NextResponse("Email address not found", { status: 400 });
    }

    // Try to find the associate partner by gmail (primary) or email (fallback)
    const associatePartner = await prismadb.associatePartner.findFirst({
      where: {
        OR: [
          { gmail: userEmail },
          { email: userEmail }
        ],
        isActive: true
      }
    });

    if (!associatePartner) {
      return new NextResponse("Associate partner not found", { status: 404 });
    }

    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log('[ASSOCIATE_PARTNER_ME_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}