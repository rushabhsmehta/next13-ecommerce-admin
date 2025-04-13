import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prismadb from "@/lib/prismadb";
import { cookies } from "next/headers";

// Middleware to verify the staff's authentication token
async function verifyStaffToken() {
  const token = cookies().get('ops_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default-secret-key-change-in-production'
    );

    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    // Verify the staff's authentication token
    const payload = await verifyStaffToken();

    if (!payload || !payload.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const staffId = payload.id as string;
    const inquiryId = params.inquiryId;

    if (!inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }

    // Get the inquiry assigned to this staff member
    const inquiry = await prismadb.inquiry.findUnique({
      where: {
        id: inquiryId,
        assignedToStaffId: staffId // Ensure the inquiry is assigned to this staff
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
