import { NextResponse } from 'next/server';
import { getMetaConfigStatus } from '@/lib/whatsapp';

export async function GET() {
  const meta = getMetaConfigStatus();

  return NextResponse.json({
    provider: meta.isFullyConfigured ? 'meta' : 'unknown',
    isCloudConfigured: meta.isFullyConfigured,
    whatsappNumber: process.env.META_WHATSAPP_PHONE_NUMBER_ID || null,
    businessId:
      process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.META_WHATSAPP_BUSINESS_ID ||
      null,
    apiVersion: meta.apiVersion,
    hasAccessToken: meta.hasAccessToken,
    hasWebhookToken: meta.hasWebhookToken,
    worker: {
      configured: !!process.env.WHATSAPP_WORKER_TOKEN,
      ipAllowlistConfigured: !!process.env.WHATSAPP_WORKER_ALLOWED_IPS?.trim(),
      endpoint: '/api/internal/whatsapp/campaign-worker',
      supportsHttpTrigger: true,
      supportsCommandTrigger: true,
    },
  });
}
