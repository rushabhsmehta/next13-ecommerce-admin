import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { createAuditLog } from "@/lib/utils/audit-logger";

export async function PATCH(req: Request, props: { params: Promise<{ inquiryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { staffId } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!staffId) {
      return new NextResponse("Staff ID is required", { status: 400 });
    }

    // Validate that the inquiry exists
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      include: {
        location: true,
        associatePartner: true
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Validate that the staff exists
    const staff = await prismadb.operationalStaff.findUnique({
      where: { id: staffId }
    });

    if (!staff) {
      return new NextResponse("Operational staff not found", { status: 404 });
    }

    // Update the inquiry with the assigned staff
    const updatedInquiry = await prismadb.inquiry.update({
      where: { id: params.inquiryId },
      data: {
        assignedToStaffId: staffId,
        assignedStaffAt: new Date()
      },
      include: {
        location: true,
        associatePartner: true,
        assignedStaff: true
      }
    });    // Create audit log
    await createAuditLog({
      entityId: updatedInquiry.id,
      entityType: "INQUIRY",
      action: "UPDATE",
      userRole: "ADMIN",
      metadata: {
        customerName: updatedInquiry.customerName,
        description: `Assigned to staff: ${staff.name}`
      }
    });

    return NextResponse.json(updatedInquiry);
  } catch (error) {
    console.log('[INQUIRY_ASSIGN_STAFF]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
