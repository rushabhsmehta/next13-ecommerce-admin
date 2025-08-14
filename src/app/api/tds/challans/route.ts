import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { z } from 'zod';
import { requireFinanceOrAdmin } from '@/lib/authz';

// Zod schemas
const createChallanSchema = z.object({
  bsrCode: z.string().trim().min(1).max(20).optional().or(z.literal('')),
  challanSerialNo: z.string().trim().min(1).max(30).optional().or(z.literal('')),
  depositDate: z.string().datetime().optional(),
  paymentMode: z.string().trim().max(20).optional(),
  bankName: z.string().trim().max(100).optional(),
  amount: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  transactionIds: z.array(z.string().uuid()).optional()
});

const patchSchema = z.object({
  challanId: z.string().uuid(),
  action: z.enum(['attachTransactions','markDeposited']),
  transactionIds: z.array(z.string().uuid()).optional(),
  depositDate: z.string().datetime().optional()
});

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

function withCache(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

async function assertRole(userId: string) { await requireFinanceOrAdmin(userId); }

// Create challan and attach transactions
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await assertRole(userId);
    let parsed;
    try { parsed = createChallanSchema.parse(await req.json()); } catch (err:any) { return jsonError(err.errors?.[0]?.message || 'Invalid body', 422, 'VALIDATION'); }
    const { bsrCode, challanSerialNo, depositDate, paymentMode, bankName, notes, transactionIds, amount } = parsed;
    const challan = await (prismadb as any).tDSChallan.create({
      data: {
        bsrCode: bsrCode || null,
        challanSerialNo: challanSerialNo || null,
        depositDate: depositDate ? new Date(depositDate) : null,
        paymentMode: paymentMode || null,
        bankName: bankName || null,
        amount: amount ?? null,
        notes: notes || null,
        updatedBy: userId,
      }
    });
    if (transactionIds?.length) {
      await Promise.all(transactionIds.map((id: string) => (prismadb as any).tDSTransaction.update({ where: { id }, data: { challanId: challan.id, status: 'deposited' } })));
    }
    return withCache(NextResponse.json(challan, { status: 201 }));
  } catch (e:any) {
    console.error('[TDS_CHALLANS_POST]', e); return jsonError('Internal error', 500, 'SERVER');
  }
}

// List challans with aggregated amount & transaction count
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await assertRole(userId); // read restricted for now
    const challans = await (prismadb as any).tDSChallan.findMany({
      where: { deletedAt: null },
      orderBy: { depositDate: 'desc' },
      include: { tdsTransactions: true }
    });
    const result = challans.map((c: any) => ({
      id: c.id,
      bsrCode: c.bsrCode,
      challanSerialNo: c.challanSerialNo,
      depositDate: c.depositDate,
      paymentMode: c.paymentMode,
      bankName: c.bankName,
      notes: c.notes,
      transactions: c.tdsTransactions.length,
      totalTds: c.tdsTransactions.reduce((sum: number, t: any) => sum + (t.tdsAmount || 0), 0)
    }));
    return withCache(NextResponse.json(result));
  } catch (e) {
    console.error('[TDS_CHALLANS_GET]', e); return jsonError('Internal error', 500, 'SERVER');
  }
}

// Patch: attach transactions to challan or mark deposited
export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await assertRole(userId);
    let parsed;
    try { parsed = patchSchema.parse(await req.json()); } catch (err:any) { return jsonError(err.errors?.[0]?.message || 'Invalid body', 422, 'VALIDATION'); }
    const { challanId, action, transactionIds = [], depositDate } = parsed;
    const challan = await (prismadb as any).tDSChallan.findFirst({ where: { id: challanId, deletedAt: null }, include: { tdsTransactions: true } });
    if (!challan) return jsonError('Challan not found', 404, 'NOT_FOUND');

    if (action === 'attachTransactions') {
      if (!transactionIds.length) return jsonError('transactionIds required', 400, 'VALIDATION');
      await Promise.all(transactionIds.map((id: string) => (prismadb as any).tDSTransaction.update({ where: { id }, data: { challanId, status: 'deposited' } })));
      await (prismadb as any).tDSChallan.update({ where: { id: challanId }, data: { updatedBy: userId } });
    } else if (action === 'markDeposited') {
      const date = depositDate ? new Date(depositDate) : new Date();
      await (prismadb as any).tDSChallan.update({ where: { id: challanId }, data: { depositDate: date, updatedBy: userId } });
      await (prismadb as any).tDSTransaction.updateMany({ where: { challanId }, data: { status: 'deposited' } });
    }
    const updated = await (prismadb as any).tDSChallan.findUnique({ where: { id: challanId }, include: { tdsTransactions: true } });
    if (!updated) return jsonError('Challan not found after update', 500, 'SERVER');
    const response = {
      id: updated.id,
      bsrCode: updated.bsrCode,
      challanSerialNo: updated.challanSerialNo,
      depositDate: updated.depositDate,
      paymentMode: updated.paymentMode,
      bankName: updated.bankName,
      notes: updated.notes,
      transactions: updated.tdsTransactions.length,
      totalTds: updated.tdsTransactions.reduce((sum: number, t: any) => sum + (t.tdsAmount || 0), 0)
    };
    return withCache(NextResponse.json(response));
  } catch (e) {
    console.error('[TDS_CHALLANS_PATCH]', e); return jsonError('Internal error', 500, 'SERVER');
  }
}

// Soft delete challan if no deposited transactions else prevent
export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await assertRole(userId);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return jsonError('id required', 400, 'VALIDATION');
    const challan = await (prismadb as any).tDSChallan.findFirst({ where: { id, deletedAt: null }, include: { tdsTransactions: true } });
    if (!challan) return jsonError('Not found', 404, 'NOT_FOUND');
    const hasDeposited = challan.tdsTransactions.some((t: any) => t.status === 'deposited');
    if (hasDeposited) return jsonError('Cannot delete challan with deposited transactions', 400, 'DEPENDENCY');
    await (prismadb as any).tDSChallan.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: userId } });
    return withCache(NextResponse.json({ success: true }));
  } catch (e) {
    console.error('[TDS_CHALLANS_DELETE]', e); return jsonError('Internal error', 500, 'SERVER');
  }
}
