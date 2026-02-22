import { NextRequest, NextResponse } from 'next/server';
import whatsappPrisma from '@/lib/whatsapp-prismadb';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/whatsapp/campaigns/[id] - Get campaign details
export async function GET(req: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
      where: { id: params.id },
      include: {
        recipients: {
          take: 100, // Limit to prevent huge payloads
          orderBy: { updatedAt: 'desc' }
        },
        _count: {
          select: { recipients: true }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const groupedStatuses = await whatsappPrisma.whatsAppCampaignRecipient.groupBy({
      where: { campaignId: params.id },
      by: ['status'],
      _count: { _all: true },
    });

    const statusSummary = groupedStatuses.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    const retryQueueDetails = await buildRetrySchedule(params.id);

    return NextResponse.json({
      campaign,
      statusSummary: mapStatusSummary(statusSummary),
      retrySchedule: retryQueueDetails,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

const BASE_RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

function computeBackoffMs(retryCount: number): number {
  const attempt = Math.max(1, retryCount);
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function mapStatusSummary(summary: Record<string, number>) {
  return {
    pending: summary['pending'] ?? 0,
    sending: summary['sending'] ?? 0,
    retry: summary['retry'] ?? 0,
    sent: summary['sent'] ?? 0,
    delivered: summary['delivered'] ?? 0,
    read: summary['read'] ?? 0,
    failed: summary['failed'] ?? 0,
    opted_out: summary['opted_out'] ?? 0,
    responded: summary['responded'] ?? 0,
    other: Object.entries(summary)
      .filter(([status]) => !['pending', 'sending', 'retry', 'sent', 'delivered', 'read', 'failed', 'opted_out', 'responded'].includes(status))
      .reduce((acc, [status, count]) => {
        acc[status] = count;
        return acc;
      }, {} as Record<string, number>),
  };
}

async function buildRetrySchedule(campaignId: string) {
  const retryingRecipients = await whatsappPrisma.whatsAppCampaignRecipient.findMany({
    where: {
      campaignId,
      status: 'retry',
      lastRetryAt: { not: null },
    },
    select: {
      id: true,
      retryCount: true,
      lastRetryAt: true,
    },
    orderBy: { lastRetryAt: 'asc' },
    take: 10,
  });

  if (retryingRecipients.length === 0) {
    return { nextRetryAt: null, queue: [] };
  }

  const queue = retryingRecipients.map((recipient) => {
    const baseTime = recipient.lastRetryAt ? recipient.lastRetryAt.getTime() : Date.now();
    const scheduledAt = new Date(baseTime + computeBackoffMs(recipient.retryCount));

    return {
      id: recipient.id,
      retryCount: recipient.retryCount,
      scheduledAt: scheduledAt.toISOString(),
    };
  });

  const nextRetryAt = queue.reduce<string | null>((soonest, item) => {
    if (!soonest) {
      return item.scheduledAt;
    }
    return new Date(item.scheduledAt) < new Date(soonest) ? item.scheduledAt : soonest;
  }, null);

  return { nextRetryAt, queue };
}

// PUT /api/whatsapp/campaigns/[id] - Update campaign
export async function PUT(req: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

      // Allow status-only updates (pause/resume) from UI
      if (body && typeof body.status === 'string') {
        const allowedStatuses = ['draft', 'scheduled', 'sending', 'paused', 'completed', 'failed', 'cancelled'];
        if (!allowedStatuses.includes(body.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updateData: any = { status: body.status };
        if (body.status === 'sending') {
          updateData.startedAt = new Date();
        }
        if (body.status === 'completed') {
          updateData.completedAt = new Date();
        }
        if (body.status === 'scheduled' && body.scheduledFor !== undefined) {
          updateData.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
        }

        const updatedCampaign = await whatsappPrisma.whatsAppCampaign.update({
          where: { id: params.id },
          data: updateData,
          include: {
            recipients: true,
            _count: { select: { recipients: true } }
          }
        });

        return NextResponse.json({ success: true, campaign: updatedCampaign });
      }

    // Check if campaign exists and is editable
    const existingCampaign = await whatsappPrisma.whatsAppCampaign.findUnique({
      where: { id: params.id }
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Only allow editing draft campaigns
    if (existingCampaign.status !== 'draft' && existingCampaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot edit campaign in current status' },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      templateName,
      templateLanguage,
      templateVariables,
      scheduledFor,
      rateLimit,
      tags
    } = body;

    // Update campaign
    const campaign = await whatsappPrisma.whatsAppCampaign.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(templateName && { templateName }),
        ...(templateLanguage && { templateLanguage }),
        ...(templateVariables && { templateVariables }),
        ...(scheduledFor !== undefined && {
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          status: scheduledFor ? 'scheduled' : 'draft'
        }),
  // sendWindowStart/sendWindowEnd removed
        ...(rateLimit !== undefined && { rateLimit }),
        ...(tags !== undefined && { tags })
      },
      include: {
        recipients: true,
        _count: {
          select: { recipients: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/whatsapp/campaigns/[id] - Delete/Cancel campaign
export async function DELETE(req: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if campaign exists
    const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // If campaign is actively sending, cancel instead of deleting
    if (campaign.status === 'sending') {
      await whatsappPrisma.whatsAppCampaign.update({
        where: { id: params.id },
        data: {
          status: 'cancelled',
          completedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Campaign cancelled'
      });
    }

    const deletableStatuses = new Set([
      'draft',
      'scheduled',
      'completed',
      'failed',
      'cancelled',
      'paused'
    ]);

    if (deletableStatuses.has(campaign.status)) {
      await whatsappPrisma.whatsAppCampaign.delete({
        where: { id: params.id }
      });

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted'
      });
    }

    // Remaining statuses (e.g. retry in progress) cannot be deleted directly
    return NextResponse.json(
      { error: 'Cannot delete campaign in current status' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
