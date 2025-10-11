import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';

// GET /api/whatsapp/campaigns - List all campaigns
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Get campaigns
    const [campaigns, total] = await Promise.all([
      prisma.whatsAppCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { recipients: true }
          }
        }
      }),
      prisma.whatsAppCampaign.count({ where })
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/whatsapp/campaigns - Create new campaign
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      templateName,
      templateLanguage = 'en_US',
      templateVariables,
      targetType = 'manual',
      segmentQuery,
      recipients = [],
      scheduledFor,
      sendWindowStart,
      sendWindowEnd,
      rateLimit = 10,
      tags
    } = body;

    // Validate required fields
    if (!name || !templateName) {
      return NextResponse.json(
        { error: 'Name and template name are required' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.whatsAppCampaign.create({
      data: {
        name,
        description,
        templateName,
        templateLanguage,
        templateVariables: templateVariables || {},
        targetType,
        segmentQuery: segmentQuery || {},
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        sendWindowStart,
        sendWindowEnd,
        rateLimit,
        tags: tags || {},
        createdBy: userId,
        totalRecipients: recipients.length
      }
    });

    // Add recipients if provided
    if (recipients.length > 0) {
      await prisma.whatsAppCampaignRecipient.createMany({
        data: recipients.map((recipient: any) => ({
          campaignId: campaign.id,
          phoneNumber: recipient.phoneNumber,
          customerId: recipient.customerId || null,
          name: recipient.name || null,
          variables: recipient.variables || {}
        }))
      });
    }

    // Fetch campaign with recipients
    const campaignWithRecipients = await prisma.whatsAppCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        recipients: true,
        _count: {
          select: { recipients: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      campaign: campaignWithRecipients
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
