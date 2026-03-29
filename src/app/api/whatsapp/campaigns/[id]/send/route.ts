import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prepareCampaignForDispatch } from '@/lib/whatsapp-campaign-worker';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/whatsapp/campaigns/[id]/send - Queue campaign for the worker
export async function POST(_req: NextRequest, props: RouteParams) {
  const params = await props.params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prepared = await prepareCampaignForDispatch(params.id);

    return NextResponse.json({
      success: true,
      campaignId: prepared.campaignId,
      recipientsCount: prepared.recipientsCount,
      mode: prepared.mode,
      queued: true,
      message: 'Campaign queued for WhatsApp worker processing',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to queue campaign';
    const status =
      message === 'Campaign not found'
        ? 404
        : message === 'Campaign cannot be sent in current status' ||
          message === 'Campaign has no recipients to send'
        ? 400
        : 500;

    console.error('Error queuing campaign:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
