import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { requireFinanceOrAdmin } from '@/lib/authz';

// This route depends on auth headers and dynamic filters
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// List/filter TDS transactions (for challan selection, reporting)
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 403 });
  try { await requireFinanceOrAdmin(userId); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const fy = searchParams.get('financialYear');
    const quarter = searchParams.get('quarter');
    const tdsType = searchParams.get('tdsType');

    const where: any = {};
    if (status) where.status = status;
    if (fy) where.financialYear = fy;
    if (quarter) where.quarter = quarter;
    if (tdsType) where.tdsType = tdsType;

    const txns = await (prismadb as any).tDSTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  const res = NextResponse.json(txns);
  res.headers.set('Cache-Control','no-store');
  return res;
  } catch (e) {
  console.error('[TDS_TRANSACTIONS_GET]', e); return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
