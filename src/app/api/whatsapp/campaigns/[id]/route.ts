import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/whatsapp/campaigns/[id] - Get campaign details
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: params.id },
      include: {
        recipients: {
          take: 100, // Limit to prevent huge payloads
          orderBy: { createdAt: 'desc' }
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

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/whatsapp/campaigns/[id] - Update campaign
export async function PUT(req: NextRequest, { params }: RouteParams) {
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

        const updatedCampaign = await prisma.whatsAppCampaign.update({
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
    const existingCampaign = await prisma.whatsAppCampaign.findUnique({
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
    const campaign = await prisma.whatsAppCampaign.update({
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
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if campaign exists
    const campaign = await prisma.whatsAppCampaign.findUnique({
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
      await prisma.whatsAppCampaign.update({
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
      await prisma.whatsAppCampaign.delete({
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
