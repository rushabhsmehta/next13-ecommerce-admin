import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { auth } from '@clerk/nextjs/server';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import type { WhatsAppCampaign, WhatsAppCampaignRecipient } from '@prisma/client';

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

// Background processor with throttled dispatch and retry backoff
async function processCampaignInBackground(campaignId: string) {
  try {
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        templateName: true,
        templateLanguage: true,
        templateVariables: true,
        rateLimit: true,
        retryFailed: true,
        maxRetries: true,
      },
    });

    if (!campaign) {
      return;
    }

    const templateRecord = await prisma.whatsAppTemplate.findUnique({
      where: { name: campaign.templateName },
      select: { body: true },
    });

    const templateBody = templateRecord?.body || undefined;
    const messagesPerSecond = resolveMessagesPerSecond(campaign.rateLimit);
    const batchSize = Math.max(messagesPerSecond * 5, 20);

    while (true) {
      const statusSnapshot = await prisma.whatsAppCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (!statusSnapshot || statusSnapshot.status === 'cancelled' || statusSnapshot.status === 'failed') {
        return;
      }

      if (statusSnapshot.status === 'paused') {
        await sleep(5000);
        continue;
      }

      const candidateRecipients = await prisma.whatsAppCampaignRecipient.findMany({
        where: {
          campaignId,
          status: { in: ['pending', 'retry'] },
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'asc' },
        ],
        take: batchSize,
      });

      if (!candidateRecipients.length) {
        const remaining = await prisma.whatsAppCampaignRecipient.count({
          where: {
            campaignId,
            status: { in: ['pending', 'retry', 'sending'] },
          },
        });

        if (remaining === 0) {
          await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: {
              status: 'completed',
              completedAt: new Date(),
            },
          });
        }

        return;
      }

      const now = Date.now();
      const readyRecipients = candidateRecipients.filter((recipient) => recipient.status === 'pending' || isRetryWindowElapsed(recipient, now));

      if (!readyRecipients.length) {
        const waitMs = computeNextRetryDelay(candidateRecipients, now);
        await sleep(waitMs);
        continue;
      }

      const windows = chunkArray(readyRecipients, messagesPerSecond);

      for (const windowRecipients of windows) {
        const windowStart = Date.now();

        const statusCheck = await prisma.whatsAppCampaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });

        if (!statusCheck || ['paused', 'cancelled', 'failed'].includes(statusCheck.status)) {
          if (statusCheck && (statusCheck.status === 'paused' || statusCheck.status === 'cancelled')) {
            await prisma.whatsAppCampaign.update({
              where: { id: campaignId },
              data: { completedAt: new Date() },
            });
          }
          return;
        }

        await Promise.all(
          windowRecipients.map((recipient) =>
            sendSingleRecipient({
              campaign,
              recipient,
              templateBody,
              campaignId,
            })
          )
        );

        const elapsed = Date.now() - windowStart;
        if (elapsed < 1000) {
          await sleep(1000 - elapsed);
        }
      }
    }
  } catch (error) {
    console.error('Error processing campaign:', error);

    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  }
}

async function sendSingleRecipient({
  campaign,
  recipient,
  templateBody,
  campaignId,
}: {
  campaign: Pick<WhatsAppCampaign, 'id' | 'templateName' | 'templateLanguage' | 'templateVariables' | 'retryFailed' | 'maxRetries'>;
  recipient: WhatsAppCampaignRecipient;
  templateBody?: string;
  campaignId: string;
}) {
  try {
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: 'sending' },
    });

    const variables = {
      ...(campaign.templateVariables as any || {}),
      ...(recipient.variables as any || {}),
    };

    const { bodyParams, buttonParams, headerParams } = deriveTemplateParameters(variables);

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
        recipientId: recipient.id,
      },
    });

    if (result.success) {
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          messageId: result.messageSid || null,
          messageSid: result.dbRecord?.id || null,
          retryCount: 0,
          lastRetryAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });

      await prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });
    } else {
      const errorCode = extractErrorCode(result.error);
      await handleSendError(recipient.id, campaignId, result.error || 'Unknown error', errorCode, campaign);
    }
  } catch (error: any) {
    console.error(`Error sending to ${recipient.phoneNumber}:`, error);
    await handleSendError(recipient.id, campaignId, error?.message || 'Failed to send message', undefined, campaign);
  }
}

const BASE_RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

function computeBackoffMs(retryCount: number): number {
  const attempt = Math.max(1, retryCount);
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function isRetryWindowElapsed(recipient: WhatsAppCampaignRecipient, now: number): boolean {
  if (recipient.status !== 'retry') {
    return true;
  }
  if (!recipient.lastRetryAt) {
    return true;
  }
  const requiredDelay = computeBackoffMs(recipient.retryCount);
  const elapsed = now - recipient.lastRetryAt.getTime();
  return elapsed >= requiredDelay;
}

function computeNextRetryDelay(recipients: WhatsAppCampaignRecipient[], now: number): number {
  const waits = recipients
    .filter((recipient) => recipient.status === 'retry' && recipient.lastRetryAt)
    .map((recipient) => {
      const requiredDelay = computeBackoffMs(recipient.retryCount);
      const elapsed = now - (recipient.lastRetryAt?.getTime() ?? now);
      return Math.max(requiredDelay - elapsed, 1000);
    });

  if (!waits.length) {
    return 3000;
  }

  return Math.min(...waits);
}

function resolveMessagesPerSecond(rateLimitPerMinute?: number | null): number {
  const DEFAULT_MESSAGES_PER_SECOND = 15;
  const MAX_MESSAGES_PER_SECOND = 25;
  const perMinute = Math.max(0, rateLimitPerMinute ?? 0);
  if (perMinute <= 0) {
    return DEFAULT_MESSAGES_PER_SECOND;
  }
  const derived = Math.floor(perMinute / 60);
  return Math.min(MAX_MESSAGES_PER_SECOND, Math.max(1, derived));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
        type: 'BUTTON',
        sub_type: 'URL',
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
      const action: Record<string, any> = {};
      Object.entries(config).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }
        if (key === 'flow_action_data') {
          action.flow_action_data = value;
          return;
        }
        if (key.startsWith('flow_')) {
          action[key] = value;
          return;
        }
        action[key] = value;
      });

      if (!action.flow_token) {
        action.flow_token = `flow-${Date.now()}-${index}`;
      }

      buttonParams.push({
        type: 'BUTTON',
        sub_type: 'FLOW',
        index,
        parameters: [
          {
            type: 'ACTION',
            action,
          },
        ],
      });
    });

  const ctaUrl = clean(vars.cta_url);
  if (ctaUrl) {
    buttonParams.push({
      type: 'BUTTON',
      sub_type: 'URL',
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
  errorCode: string | null | undefined,
  campaign: Pick<WhatsAppCampaign, 'retryFailed' | 'maxRetries'>
) {
  const recipient = await prisma.whatsAppCampaignRecipient.findUnique({
    where: { id: recipientId }
  });

  if (!recipient) return;

  const now = new Date();
  const retryEnabled = campaign.retryFailed !== false;
  const hardStop = !shouldRetryError(errorCode);
  const configuredMaxRetries = typeof campaign.maxRetries === 'number' ? campaign.maxRetries : 3;
  const maxRetries = Math.max(0, configuredMaxRetries);
  const nextRetryCount = recipient.retryCount + 1;

  if (retryEnabled && !hardStop && nextRetryCount <= maxRetries) {
    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'retry',
        errorCode,
        errorMessage,
        retryCount: nextRetryCount,
        lastRetryAt: now,
        failedAt: null,
      },
    });
    return;
  }

  await prisma.whatsAppCampaignRecipient.update({
    where: { id: recipientId },
    data: {
      status: errorCode === '131050' ? 'opted_out' : 'failed',
      errorCode,
      errorMessage,
      failedAt: now,
    },
  });

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      failedCount: { increment: 1 },
    },
  });
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
