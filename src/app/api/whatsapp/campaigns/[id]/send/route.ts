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

    // Completed campaigns can be retried – reset stats and recipient states
    const isCompletedRetry = campaign.status === 'completed';

    if (!isCompletedRetry && campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign cannot be sent in current status' },
        { status: 400 }
      );
    }

    // Check if campaign has recipients
    if (campaign.recipients.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no recipients to send' },
        { status: 400 }
      );
    }

    if (isCompletedRetry) {
      await prisma.$transaction(async (tx) => {
        await tx.whatsAppCampaignRecipient.updateMany({
          where: { campaignId: params.id },
          data: {
            status: 'pending',
            sentAt: null,
            deliveredAt: null,
            readAt: null,
            errorMessage: null,
            errorCode: null,
          }
        });

        await tx.whatsAppCampaign.update({
          where: { id: params.id },
          data: {
            status: 'sending',
            sentCount: 0,
            deliveredCount: 0,
            readCount: 0,
            failedCount: 0,
            respondedCount: 0,
            startedAt: new Date(),
            completedAt: null,
          }
        });
      });
    } else {
      await prisma.whatsAppCampaign.update({
        where: { id: params.id },
        data: {
          status: 'sending',
          startedAt: new Date()
        }
      });
    }

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

    const templateRecord = await prisma.whatsAppTemplate.findUnique({
      where: { name: campaign.templateName },
      select: { body: true }
    });

    const templateBody = templateRecord?.body || undefined;

    const rateLimit = campaign.rateLimit || 10; // Messages per minute
    const delayBetweenMessages = (60 / rateLimit) * 1000; // Milliseconds

    for (const recipient of campaign.recipients) {
      try {

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

        const { bodyParams, buttonParams, headerParams } = deriveTemplateParameters(variables);

        // Send message
        const result = await sendWhatsAppTemplate({
          to: recipient.phoneNumber,
          templateName: campaign.templateName,
          templateBody,
          languageCode: campaign.templateLanguage,
          bodyParams,
          buttonParams,
          headerParams,
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

// Translate stored variable maps into WhatsApp API payload pieces so campaign sends honour media headers & buttons.
function deriveTemplateParameters(variables: Record<string, any> | null | undefined) {
  const clean = (value: unknown): string | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }
    const str = String(value).trim();
    return str.length ? str : undefined;
  };

  const vars = variables || {};
  const bodyParams: Array<string | number> = [];
  const buttonParams: Array<any> = [];
  let headerParams: any = undefined;

  const headerImage = clean(vars['_header_image'] ?? vars['headerImage'] ?? vars['header_image']);
  const headerVideo = clean(vars['_header_video'] ?? vars['headerVideo'] ?? vars['header_video']);
  const headerDocument = clean(vars['_header_document'] ?? vars['headerDocument'] ?? vars['header_document']);
  const headerDocumentFilename = clean(vars['_header_document_filename'] ?? vars['headerDocumentFilename'] ?? vars['header_document_filename']);
  const headerText = clean(vars['_header_text'] ?? vars['headerText'] ?? vars['header_text'] ?? vars['header']);

  if (headerImage) {
    headerParams = {
      type: 'image',
      image: { link: headerImage },
    };
  } else if (headerVideo) {
    headerParams = {
      type: 'video',
      video: { link: headerVideo },
    };
  } else if (headerDocument) {
    headerParams = {
      type: 'document',
      document: {
        link: headerDocument,
        ...(headerDocumentFilename ? { filename: headerDocumentFilename } : {}),
      },
    };
  } else if (headerText) {
    headerParams = {
      type: 'text',
      text: headerText,
    };
  }

  const numericKeys = Object.keys(vars)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));

  if (numericKeys.length > 0) {
    numericKeys.forEach((key) => {
      const value = clean(vars[key]);
      if (value !== undefined) {
        bodyParams.push(value);
      }
    });
  } else {
    const candidateKeys = Object.keys(vars)
      .filter((key) => !key.startsWith('_'))
      .filter((key) => !['header', 'headerImage', 'header_image', 'headerVideo', 'header_video', 'headerDocument', 'header_document', 'headerDocumentFilename', 'header_document_filename', 'cta_url'].includes(key));

    candidateKeys.sort();
    candidateKeys.forEach((key) => {
      const value = clean(vars[key]);
      if (value !== undefined) {
        bodyParams.push(value);
      }
    });
  }

  const urlButtonMap = new Map<number, Array<{ type: string; text: string }>>();
  Object.entries(vars).forEach(([key, rawValue]) => {
    const match = key.match(/^_button_(\d+)_url$/);
    if (!match) {
      return;
    }
    const value = clean(rawValue);
    if (!value) {
      return;
    }
    const index = Number(match[1]);
    const existing = urlButtonMap.get(index) || [];
    existing.push({ type: 'text', text: value });
    urlButtonMap.set(index, existing);
  });

  Array.from(urlButtonMap.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([index, params]) => {
      buttonParams.push({
        type: 'button',
        sub_type: 'url',
        index,
        parameters: params,
      });
    });

  const flowButtonMap = new Map<number, Record<string, any>>();
  Object.entries(vars).forEach(([key, rawValue]) => {
    const match = key.match(/^_flow_(\d+)_(.+)$/);
    if (!match) {
      return;
    }
    const index = Number(match[1]);
    const field = match[2];
    const target = flowButtonMap.get(index) || {};
    if (field === 'action_data') {
      try {
        target.flow_action_data = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      } catch {
        const fallback = clean(rawValue);
        if (fallback) {
          target.flow_action_data = fallback;
        }
      }
    } else {
      const value = clean(rawValue);
      if (value) {
        target[`flow_${field}`] = value;
      }
    }
    flowButtonMap.set(index, target);
  });

  Array.from(flowButtonMap.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([index, config]) => {
      const parameter: Record<string, any> = { type: 'flow' };
      Object.entries(config).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        parameter[key] = value;
      });
      if (!parameter.flow_token) {
        parameter.flow_token = `flow-${Date.now()}-${index}`;
      }
      buttonParams.push({
        type: 'button',
        sub_type: 'flow',
        index,
        parameters: [parameter],
      });
    });

  const ctaUrl = clean(vars.cta_url);
  if (ctaUrl) {
    buttonParams.push({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: ctaUrl }],
    });
  }

  return { bodyParams, buttonParams, headerParams };
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
