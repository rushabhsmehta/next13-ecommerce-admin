import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

export async function POST(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { actionType, remarks, actionDate } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
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
