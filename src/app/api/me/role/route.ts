import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      const res = NextResponse.json({ role: null }, { status: 200 });
      res.headers.set('Cache-Control','public, max-age=30, stale-while-revalidate=120');
      return res;
    }
    const membership = await (prismadb as any).organizationMember.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: 'asc' } });
    const res = NextResponse.json({ role: membership?.role || null });
    res.headers.set('Cache-Control','public, max-age=30, stale-while-revalidate=120');
    return res;
  } catch (e:any) {
    const res = NextResponse.json({ role: null, error: e.message }, { status: 500 });
    res.headers.set('Cache-Control','no-store');
    return res;
  }
}
