import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/whatsapp/campaigns/[id]/recipients - List campaign recipients
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { campaignId: params.id };
    if (status) {
      where.status = status;
    }

    // Get recipients
    const [recipients, total] = await Promise.all([
      prisma.whatsAppCampaignRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.whatsAppCampaignRecipient.count({ where })
    ]);

    return NextResponse.json({
      recipients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp/campaigns/[id]/recipients - Add recipients to campaign
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipients = [] } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Check if campaign exists and is editable
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot add recipients to campaign in current status' },
        { status: 400 }
      );
    }

    // Validate phone numbers
    const validRecipients = recipients.filter(r => r.phoneNumber && r.phoneNumber.trim());

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients provided' },
        { status: 400 }
      );
    }

    // Create recipients
    await prisma.whatsAppCampaignRecipient.createMany({
      data: validRecipients.map((recipient: any) => ({
        campaignId: params.id,
        phoneNumber: recipient.phoneNumber.trim(),
        customerId: recipient.customerId || null,
        name: recipient.name || null,
        variables: recipient.variables || {}
      })),
      skipDuplicates: true
    });

    // Update campaign total recipients count
    const totalRecipients = await prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: params.id }
    });

    await prisma.whatsAppCampaign.update({
      where: { id: params.id },
      data: { totalRecipients }
    });

    return NextResponse.json({
      success: true,
      message: `Added ${validRecipients.length} recipients`,
      totalRecipients
    });
  } catch (error) {
    console.error('Error adding recipients:', error);
    return NextResponse.json(
      { error: 'Failed to add recipients' },
      { status: 500 }
    );
  }
}

// DELETE /api/whatsapp/campaigns/[id]/recipients - Remove recipients from campaign
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const recipientIds = searchParams.get('ids')?.split(',') || [];

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { error: 'Recipient IDs are required' },
        { status: 400 }
      );
    }

    // Check if campaign is editable
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: params.id }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot remove recipients from campaign in current status' },
        { status: 400 }
      );
    }

    // Delete recipients
    await prisma.whatsAppCampaignRecipient.deleteMany({
      where: {
        id: { in: recipientIds },
        campaignId: params.id
      }
    });

    // Update campaign total recipients count
    const totalRecipients = await prisma.whatsAppCampaignRecipient.count({
      where: { campaignId: params.id }
    });

    await prisma.whatsAppCampaign.update({
      where: { id: params.id },
      data: { totalRecipients }
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${recipientIds.length} recipients`,
      totalRecipients
    });
  } catch (error) {
    console.error('Error removing recipients:', error);
    return NextResponse.json(
      { error: 'Failed to remove recipients' },
      { status: 500 }
    );
  }
}
