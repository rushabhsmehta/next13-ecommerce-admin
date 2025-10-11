import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/whatsapp/campaigns/[id]/send - Start sending campaign
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: params.id },
      include: {
        recipients: {
          where: {
            status: 'pending'
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check campaign status
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign cannot be sent in current status' },
        { status: 400 }
      );
    }

    // Check if campaign has recipients
    if (campaign.recipients.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no pending recipients' },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await prisma.whatsAppCampaign.update({
      where: { id: params.id },
      data: {
        status: 'sending',
        startedAt: new Date()
      }
    });

    // Start sending in background (we'll improve this with a queue later)
    processCampaignInBackground(campaign.id);

    return NextResponse.json({
      success: true,
      message: 'Campaign sending started',
      campaignId: campaign.id,
      recipientsCount: campaign.recipients.length
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to start campaign' },
      { status: 500 }
    );
  }
}

// Background processor (simplified version - will be replaced with queue)
async function processCampaignInBackground(campaignId: string) {
  try {
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          where: { status: 'pending' }
        }
      }
    });

    if (!campaign) return;

    const rateLimit = campaign.rateLimit || 10; // Messages per minute
    const delayBetweenMessages = (60 / rateLimit) * 1000; // Milliseconds

    for (const recipient of campaign.recipients) {
      try {
        // Check if within send window
        if (!isWithinSendWindow(campaign)) {
          console.log('Outside send window, pausing...');
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          continue;
        }

        // Update status to sending
        await prisma.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sending' }
        });

        // Merge campaign variables with recipient-specific variables
        const variables = {
          ...(campaign.templateVariables as any || {}),
          ...(recipient.variables as any || {})
        };

        // Convert variables object to array for bodyParams (assuming variables are named "1", "2", "3", etc.)
        const bodyParams: Array<string | number> = [];
        if (variables) {
          // Extract numeric keys and sort them
          const keys = Object.keys(variables).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
          keys.forEach(key => {
            bodyParams.push(variables[key]);
          });
        }

        // Send message
        const result = await sendWhatsAppTemplate({
          to: recipient.phoneNumber,
          templateName: campaign.templateName,
          languageCode: campaign.templateLanguage,
          bodyParams,
          metadata: {
            campaignId: campaign.id,
            recipientId: recipient.id
          }
        });

        if (result.success) {
          // Update recipient status
          await prisma.whatsAppCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              messageId: result.messageSid || null,
              messageSid: result.dbRecord?.id || null
            }
          });

          // Update campaign stats
          await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: {
              sentCount: { increment: 1 }
            }
          });
        } else {
          // Handle error
          const errorCode = extractErrorCode(result.error);
          await handleSendError(recipient.id, campaignId, result.error || 'Unknown error', errorCode);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
      } catch (error: any) {
        console.error(`Error sending to ${recipient.phoneNumber}:`, error);
        await handleSendError(recipient.id, campaignId, error.message);
      }
    }

    // Mark campaign as completed
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error processing campaign:', error);
    
    // Mark campaign as failed
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'failed',
        completedAt: new Date()
      }
    });
  }
}

function isWithinSendWindow(campaign: any): boolean {
  if (campaign.sendWindowStart === null || campaign.sendWindowEnd === null) {
    return true; // No window restrictions
  }

  const now = new Date();
  const currentHour = now.getHours();

  if (campaign.sendWindowStart <= campaign.sendWindowEnd) {
    // Normal window (e.g., 9 AM to 9 PM)
    return currentHour >= campaign.sendWindowStart && currentHour < campaign.sendWindowEnd;
  } else {
    // Window crosses midnight (e.g., 9 PM to 9 AM)
    return currentHour >= campaign.sendWindowStart || currentHour < campaign.sendWindowEnd;
  }
}

function extractErrorCode(error: any): string | null {
  if (typeof error === 'string') {
    const match = error.match(/\(#(\d+)\)/);
    return match ? match[1] : null;
  }
  return error?.code?.toString() || null;
}

async function handleSendError(
  recipientId: string,
  campaignId: string,
  errorMessage: string,
  errorCode?: string | null
) {
  const recipient = await prisma.whatsAppCampaignRecipient.findUnique({
    where: { id: recipientId }
  });

  if (!recipient) return;

  // Determine if we should retry
  const shouldRetry = shouldRetryError(errorCode);
  const maxRetries = 3;

  if (shouldRetry && recipient.retryCount < maxRetries) {
    // Mark for retry
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'retry',
        errorCode,
        errorMessage,
        retryCount: { increment: 1 },
        lastRetryAt: new Date()
      }
    });
  } else {
    // Mark as failed
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: errorCode === '131050' ? 'opted_out' : 'failed',
        errorCode,
        errorMessage,
        failedAt: new Date()
      }
    });

    // Update campaign stats
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        failedCount: { increment: 1 }
      }
    });
  }
}

function shouldRetryError(errorCode: string | null | undefined): boolean {
  // Don't retry these errors
  const noRetryErrors = [
    '131049', // Per-user marketing limit
    '131050', // User stopped marketing
    '100',    // Invalid template
    '131047'  // 24-hour window expired (shouldn't happen with templates)
  ];

  return errorCode ? !noRetryErrors.includes(errorCode) : true;
}
