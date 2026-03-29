import type { WhatsAppCampaign, WhatsAppCampaignRecipient } from '@prisma/whatsapp-client';
import whatsappPrisma from './whatsapp-prismadb';
import { sendWhatsAppTemplate } from './whatsapp';

type CampaignDispatchMode = 'fresh' | 'resume' | 'retry_completed';

type CampaignSnapshot = Pick<
  WhatsAppCampaign,
  'id' | 'status' | 'startedAt' | 'scheduledFor' | 'templateName' | 'templateLanguage' | 'templateVariables' | 'rateLimit' | 'retryFailed' | 'maxRetries'
>;

type WorkerCampaign = Pick<
  WhatsAppCampaign,
  'id' | 'templateName' | 'templateLanguage' | 'templateVariables' | 'rateLimit' | 'retryFailed' | 'maxRetries'
>;

type CounterUpdates = {
  sentCount: number;
  failedCount: number;
};

type RecipientSendResult = 'success' | 'failed' | 'retry' | 'skipped';

export async function prepareCampaignForDispatch(campaignId: string) {
  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      totalRecipients: true,
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const isCompletedRetry = campaign.status === 'completed';
  const isResume = campaign.status === 'sending' || campaign.status === 'paused';

  if (!isCompletedRetry && !isResume && campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error('Campaign cannot be sent in current status');
  }

  if (isCompletedRetry) {
    await whatsappPrisma.$transaction(async (tx) => {
      await tx.whatsAppCampaignRecipient.updateMany({
        where: { campaignId },
        data: {
          status: 'pending',
          sentAt: null,
          deliveredAt: null,
          readAt: null,
          failedAt: null,
          respondedAt: null,
          responseMessage: null,
          errorMessage: null,
          errorCode: null,
          retryCount: 0,
          lastRetryAt: null,
          messageId: null,
          messageSid: null,
        },
      });

      await tx.whatsAppCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'sending',
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          respondedCount: 0,
          startedAt: new Date(),
          completedAt: null,
        },
      });
    });

    return {
      campaignId,
      mode: 'retry_completed' as CampaignDispatchMode,
      recipientsCount: campaign.totalRecipients,
    };
  }

  const remainingRecipients = await whatsappPrisma.whatsAppCampaignRecipient.count({
    where: {
      campaignId,
      status: { in: ['pending', 'retry', 'sending'] },
    },
  });

  if (remainingRecipients === 0) {
    throw new Error('Campaign has no recipients to send');
  }

  await whatsappPrisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'sending',
      startedAt: campaign.startedAt ?? new Date(),
      completedAt: null,
    },
  });

  return {
    campaignId,
    mode: (isResume ? 'resume' : 'fresh') as CampaignDispatchMode,
    recipientsCount: remainingRecipients,
  };
}

export async function processDueCampaigns(options?: {
  maxCampaigns?: number;
  budgetMs?: number;
  campaignId?: string;
}) {
  const maxCampaigns = Math.max(1, options?.maxCampaigns ?? 3);
  const budgetMs = Math.max(1000, options?.budgetMs ?? 25000);
  const now = new Date();

  const campaigns = options?.campaignId
    ? await whatsappPrisma.whatsAppCampaign.findMany({
        where: {
          id: options.campaignId,
          status: { in: ['sending', 'scheduled'] },
        },
        orderBy: { updatedAt: 'asc' },
        take: 1,
      })
    : await whatsappPrisma.whatsAppCampaign.findMany({
        where: {
          OR: [
            { status: 'sending' },
            {
              status: 'scheduled',
              scheduledFor: { lte: now },
            },
          ],
        },
        orderBy: [{ scheduledFor: 'asc' }, { updatedAt: 'asc' }],
        take: maxCampaigns,
      });

  const results = [];

  for (const campaign of campaigns) {
    if (campaign.status === 'scheduled') {
      await whatsappPrisma.whatsAppCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sending',
          startedAt: campaign.startedAt ?? new Date(),
        },
      });
    }

    const result = await processCampaignSlice(campaign.id, { budgetMs });
    results.push(result);
  }

  return {
    processedCampaigns: results.length,
    results,
  };
}

async function processCampaignSlice(campaignId: string, options?: { budgetMs?: number }) {
  const budgetMs = Math.max(1000, options?.budgetMs ?? 25000);
  const startedAt = Date.now();

  const campaign = await whatsappPrisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      templateName: true,
      templateLanguage: true,
      templateVariables: true,
      rateLimit: true,
      retryFailed: true,
      maxRetries: true,
    },
  });

  if (!campaign) {
    return { campaignId, status: 'missing', processedRecipients: 0 };
  }

  if (campaign.status !== 'sending') {
    return { campaignId, status: campaign.status, processedRecipients: 0 };
  }

  const templateRecord = await whatsappPrisma.whatsAppTemplate.findUnique({
    where: { name: campaign.templateName },
    select: { body: true },
  });

  const templateBody = templateRecord?.body || undefined;
  const messagesPerSecond = resolveMessagesPerSecond(campaign.rateLimit);
  const batchSize = Math.max(messagesPerSecond * 10, 50);

  let processedRecipients = 0;
  let pendingCounterUpdates: CounterUpdates = { sentCount: 0, failedCount: 0 };
  let lastCounterFlush = Date.now();
  let exhaustedBudget = false;

  while (Date.now() - startedAt < budgetMs) {
    const statusSnapshot = await whatsappPrisma.whatsAppCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!statusSnapshot || ['cancelled', 'failed', 'paused'].includes(statusSnapshot.status)) {
      break;
    }

    const candidateRecipients = await whatsappPrisma.whatsAppCampaignRecipient.findMany({
      where: {
        campaignId,
        status: { in: ['pending', 'retry'] },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: batchSize,
    });

    if (!candidateRecipients.length) {
      const remaining = await whatsappPrisma.whatsAppCampaignRecipient.count({
        where: {
          campaignId,
          status: { in: ['pending', 'retry', 'sending'] },
        },
      });

      if (remaining === 0) {
        await flushCounterUpdates(campaignId, pendingCounterUpdates);
        pendingCounterUpdates = { sentCount: 0, failedCount: 0 };

        await whatsappPrisma.whatsAppCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        return {
          campaignId,
          status: 'completed',
          processedRecipients,
        };
      }

      break;
    }

    const now = Date.now();
    const readyRecipients = candidateRecipients.filter(
      (recipient) => recipient.status === 'pending' || isRetryWindowElapsed(recipient, now)
    );

    if (!readyRecipients.length) {
      break;
    }

    const windows = chunkArray(readyRecipients, messagesPerSecond);

    for (const windowRecipients of windows) {
      if (Date.now() - startedAt >= budgetMs) {
        exhaustedBudget = true;
        break;
      }

      const windowStart = Date.now();
      const results = await Promise.allSettled(
        windowRecipients.map((recipient) =>
          sendSingleRecipient({
            campaign,
            recipient,
            templateBody,
            campaignId,
            skipCounterUpdate: true,
          })
        )
      );

      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return;
        }
        if (result.value === 'success') {
          pendingCounterUpdates.sentCount++;
        } else if (result.value === 'failed') {
          pendingCounterUpdates.failedCount++;
        }
      });

      processedRecipients += results.filter(
        (result) => result.status === 'fulfilled' && result.value !== 'skipped'
      ).length;

      const timeSinceLastFlush = Date.now() - lastCounterFlush;
      if (
        timeSinceLastFlush >= 10000 ||
        pendingCounterUpdates.sentCount + pendingCounterUpdates.failedCount >= 100
      ) {
        await flushCounterUpdates(campaignId, pendingCounterUpdates);
        pendingCounterUpdates = { sentCount: 0, failedCount: 0 };
        lastCounterFlush = Date.now();
      }

      const elapsed = Date.now() - windowStart;
      if (elapsed < 1000 && Date.now() - startedAt + (1000 - elapsed) < budgetMs) {
        await sleep(1000 - elapsed);
      }
    }

    if (exhaustedBudget) {
      break;
    }
  }

  await flushCounterUpdates(campaignId, pendingCounterUpdates);

  return {
    campaignId,
    status: exhaustedBudget ? 'budget_exhausted' : 'sending',
    processedRecipients,
  };
}

async function flushCounterUpdates(campaignId: string, updates: CounterUpdates) {
  if (updates.sentCount === 0 && updates.failedCount === 0) {
    return;
  }

  const incrementData: Record<string, { increment: number }> = {};
  if (updates.sentCount > 0) {
    incrementData.sentCount = { increment: updates.sentCount };
  }
  if (updates.failedCount > 0) {
    incrementData.failedCount = { increment: updates.failedCount };
  }

  await whatsappPrisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: incrementData,
  });
}

async function sendSingleRecipient(params: {
  campaign: WorkerCampaign;
  recipient: WhatsAppCampaignRecipient;
  templateBody?: string;
  campaignId: string;
  skipCounterUpdate?: boolean;
}): Promise<RecipientSendResult> {
  const { campaign, recipient, templateBody, campaignId, skipCounterUpdate = false } = params;

  try {
    const claim = await whatsappPrisma.whatsAppCampaignRecipient.updateMany({
      where: {
        id: recipient.id,
        status: { in: ['pending', 'retry'] },
      },
      data: { status: 'sending' },
    });

    if (claim.count === 0) {
      return 'skipped';
    }

    const variables = {
      ...((campaign.templateVariables as any) || {}),
      ...((recipient.variables as any) || {}),
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
      await whatsappPrisma.whatsAppCampaignRecipient.update({
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

      if (!skipCounterUpdate) {
        await whatsappPrisma.whatsAppCampaign.update({
          where: { id: campaignId },
          data: {
            sentCount: { increment: 1 },
          },
        });
      }

      return 'success';
    }

    const errorCode = extractErrorCode(result.error);
    return handleSendError(
      recipient.id,
      campaignId,
      result.error || 'Unknown error',
      errorCode,
      campaign,
      skipCounterUpdate
    );
  } catch (error: any) {
    console.error(`Error sending to ${recipient.phoneNumber}:`, error);
    return handleSendError(
      recipient.id,
      campaignId,
      error?.message || 'Failed to send message',
      undefined,
      campaign,
      skipCounterUpdate
    );
  }
}

const BASE_RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

function computeBackoffMs(retryCount: number) {
  const attempt = Math.max(1, retryCount);
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function isRetryWindowElapsed(recipient: WhatsAppCampaignRecipient, now: number) {
  if (recipient.status !== 'retry' || !recipient.lastRetryAt) {
    return true;
  }

  const requiredDelay = computeBackoffMs(recipient.retryCount);
  const elapsed = now - recipient.lastRetryAt.getTime();
  return elapsed >= requiredDelay;
}

function resolveMessagesPerSecond(rateLimitPerMinute?: number | null) {
  const DEFAULT_MESSAGES_PER_SECOND = 20;
  const MAX_MESSAGES_PER_SECOND = 50;
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
  const headerDocumentFilename = clean(
    vars['_header_document_filename'] ??
      vars['headerDocumentFilename'] ??
      vars['header_document_filename']
  );
  const headerText = clean(
    vars['_header_text'] ?? vars['headerText'] ?? vars['header_text'] ?? vars['header']
  );

  if (headerImage) {
    headerParams = { type: 'image', image: { link: headerImage } };
  } else if (headerVideo) {
    headerParams = { type: 'video', video: { link: headerVideo } };
  } else if (headerDocument) {
    headerParams = {
      type: 'document',
      document: {
        link: headerDocument,
        ...(headerDocumentFilename ? { filename: headerDocumentFilename } : {}),
      },
    };
  } else if (headerText) {
    headerParams = { type: 'text', text: headerText };
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
      .filter(
        (key) =>
          ![
            'header',
            'headerImage',
            'header_image',
            'headerVideo',
            'header_video',
            'headerDocument',
            'header_document',
            'headerDocumentFilename',
            'header_document_filename',
            'cta_url',
          ].includes(key)
      );

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
  campaign: Pick<WhatsAppCampaign, 'retryFailed' | 'maxRetries'>,
  skipCounterUpdate = false
): Promise<'retry' | 'failed'> {
  const recipient = await whatsappPrisma.whatsAppCampaignRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!recipient) {
    return 'failed';
  }

  const now = new Date();
  const retryEnabled = campaign.retryFailed !== false;
  const hardStop = !shouldRetryError(errorCode);
  const configuredMaxRetries = typeof campaign.maxRetries === 'number' ? campaign.maxRetries : 3;
  const maxRetries = Math.max(0, configuredMaxRetries);
  const nextRetryCount = recipient.retryCount + 1;

  if (retryEnabled && !hardStop && nextRetryCount <= maxRetries) {
    await whatsappPrisma.whatsAppCampaignRecipient.update({
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
    return 'retry';
  }

  await whatsappPrisma.whatsAppCampaignRecipient.update({
    where: { id: recipientId },
    data: {
      status: errorCode === '131050' ? 'opted_out' : 'failed',
      errorCode,
      errorMessage,
      failedAt: now,
    },
  });

  if (!skipCounterUpdate) {
    await whatsappPrisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        failedCount: { increment: 1 },
      },
    });
  }

  return 'failed';
}

function shouldRetryError(errorCode: string | null | undefined) {
  const noRetryErrors = ['131049', '131050', '100', '131047'];
  return errorCode ? !noRetryErrors.includes(errorCode) : true;
}
