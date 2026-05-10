import { NextResponse } from "next/server";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';
import { z } from "zod";
import { canAccessInquiryForContext, resolveInquiryAccessContext } from "@/lib/inquiry-access";

const actionSchema = z.object({
  actionType: z.string().min(1),
  remarks: z.string().min(1),
  actionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request, props: { params: Promise<{ inquiryId: string }> }) {
  const params = await props.params;
  try {
    const userId = await getRequestClerkUserId(req);
    const body = await req.json();

    const { actionType, remarks, actionDate } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    const accessContext = await resolveInquiryAccessContext(userId);
    const parsed = actionSchema.safeParse({ actionType, remarks, actionDate });
    if (!parsed.success) {
      return new NextResponse("Invalid action payload", { status: 400 });
    }
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: { id: true, associatePartnerId: true },
    });
    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }
    if (!canAccessInquiryForContext(accessContext, inquiry.associatePartnerId ?? null)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!actionType) {
      return new NextResponse("Action type is required", { status: 400 });
    }

    if (!remarks) {
      return new NextResponse("Remarks are required", { status: 400 });
    }    const action = await prismadb.inquiryAction.create({
      data: {
        inquiryId: params.inquiryId,
        actionType,
        remarks,
        actionDate: dateToUtc(actionDate)!,
      }
    });
  
    return NextResponse.json(action);
  } catch (error) {
    console.log('[INQUIRY_ACTION_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
