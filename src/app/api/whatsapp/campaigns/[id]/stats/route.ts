import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/whatsapp/campaigns/[id]/stats - Get campaign analytics
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get recipient statistics
    const recipientStats = await prisma.whatsAppCampaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: params.id },
      _count: true
    });

    // Format stats
    const stats = {
      pending: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      opted_out: 0,
      responded: 0,
      retry: 0
    };

    recipientStats.forEach((stat: any) => {
      stats[stat.status as keyof typeof stats] = stat._count;
    });

    // Get error breakdown
    const errorBreakdown = await prisma.whatsAppCampaignRecipient.groupBy({
      by: ['errorCode'],
      where: {
        campaignId: params.id,
        status: 'failed'
      },
      _count: true
    });

    const errors = errorBreakdown
      .filter((e: any) => e.errorCode)
      .map((e: any) => ({
        code: e.errorCode,
        count: e._count,
        description: getErrorDescription(e.errorCode!)
      }));

    // Calculate metrics
    const total = campaign.totalRecipients;
    const sent = stats.sent + stats.delivered + stats.read + stats.responded;
    const delivered = stats.delivered + stats.read + stats.responded;
    const read = stats.read + stats.responded;

    const deliveryRate = total > 0 ? ((delivered / sent) * 100).toFixed(2) : '0.00';
    const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(2) : '0.00';
    const responseRate = read > 0 ? ((stats.responded / read) * 100).toFixed(2) : '0.00';
    const failureRate = total > 0 ? ((stats.failed / total) * 100).toFixed(2) : '0.00';

    // Get time-based stats (messages sent over time)
    const sentOverTime = await prisma.whatsAppCampaignRecipient.groupBy({
      by: ['sentAt'],
      where: {
        campaignId: params.id,
        status: { in: ['sent', 'delivered', 'read', 'responded'] }
      },
      _count: true,
      orderBy: { sentAt: 'asc' }
    });

    // Calculate duration
    let duration = null;
    if (campaign.startedAt) {
      const endTime = campaign.completedAt || new Date();
      const durationMs = endTime.getTime() - campaign.startedAt.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      duration = `${hours}h ${minutes}m`;
    }

    // Get sample failed recipients (for debugging)
    const failedRecipients = await prisma.whatsAppCampaignRecipient.findMany({
      where: {
        campaignId: params.id,
        status: 'failed'
      },
      take: 10,
      select: {
        phoneNumber: true,
        errorCode: true,
        errorMessage: true,
        failedAt: true
      },
      orderBy: { failedAt: 'desc' }
    });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        templateName: campaign.templateName,
        scheduledFor: campaign.scheduledFor,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        duration
      },
      stats: {
        total,
        ...stats
      },
      metrics: {
        deliveryRate: `${deliveryRate}%`,
        readRate: `${readRate}%`,
        responseRate: `${responseRate}%`,
        failureRate: `${failureRate}%`
      },
      errors,
      failedRecipients,
      timeline: sentOverTime.map((item: any) => ({
        timestamp: item.sentAt,
        count: item._count
      }))
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign stats' },
      { status: 500 }
    );
  }
}

function getErrorDescription(code: string): string {
  const errorMap: { [key: string]: string } = {
    '131049': 'Per-user marketing limit reached',
    '131050': 'User stopped marketing messages',
    '131047': '24-hour messaging window expired',
    '131026': 'Message undeliverable',
    '100': 'Invalid template or parameters',
    '130472': 'User number is part of an experiment',
    '131051': 'Unsupported message type',
    '133010': 'Message failed to send'
  };

  return errorMap[code] || 'Unknown error';
}
