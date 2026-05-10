import { NextResponse } from "next/server";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { canAccessInquiryForContext, resolveInquiryAccessContext } from "@/lib/inquiry-access";

export async function DELETE(
  req: Request,
  props: { params: Promise<{ inquiryId: string, actionId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await getRequestClerkUserId(req);

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    const accessContext = await resolveInquiryAccessContext(userId);

    if (!params.inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }

    if (!params.actionId) {
      return new NextResponse("Action ID is required", { status: 400 });
    }

    // Verify that the action belongs to the specified inquiry
    // Use findFirst with both conditions; findUnique only accepts unique constraints
    const action = await prismadb.inquiryAction.findFirst({
      where: { 
        id: params.actionId,
        inquiryId: params.inquiryId
      }
    });

    if (!action) {
      return new NextResponse("Action not found or does not belong to this inquiry", { status: 404 });
    }
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: { associatePartnerId: true },
    });
    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }
    if (!canAccessInquiryForContext(accessContext, inquiry.associatePartnerId ?? null)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Delete the action (guard by both id and inquiryId)
    const deleted = await prismadb.inquiryAction.deleteMany({
      where: {
        id: params.actionId,
        inquiryId: params.inquiryId
      }
    });

    console.log(`[INQUIRY_ACTION_DELETE] Deleted count: ${deleted.count} for action: ${params.actionId}`);
    return NextResponse.json({ deletedCount: deleted.count, id: params.actionId });
  } catch (error) {
    console.error('[INQUIRY_ACTION_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}