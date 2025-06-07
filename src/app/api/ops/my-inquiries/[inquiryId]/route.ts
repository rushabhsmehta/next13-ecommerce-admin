import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the user's email from Clerk
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

    const { inquiryId } = params;

    // Get the specific inquiry, but only if it's assigned to this staff member
    const inquiry = await prismadb.inquiry.findFirst({
      where: {
        id: inquiryId,
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
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found or not assigned to you", { status: 404 });
    }

    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[OPS_INQUIRY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the user's email from Clerk
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

    const { inquiryId } = params;
    const body = await req.json();

    // Verify the inquiry is assigned to this staff member
    const existingInquiry = await prismadb.inquiry.findFirst({
      where: {
        id: inquiryId,
        assignedToStaffId: staff.id
      }
    });

    if (!existingInquiry) {
      return new NextResponse("Inquiry not found or not assigned to you", { status: 404 });
    }

    // Update the inquiry
    const inquiry = await prismadb.inquiry.update({
      where: {
        id: inquiryId,
      },
      data: body,
      include: {
        location: true,
        associatePartner: true,
        actions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[OPS_INQUIRY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
