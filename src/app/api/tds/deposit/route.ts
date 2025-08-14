import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { requireFinanceOrAdmin } from '@/lib/authz';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 403 });
  try { await requireFinanceOrAdmin(userId); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await req.json();
    const { bsrCode, challanSerialNo, depositDate, paymentMode, bankName, transactionIds } = body;
  if (!depositDate) return NextResponse.json({ error: 'depositDate is required' }, { status: 400 });

  const challan = await (prismadb as any).tDSChallan.create({
      data: {
        bsrCode: bsrCode || null,
        challanSerialNo: challanSerialNo || null,
        depositDate: new Date(depositDate),
        paymentMode: paymentMode || null,
        bankName: bankName || null,
    updatedBy: userId,
      }
    });

    if (Array.isArray(transactionIds) && transactionIds.length > 0) {
  await (prismadb as any).tDSTransaction.updateMany({
        where: { id: { in: transactionIds } },
        data: { status: 'deposited', challanId: challan.id },
      });
    }

  const res = NextResponse.json(challan, { status: 201 });
  res.headers.set('Cache-Control','no-store');
  return res;
  } catch (error) {
  console.error('[TDS_DEPOSIT_POST]', error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
