import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const categoryId = searchParams.get('expenseCategoryId');
    
    let query: any = { isAccrued: true };
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (categoryId) {
      query.expenseCategoryId = categoryId;
    }    // Get accrued expenses
    const accruedExpenses = await prismadb.expenseDetail.findMany({
      where: query,
      include: {
        expenseCategory: true,
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true,
            customerName: true,
            id: true
          }
        },
        images: true
      },
      orderBy: {
        accruedDate: 'desc'
      }
    });

    // Calculate summary
    const totalAccruedAmount = accruedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expensesByCategory = accruedExpenses.reduce((acc, expense) => {
      const categoryName = expense.expenseCategory?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, amount: 0 };
      }
      acc[categoryName].count += 1;
      acc[categoryName].amount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);    const expensesByTour = accruedExpenses.reduce((acc, expense) => {
      const tourName = expense.tourPackageQuery?.tourPackageQueryName || 'No Tour';
      if (!acc[tourName]) {
        acc[tourName] = { count: 0, amount: 0 };
      }
      acc[tourName].count += 1;
      acc[tourName].amount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return NextResponse.json({
      expenses: accruedExpenses,
      summary: {
        totalAccruedAmount,
        totalCount: accruedExpenses.length,
        expensesByCategory,
        expensesByTour
      }
    });
  } catch (error) {
    console.error('[ACCRUED_EXPENSES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
