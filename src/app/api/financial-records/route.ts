import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const period = searchParams.get("period");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause = {};
    let dateField = '';

    // Add date filtering if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      
      switch(type) {
        case 'sales':
          dateField = 'saleDate';
          break;
        case 'purchases':
          dateField = 'purchaseDate';
          break;
        case 'receipts':
          dateField = 'receiptDate';
          break;
        case 'payments':
          dateField = 'paymentDate';
          break;
        case 'expenses':
          dateField = 'expenseDate';
          break;
        case 'incomes':
          dateField = 'incomeDate';
          break;
        default:
          break;
      }
      
      if (dateField) {
        whereClause = {
          ...whereClause,
          [dateField]: {
            gte: start,
            lte: end,
          }
        };
      }
    }

    let data;

    switch (type) {
      case 'sales':
        data = await prismadb.saleDetail.findMany({
          where: whereClause,
          include: {
            customer: true,
            tourPackageQuery: true
          },
          orderBy: {
            saleDate: 'desc'
          }
        });
        break;

      case 'purchases':
        data = await prismadb.purchaseDetail.findMany({
          where: whereClause,
          include: {
            supplier: true,
            tourPackageQuery: true
          },
          orderBy: {
            purchaseDate: 'desc'
          }
        });
        break;

      case 'receipts':
        data = await prismadb.receiptDetail.findMany({
          where: whereClause,
          include: {
            customer: true,
            tourPackageQuery: true,
            bankAccount: true,
            cashAccount: true
          },
          orderBy: {
            receiptDate: 'desc'
          }
        });
        break;

      case 'payments':
        data = await prismadb.paymentDetail.findMany({
          where: whereClause,
          include: {
            supplier: true,
            tourPackageQuery: true,
            bankAccount: true,
            cashAccount: true
          },
          orderBy: {
            paymentDate: 'desc'
          }
        });
        break;

      case 'expenses':
        data = await prismadb.expenseDetail.findMany({
          where: whereClause,
          include: {
            tourPackageQuery: true,
            bankAccount: true,
            cashAccount: true
          },
          orderBy: {
            expenseDate: 'desc'
          }
        });
        break;

      case 'incomes':
        data = await prismadb.incomeDetail.findMany({
          where: whereClause,
          include: {
            tourPackageQuery: true,
            bankAccount: true,
            cashAccount: true
          },
          orderBy: {
            incomeDate: 'desc'
          }
        });
        break;
      
      case 'summary':
        // For summary, get aggregated totals
        const [
          totalSales,
          totalPurchases,
          totalReceipts,
          totalPayments,
          totalExpenses,
          totalIncomes
        ] = await Promise.all([
          prismadb.saleDetail.aggregate({
            where: whereClause,
            _sum: {
              salePrice: true,
            }
          }),
          prismadb.purchaseDetail.aggregate({
            where: whereClause,
            _sum: {
              price: true,
            }
          }),
          prismadb.receiptDetail.aggregate({
            where: whereClause,
            _sum: {
              amount: true,
            }
          }),
          prismadb.paymentDetail.aggregate({
            where: whereClause,
            _sum: {
              amount: true,
            }
          }),
          prismadb.expenseDetail.aggregate({
            where: whereClause,
            _sum: {
              amount: true,
            }
          }),
          prismadb.incomeDetail.aggregate({
            where: whereClause,
            _sum: {
              amount: true,
            }
          })
        ]);
        
        data = {
          totalSales: totalSales._sum.salePrice || 0,
          totalPurchases: totalPurchases._sum.price || 0,
          totalReceipts: totalReceipts._sum.amount || 0,
          totalPayments: totalPayments._sum.amount || 0,
          totalExpenses: totalExpenses._sum.amount || 0,
          totalIncomes: totalIncomes._sum.amount || 0,
        };
        break;
      
      default:
        return new NextResponse("Invalid record type", { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.log('[FINANCIAL_RECORDS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

