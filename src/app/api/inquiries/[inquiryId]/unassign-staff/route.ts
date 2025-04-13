import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { createAuditLog } from "@/lib/utils/audit-logger";

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Validate that the inquiry exists and get current assignment for audit log
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      include: {
        location: true,
        associatePartner: true,
        assignedStaff: true
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Get the name of the previously assigned staff for the audit log
    const previousStaffName = inquiry.assignedStaff?.name || "Unknown";

    // Update the inquiry to remove the assigned staff
    const updatedInquiry = await prismadb.inquiry.update({
      where: { id: params.inquiryId },
      data: {
        assignedToStaffId: null,
        assignedStaffAt: null
      },      include: {
        location: true,
        associatePartner: true,
      }
    });

    // Create audit log
    await createAuditLog({
      entityId: updatedInquiry.id,
      entityType: "INQUIRY",
      action: "UPDATE",
      userRole: "ADMIN", // Required by AuditLogParams interface
      metadata: {
        customerName: updatedInquiry.customerName,
        description: `Unassigned from staff: ${previousStaffName}`
      }
    });

    return NextResponse.json(updatedInquiry);
  } catch (error) {
    console.log('[INQUIRY_UNASSIGN_STAFF]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
