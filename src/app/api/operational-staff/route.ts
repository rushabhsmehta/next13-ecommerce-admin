import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request
) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active');

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const whereClause = activeOnly === 'true' ? { isActive: true } : {};

    const operationalStaff = await prismadb.operationalStaff.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(operationalStaff);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
