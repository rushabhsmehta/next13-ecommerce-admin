import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function DELETE(
  req: Request,
  { params }: { params: { inquiryId: string, actionId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }

    if (!params.actionId) {
      return new NextResponse("Action ID is required", { status: 400 });
    }

    // Verify that the action belongs to the specified inquiry
    const action = await prismadb.inquiryAction.findUnique({
      where: { 
        id: params.actionId,
        inquiryId: params.inquiryId
      }
    });

    if (!action) {
      return new NextResponse("Action not found or does not belong to this inquiry", { status: 404 });
    }

    // Delete the action
    const deletedAction = await prismadb.inquiryAction.delete({
      where: {
        id: params.actionId
      }
    });

    console.log(`[INQUIRY_ACTION_DELETE] Successfully deleted action: ${params.actionId}`);
    return NextResponse.json(deletedAction);
  } catch (error) {
    console.error('[INQUIRY_ACTION_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}