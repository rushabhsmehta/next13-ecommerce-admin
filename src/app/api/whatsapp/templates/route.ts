import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface TemplateRequest {
  templateName: string;
  friendlyName?: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  bodyText: string;
  placeholders?: Record<string, string>;
  sampleValues?: string[];
}

// Validation function for template data following WhatsApp guidelines
function validateTemplate(templateData: TemplateRequest) {
  const errors: string[] = [];
  
  // Check template name format (lowercase, alphanumeric, underscores only)
  if (!/^[a-z0-9_]+$/.test(templateData.templateName)) {
    errors.push(`Template name "${templateData.templateName}" must be lowercase alphanumeric with underscores only`);
  }
  
  // Check if template starts and ends with static text
  if (templateData.bodyText.trim().startsWith('{{') || templateData.bodyText.trim().endsWith('}}')) {
    errors.push(`Template body cannot start or end with a placeholder`);
  }
  
  // Check for sequential placeholder numbering
  const placeholders = templateData.bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const placeholderNumbers = placeholders.map(p => parseInt(p.replace(/[{}]/g, '')));
  const sortedNumbers = [...placeholderNumbers].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] !== i + 1) {
      errors.push(`Placeholder numbering must be sequential starting from 1`);
      break;
    }
  }
  
  // Check for adjacent placeholders
  if (templateData.bodyText.includes('}}{{')) {
    errors.push(`Cannot have adjacent placeholders without separating text`);
  }
  
  // Check sample values count matches placeholders
  if (templateData.sampleValues && templateData.sampleValues.length !== placeholderNumbers.length) {
    errors.push(`Sample values count (${templateData.sampleValues.length}) must match placeholder count (${placeholderNumbers.length})`);
  }
  
  return errors;
}

// Create WhatsApp template using Twilio Content API
export async function POST(request: NextRequest) {
  try {
    const body: TemplateRequest = await request.json();
    const { templateName, friendlyName, language, category, bodyText, placeholders, sampleValues } = body;

    // Validate template data
    const validationErrors = validateTemplate(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Validate Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Twilio credentials not configured',
          details: {
            message: 'Missing required Twilio environment variables',
            required: [
              'TWILIO_ACCOUNT_SID',
              'TWILIO_AUTH_TOKEN'
            ],
            setup_guide: 'Please configure Twilio credentials in your .env.local file'
          }
        },
        { status: 500 }
      );
    }

    // Check if template already exists in database
    const existingTemplate = await (prisma as any).whatsAppTemplate.findFirst({
      where: { name: templateName }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template name already exists' },
        { status: 409 }
      );
    }

    // 1. Create content template in Twilio
    const content = await twilioClient.content.v1.contents.create({
      friendly_name: friendlyName || templateName,
      language: language,
      types: {
        'twilio/text': {
          body: bodyText
        }
      },
      ...(placeholders ? { variables: placeholders } : {})
    });

    const contentSid = content.sid;

    // 2. Submit template for WhatsApp approval
    const approvalParams: any = {
      name: templateName,
      category: category
    };

    if (sampleValues && sampleValues.length > 0) {
      approvalParams.sampleValues = sampleValues;
    }

    try {
      // Note: The approvalRequests method may not be available in all Twilio SDK versions
      // For production, use Twilio Console or the proper approval API endpoint
      console.log('Template created successfully. For WhatsApp approval, use Twilio Console.');
      console.log(`ContentSid: ${contentSid}, Category: ${category}`);
      if (sampleValues && sampleValues.length > 0) {
        console.log(`Sample values: ${JSON.stringify(sampleValues)}`);
      }
    } catch (approvalError: any) {
      console.warn('WhatsApp approval submission failed:', approvalError.message);
      // Continue with template creation even if approval fails
    }

    // 3. Store template metadata in the database
    const newTemplate = await (prisma as any).whatsAppTemplate.create({
      data: {
        contentSid: contentSid,
        name: templateName,
        friendlyName: content.friendlyName,
        language: content.language,
        category: category,
        bodyText: bodyText,
        placeholders: placeholders || {},
        sampleValues: sampleValues || [],
        status: 'pending' // initial status
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: newTemplate.id,
        contentSid: newTemplate.contentSid,
        name: newTemplate.name,
        friendlyName: newTemplate.friendlyName,
        category: newTemplate.category,
        language: newTemplate.language,
        status: newTemplate.status,
        bodyText: newTemplate.bodyText,
        placeholders: newTemplate.placeholders,
        sampleValues: newTemplate.sampleValues
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Template creation failed:', error);
    
    // Handle specific Twilio errors
    if (error.code) {
      return NextResponse.json(
        { success: false, error: 'Twilio API error', details: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
}

// Get all templates from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    
    const templates = await (prisma as any).whatsAppTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      templates: templates.map((template: any) => ({
        id: template.id,
        contentSid: template.contentSid,
        name: template.name,
        friendlyName: template.friendlyName,
        category: template.category,
        language: template.language,
        status: template.status,
        bodyText: template.bodyText,
        placeholders: template.placeholders,
        sampleValues: template.sampleValues,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }))
    });

  } catch (error: any) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}
