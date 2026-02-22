import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GraphApiError } from '@/lib/whatsapp';
import { syncTourPackageToMeta } from '@/lib/whatsapp-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    packageId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = (await context.params);
    if (!packageId) {
      return NextResponse.json({ error: 'Package id is required' }, { status: 400 });
    }

    const tourPackage = await syncTourPackageToMeta(packageId);

    return NextResponse.json({ success: true, tourPackage });
  } catch (error: any) {
    if (error instanceof GraphApiError) {
      console.error('Meta sync failed for WhatsApp tour package', error);
      return NextResponse.json(
        {
          error: error.message,
          meta: error.response,
        },
        { status: 502 }
      );
    }

    console.error('Failed to sync WhatsApp tour package', error);
    return NextResponse.json({ error: error?.message || 'Failed to sync tour package' }, { status: 500 });
  }
}
