import { NextRequest, NextResponse } from 'next/server';
import { processDueCampaigns } from '@/lib/whatsapp-campaign-worker';
import { rateLimit } from '@/lib/rate-limit';

const workerRateLimit = rateLimit({ maxRequests: 12, windowSeconds: 60 });

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
}

function getRequestIp(request: NextRequest) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || null;
}

function isIpAllowed(request: NextRequest) {
  const configured = process.env.WHATSAPP_WORKER_ALLOWED_IPS
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!configured || configured.length === 0) {
    return { ok: true as const };
  }

  const requestIp = getRequestIp(request);
  if (!requestIp) {
    return { ok: false, status: 400, error: 'Unable to determine client IP' };
  }

  if (!configured.includes(requestIp)) {
    return { ok: false, status: 403, error: 'IP address is not allowed' };
  }

  return { ok: true as const, ip: requestIp };
}

function isAuthorized(request: NextRequest) {
  const configuredToken = process.env.WHATSAPP_WORKER_TOKEN?.trim();
  if (!configuredToken) {
    console.error('[whatsapp-worker] Missing WHATSAPP_WORKER_TOKEN');
    return { ok: false, status: 500, error: 'Worker token is not configured' };
  }

  const providedToken = getBearerToken(request);
  if (!providedToken || providedToken !== configuredToken) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  const ipCheck = isIpAllowed(request);
  if (!ipCheck.ok) {
    return NextResponse.json({ error: ipCheck.error }, { status: ipCheck.status });
  }

  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limited = workerRateLimit.check(request);
  if (limited) {
    return limited;
  }

  try {
    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await processDueCampaigns({
      maxCampaigns:
        typeof body.maxCampaigns === 'number' ? body.maxCampaigns : undefined,
      budgetMs: typeof body.budgetMs === 'number' ? body.budgetMs : undefined,
      campaignId: typeof body.campaignId === 'string' ? body.campaignId : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[whatsapp-worker] HTTP trigger failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process campaigns' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const ipCheck = isIpAllowed(request);
  if (!ipCheck.ok) {
    return NextResponse.json({ error: ipCheck.error }, { status: ipCheck.status });
  }

  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limited = workerRateLimit.check(request);
  if (limited) {
    return limited;
  }

  return NextResponse.json({
    success: true,
    message: 'WhatsApp campaign worker endpoint is reachable',
    ipRestricted: !!process.env.WHATSAPP_WORKER_ALLOWED_IPS?.trim(),
    triggeredAt: new Date().toISOString(),
  });
}
