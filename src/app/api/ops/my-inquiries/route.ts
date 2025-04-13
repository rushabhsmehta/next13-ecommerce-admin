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

export async function GET(req: Request) {
  try {
    // Verify the staff's authentication token
    const payload = await verifyStaffToken();

    if (!payload || !payload.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const staffId = payload.id as string;

    // Get all inquiries assigned to this staff member
    const inquiries = await prismadb.inquiry.findMany({
      where: {
        assignedToStaffId: staffId
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
