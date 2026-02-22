import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function PATCH(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthenticated', { status: 403 });
    const body = await _req.json();
    const { id } = params;
    const existing = await (prismadb as any).tDSMaster.findUnique({ where: { id } });
    if (!existing) return new NextResponse('Not found', { status: 404 });
    const updated = await (prismadb as any).tDSMaster.update({ where: { id }, data: { ...body, updatedAt: new Date() } });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[TDS_SECTION_PATCH]', e); return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthenticated', { status: 403 });
    const { id } = params;
    await (prismadb as any).tDSMaster.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[TDS_SECTION_DELETE]', e); return new NextResponse('Internal error', { status: 500 });
  }
}
