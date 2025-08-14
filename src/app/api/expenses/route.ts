import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { computeBaseAmount, getFinancialYear, getQuarter, pickApplicableRate, calcTdsAmount } from '../../../lib/tds';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const body = await req.json();
    const { 
      expenseCategoryId,
      tourPackageQueryId,
      expenseDate,
      amount,
      description,
      bankAccountId,
      cashAccountId,
      images,
      isAccrued = false,
      // TDS optional inputs
      tdsMasterId,
      tdsOverrideRate,
      tdsType // 'INCOME_TAX' | 'GST'
    } = body;

    // Validate required fields
    if (!expenseDate) {
      return new NextResponse("Expense date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    // For paid (non-accrued) expenses, ensure either bank or cash account is selected
    if (!isAccrued && !bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected for paid expenses", { status: 400 });
    }
    // Create expense detail
    const expenseDetail = await (prismadb as any).expenseDetail.create({
      data: ({        
        tourPackageQueryId: tourPackageQueryId || null,
        expenseDate: dateToUtc(expenseDate)!,
        amount: parseFloat(amount.toString()),
        expenseCategoryId: expenseCategoryId || null,
        description: description || null,
        bankAccountId: isAccrued ? null : (bankAccountId || null),
        cashAccountId: isAccrued ? null : (cashAccountId || null),
        isAccrued: isAccrued,
        accruedDate: isAccrued ? new Date() : null,
        paidDate: isAccrued ? null : new Date(),
        // TDS reference if provided (may not exist in current generated types, so cast below)
        tdsMasterId: tdsMasterId || null,
      } as any)
    });
    // Create images separately if provided
    if (images && images.length > 0) {
      for (const url of images) {
        await (prismadb as any).images.create({
          data: {
            url,
            expenseDetailsId: expenseDetail.id
          }
        });
      }
    }
    // Update account balance only for paid expenses (not accrued)
    if (!isAccrued) {
      if (bankAccountId) {
        const bankAccount = await (prismadb as any).bankAccount.findUnique({
          where: { id: bankAccountId }
        });
        
        if (bankAccount) {
          await (prismadb as any).bankAccount.update({
            where: { id: bankAccountId },
            data: { 
              currentBalance: bankAccount.currentBalance - parseFloat(amount.toString())
            }
          });
        }
      } else if (cashAccountId) {
        const cashAccount = await (prismadb as any).cashAccount.findUnique({
          where: { id: cashAccountId }
        });
        
        if (cashAccount) {
          await (prismadb as any).cashAccount.update({
            where: { id: cashAccountId },
            data: { 
              currentBalance: cashAccount.currentBalance - parseFloat(amount.toString())
            }
          });
        }
      }
    }

    // Optional TDS creation
    try {
      if (tdsMasterId || tdsType) {
        const master = tdsMasterId ? await (prismadb as any).tDSMaster?.findUnique?.({ where: { id: tdsMasterId } }) : null;
        const resolvedType = (tdsType as any) || (master?.isGstTds ? 'GST' : 'INCOME_TAX');
        const base = computeBaseAmount(Number(amount), 0, resolvedType);
        const rate = pickApplicableRate({
          tdsType: resolvedType as any,
          overrideRate: tdsOverrideRate,
          tdsMaster: master ? {
            rateWithPan: master.rateWithPan ?? null,
            rateWithoutPan: master.rateWithoutPan ?? null,
            rateIndividual: master.rateIndividual ?? null,
            rateCompany: master.rateCompany ?? null,
            isIncomeTaxTds: master.isIncomeTaxTds,
            isGstTds: master.isGstTds,
          } : null,
          onDate: new Date(expenseDate),
        });
        if (rate != null && base > 0) {
          const tdsAmount = calcTdsAmount(base, rate);
          await (prismadb as any).tDSTransaction?.create?.({
            data: {
              tdsType: resolvedType,
              sectionId: tdsMasterId || null,
              baseAmount: base,
              appliedRate: rate,
              tdsAmount,
              financialYear: getFinancialYear(new Date(expenseDate)),
              quarter: getQuarter(new Date(expenseDate)),
              status: 'pending',
              notes: description || null,
              expenseDetailId: expenseDetail.id,
            }
          });
          await (prismadb as any).expenseDetail.update({
            where: { id: expenseDetail.id },
            data: ({
              tdsAmount,
              netPayable: Number((Number(amount) - tdsAmount).toFixed(2)),
            } as any)
          });
        }
      }
    } catch (tdsError) {
      console.warn('[EXPENSES_POST][TDS]', tdsError);
    }

    return NextResponse.json(expenseDetail);
  } catch (error) {
    console.error('[EXPENSES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const categoryId = searchParams.get('expenseCategoryId');
    const isAccrued = searchParams.get('isAccrued');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (categoryId) {
      query.expenseCategoryId = categoryId;
    }

    if (isAccrued !== null) {
      query.isAccrued = isAccrued === 'true';
    }
    const expenses = await (prismadb as any).expenseDetail.findMany({
      where: query,
      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('[EXPENSES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

