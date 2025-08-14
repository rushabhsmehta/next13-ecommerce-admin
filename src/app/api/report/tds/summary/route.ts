import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { requireFinanceOrAdmin } from '@/lib/authz';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 403 });
  try { await requireFinanceOrAdmin(userId); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    // group by tdsType
    const txns = await (prismadb as any).tDSTransaction.findMany({ where, select: { tdsType: true, baseAmount: true, tdsAmount: true } });
    const map: Record<string, { totalBase: number; totalTds: number; count: number; }>= {};
    for (const t of txns) {
      const key = t.tdsType || 'UNKNOWN';
      if(!map[key]) map[key] = { totalBase: 0, totalTds: 0, count: 0 };
      map[key].totalBase += Number(t.baseAmount||0);
      map[key].totalTds += Number(t.tdsAmount||0);
      map[key].count += 1;
    }
    const rows = Object.entries(map).map(([tdsType, v]) => ({ tdsType, ...v }));
    const pendingAgg = await (prismadb as any).tDSTransaction.aggregate({ _sum: { tdsAmount: true }, where: { status: 'pending' } });
    const depositedAgg = await (prismadb as any).tDSTransaction.aggregate({ _sum: { tdsAmount: true }, where: { status: 'deposited' } });
  const res = NextResponse.json({ rows, pending: pendingAgg._sum.tdsAmount || 0, deposited: depositedAgg._sum.tdsAmount || 0 });
  res.headers.set('Cache-Control','no-store');
  return res;
  } catch (error) {
    console.error('[TDS_REPORT_SUMMARY_GET]', error);
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
