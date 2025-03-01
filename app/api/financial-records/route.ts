import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const queriesWithFinancials = await prismadb.tourPackageQuery.findMany({
      where: {
        OR: [
          { purchaseDetails: { some: {} } },
          { saleDetails: { some: {} } },
          { paymentDetails: { some: {} } },
          { receiptDetails: { some: {} } },
          { expenseDetails: { some: {} } }
        ]
      },
      select: {
        tourPackageQueryNumber: true,
      }
    });

    const queryNumbers = queriesWithFinancials.map(q => q.tourPackageQueryNumber);
    return NextResponse.json(queryNumbers);
  } catch (error) {
    console.log('[FINANCIAL_RECORDS]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
