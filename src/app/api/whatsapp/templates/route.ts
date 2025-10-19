import { NextRequest, NextResponse } from 'next/server';
import { listWhatsAppTemplates } from '@/lib/whatsapp';
import prismadb from '@/lib/prismadb';

const BUSINESS_ID =
  process.env.META_WHATSAPP_BUSINESS_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

function extractVariables(text: string | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    found.add(match[1]);
  }
  return Array.from(found);
}

function normalizeButtons(components: any[] | undefined) {
  const buttonsComponent = (components || []).find((component: any) => component.type === 'BUTTONS');
  const buttons = (buttonsComponent?.buttons || []).map((button: any) => ({
    type: button.type,
    index: typeof button.index === 'number' ? button.index : undefined,
    text: button.text,
    url: button.url,
    phone: button.phone_number,
    flowId: button.flow_id || button.flowId,
    flowName: button.flow_name || button.flowName,
    flowCta: button.flow_cta || button.flowCta,
    flowMessageVersion: button.flow_message_version || button.flowMessageVersion,
    flowAction: button.flow_action || button.flowAction,
    flowActionData: button.flow_action_data || button.flow_action_payload || button.flowActionData,
    flowToken: button.flow_token || button.flowToken,
    flowRedirectUrl: button.flow_redirect_url || button.flowRedirectUrl,
    flowTokenLabel: button.flow_token_label || button.flowTokenLabel,
  }));
  return {
    hasCta: buttons.length > 0,
    buttons,
  };
}

function normalizeTemplate(template: any) {
  const components = template.components || [];
  const bodyComponent = components.find((component: any) => component.type === 'BODY');
  const bodyText = bodyComponent?.text || '';
  const bodyExample = bodyComponent?.example || {};
  const bodyNamedParams = Array.isArray(bodyExample.body_text_named_params)
    ? bodyExample.body_text_named_params
    : [];
  const bodyExampleValues = Array.isArray(bodyExample.body_text)
    ? bodyExample.body_text
    : [];

  return {
    id: `${template.name}:${template.language}`,
    name: template.name,
    language: template.language,
    status: template.status,
    category: template.category,
    body: bodyText,
    variables: extractVariables(bodyText),
    namedVariables: bodyNamedParams,
    exampleValues: bodyExampleValues,
    whatsapp: normalizeButtons(components),
    components,
    updatedAt: template.last_updated_time || null,
    flowDefaults: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!BUSINESS_ID) {
      return NextResponse.json(
        {
          success: false,
          templates: [],
          count: 0,
          error: 'Meta WhatsApp Business ID is not configured.',
        },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const debugEnabled = url.searchParams.get('debug') === '1' || process.env.WHATSAPP_DEBUG === '1';
    const debugEvents: any[] = [];

  const templates: any[] = [];
    let after: string | undefined;
    let page = 0;
    const maxPages = 10;

    do {
      const response = await listWhatsAppTemplates(50, after);
      const data = response?.data || [];
      const approved = data.filter((template: any) => template.status === 'APPROVED');
      approved.forEach((template: any) => {
        templates.push(normalizeTemplate(template));
      });

      after = response?.paging?.cursors?.after;
      page += 1;

      if (page >= maxPages && after) {
        if (debugEnabled) {
          debugEvents.push({ event: 'pagination_stopped', reason: 'max_pages_reached' });
        }
        break;
      }
    } while (after);

    const templateNames = templates.map((tpl) => tpl?.name).filter(Boolean) as string[];

    if (templateNames.length) {
      try {
        const storedTemplates = await prismadb.whatsAppTemplate.findMany({
          where: { name: { in: templateNames } },
          select: { name: true, flowDefaults: true },
        });
        const defaultsMap = new Map<string, any>(
          storedTemplates.map((tpl) => [tpl.name, tpl.flowDefaults])
        );
        templates.forEach((tpl) => {
          if (!tpl || typeof tpl !== 'object') {
            return;
          }
          const defaults = defaultsMap.get(tpl.name);
          if (defaults) {
            tpl.flowDefaults = defaults;
          }
        });
      } catch (defaultsError) {
        console.warn('Failed to merge stored flow defaults', defaultsError);
      }
    }

    const payload: any = { success: true, templates, count: templates.length };
    if (debugEnabled) {
      if (!templates.length) {
        debugEvents.push({ event: 'no_templates', message: 'No approved templates returned from Meta.' });
      }
      payload.debug = debugEvents;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Template creation is managed in Meta Business Manager. This endpoint is read-only.',
    },
    { status: 405 }
  );
}

