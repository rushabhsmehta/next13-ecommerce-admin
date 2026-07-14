import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleApi, jsonError, noStore } from '@/lib/api-response';
import { requireOrgAdmin } from '@/lib/authz';
import { GraphApiError } from '@/lib/whatsapp';
import { createTemplate, type CreateTemplateRequest } from '@/lib/whatsapp-templates';
import {
  buildMetaTemplatePayload,
  validateWhatsAppTemplateDraft,
  WHATSAPP_TEMPLATE_LIMITS,
} from '@/lib/whatsapp-template-validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/templates/create
 * Create and submit a WhatsApp message template for Meta review.
 */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = await auth();

    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await requireOrgAdmin(userId);

    const body = await request.json();
    const validation = validateWhatsAppTemplateDraft(body);

    if (!validation.success || !validation.draft) {
      return noStore(
        NextResponse.json(
          {
            success: false,
            error: 'Template validation failed',
            issues: validation.issues,
            readinessScore: validation.readinessScore,
          },
          { status: 422 }
        )
      );
    }

    const payload = validation.payload ?? buildMetaTemplatePayload(validation.draft);

    try {
      const result = await createTemplate(payload as unknown as CreateTemplateRequest);

      return noStore(
        NextResponse.json({
          success: true,
          data: result,
          payload,
          readinessScore: validation.readinessScore,
          warnings: validation.issues.filter((issue) => issue.level === 'warning'),
          message: 'Template created successfully and submitted for Meta review',
        })
      );
    } catch (error: any) {
      if (error instanceof GraphApiError) {
        return noStore(
          NextResponse.json(
            {
              success: false,
              error: error.message || 'Meta rejected the template request',
              provider: 'meta',
              meta: {
                status: error.status,
                code: error.response?.error?.code ?? null,
                subcode: error.response?.error?.error_subcode ?? null,
                details: error.response?.error?.error_data?.details ?? null,
                raw: error.response?.error ?? null,
              },
              payload,
            },
            { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
          )
        );
      }

      throw error;
    }
  });
}

/**
 * GET /api/whatsapp/templates/create
 * Return the internal draft contract for the template studio.
 */
export async function GET() {
  return noStore(
    NextResponse.json({
      message: 'Create WhatsApp Message Template',
      method: 'POST',
      documentation: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
      limits: WHATSAPP_TEMPLATE_LIMITS,
      body: {
        name: 'Template name. Lowercase letters, numbers, and underscores only.',
        language: 'Language code, for example en_US or hi.',
        category: 'AUTHENTICATION, MARKETING, or UTILITY.',
        parameterFormat: 'named or positional. New studio drafts default to named; Meta payloads use NAMED or POSITIONAL.',
        allowCategoryChange: 'Optional boolean. Lets Meta recategorize the template when eligible.',
        examples: {
          header: { customer_name: 'Aagam Guest' },
          body: { booking_id: 'BK-1024' },
          buttons: {
            0: { trip_slug: 'kashmir-summer' },
          },
        },
        components: [
          {
            type: 'HEADER',
            format: 'TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION',
            text: 'Required for TEXT headers.',
            mediaHandle: 'Required for IMAGE, VIDEO, and DOCUMENT headers.',
            mediaUrl: 'Optional public URL used only for preview.',
          },
          {
            type: 'BODY',
            text: 'Required message body. Supports {{named_param}} or {{1}} variables.',
          },
          {
            type: 'FOOTER',
            text: 'Optional footer, no variables.',
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'QUICK_REPLY | PHONE_NUMBER | URL | FLOW | COPY_CODE',
                text: 'Required except COPY_CODE.',
                url: 'Required for URL buttons.',
                phone_number: 'Required for PHONE_NUMBER buttons.',
                flow_id: 'Required for FLOW buttons.',
                example: 'Required for COPY_CODE and URL variables.',
              },
            ],
          },
        ],
        auth: {
          addSecurityRecommendation: true,
          codeExpirationMinutes: 10,
          copyCodeButtonText: 'Copy code',
        },
      },
    })
  );
}
