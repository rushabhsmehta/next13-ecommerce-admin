import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }    // Get the user's email from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const user = await clerkClient.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return new NextResponse("User email not found", { status: 400 });
    }

    // Find the operational staff record by email
    const staff = await prismadb.operationalStaff.findUnique({
      where: {
        email: userEmail,
      },
    });

    if (!staff) {
      return new NextResponse("Staff record not found", { status: 404 });
    }

    if (!staff.isActive) {
      return new NextResponse("Staff account is inactive", { status: 403 });
    }

    // Get all inquiries assigned to this staff member
    const inquiries = await prismadb.inquiry.findMany({
      where: {
        assignedToStaffId: staff.id
      },
      include: {
        location: true,
        associatePartner: true,
        actions: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        tourPackageQueries: {
          include: {
            images: true
          }
        }
      },
      orderBy: {
        assignedStaffAt: 'desc'
      }
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    console.log('[OPS_MY_INQUIRIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
