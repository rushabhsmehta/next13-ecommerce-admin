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
  language: string; // Must be exact language code (e.g., 'en_US', 'es_ES', 'pt_BR')
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  bodyText: string; // Max 1024 characters, cannot start/end with {{}}
  placeholders?: Record<string, string>; // Optional placeholder descriptions
  sampleValues?: string[]; // Required if template has variables - for WhatsApp approval
  headerText?: string; // Optional header text (max 60 chars)
  footerText?: string; // Optional footer text (max 60 chars, no variables allowed)
}

// Enhanced validation function following WhatsApp guidelines from the technical guide
function validateTemplate(templateData: TemplateRequest) {
  const errors: string[] = [];
  
  // Check template name format (lowercase, alphanumeric, underscores only)
  if (!/^[a-z0-9_]+$/.test(templateData.templateName)) {
    errors.push(`Template name "${templateData.templateName}" must be lowercase alphanumeric with underscores only`);
  }
  
  // Check body text length (max 1024 characters)
  if (templateData.bodyText.length > 1024) {
    errors.push(`Body text cannot exceed 1024 characters. Current length: ${templateData.bodyText.length}`);
  }
  
  // Check if template starts and ends with static text
  if (templateData.bodyText.trim().startsWith('{{') || templateData.bodyText.trim().endsWith('}}')) {
    errors.push(`Template body cannot start or end with a placeholder`);
  }
  
  // Check for sequential placeholder numbering
  const placeholders = templateData.bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const placeholderNumbers = placeholders.map(p => parseInt(p.replace(/[{}]/g, '')));
  const uniqueNumbers = Array.from(new Set(placeholderNumbers));
  const sortedNumbers = [...uniqueNumbers].sort((a, b) => a - b);
  
  // Check maximum 10 placeholders limit
  if (uniqueNumbers.length > 10) {
    errors.push(`Template cannot have more than 10 placeholders. Found: ${uniqueNumbers.length}`);
  }
  
  // Check sequential numbering starting from 1
  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] !== i + 1) {
      errors.push(`Placeholder numbering must be sequential starting from 1. Expected ${i + 1}, found ${sortedNumbers[i]}`);
      break;
    }
  }
  
  // Check for adjacent placeholders
  if (templateData.bodyText.includes('}}{{')) {
    errors.push(`Cannot have adjacent placeholders without separating text`);
  }
  
  // Check for excessive whitespace
  if (templateData.bodyText.includes('\n\n\n')) {
    errors.push(`Cannot have more than 2 consecutive newlines`);
  }
  
  // Check for tabs or excessive spaces
  if (templateData.bodyText.includes('\t') || /    {4,}/.test(templateData.bodyText)) {
    errors.push(`Cannot use tabs or more than 4 consecutive spaces`);
  }
  
  // Check sample values count matches placeholders
  if (templateData.sampleValues && templateData.sampleValues.length !== uniqueNumbers.length) {
    errors.push(`Sample values count (${templateData.sampleValues.length}) must match placeholder count (${uniqueNumbers.length})`);
  }
  
  // Check for vague/spammy content
  const vaguePatterns = [
    /^hello\s+\{\{1\}\},?\s*thank\s+you\.?$/i,
    /^hi\s+\{\{1\}\}\.?$/i,
    /^are\s+you\s+available\?$/i
  ];
  
  for (const pattern of vaguePatterns) {
    if (pattern.test(templateData.bodyText.trim())) {
      errors.push(`Template content is too vague and may be rejected. Please add more context.`);
      break;
    }
  }
  
  return errors;
}

// Use Twilio Content Templates for WhatsApp template management
export async function POST(request: NextRequest) {
  try {
    const body: TemplateRequest = await request.json();
    const { templateName, friendlyName, language, category, bodyText, placeholders, sampleValues, headerText, footerText } = body;

    // Enhanced validation including header and footer
    const enhancedValidation = validateTemplate(body);
    
    // Additional validation for header and footer
    if (headerText && headerText.length > 60) {
      enhancedValidation.push(`Header text cannot exceed 60 characters. Current length: ${headerText.length}`);
    }
    
    if (footerText && footerText.length > 60) {
      enhancedValidation.push(`Footer text cannot exceed 60 characters. Current length: ${footerText.length}`);
    }
    
    // Footer cannot contain variables or formatting
    if (footerText && /\{\{\d+\}\}/.test(footerText)) {
      enhancedValidation.push(`Footer text cannot contain variables (placeholders)`);
    }
    
    if (enhancedValidation.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: enhancedValidation },
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

    // Check if template already exists
    const existingTemplate = await (prisma as any).whatsAppTemplate.findFirst({
      where: { name: templateName }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template name already exists' },
        { status: 409 }
      );
    }

    // 1. Create content template in Twilio using proper structure from the guide
    const contentTypes: any = {
      'twilio/text': {
        body: bodyText
      }
    };

    // Add header if provided (following guide: max 60 chars, can contain variables)
    if (headerText) {
      contentTypes['twilio/text'].header = {
        type: 'TEXT',
        text: headerText
      };
    }

    // Add footer if provided (following guide: max 60 chars, no variables)
    if (footerText) {
      contentTypes['twilio/text'].footer = {
        text: footerText
      };
    }

    // Add variables mapping if placeholders exist
    const variables: Record<string, string> = {};
    if (sampleValues && sampleValues.length > 0) {
      sampleValues.forEach((value, index) => {
        variables[(index + 1).toString()] = value;
      });
    }

    const content = await twilioClient.content.v1.contents.create({
      friendly_name: friendlyName || templateName,
      language: language,
      types: contentTypes,
      ...(Object.keys(variables).length > 0 ? { variables } : {})
    });

    const contentSid = content.sid;

    // 2. Submit template for WhatsApp approval following the guide
    // Note: WhatsApp approval requires proper category matching and sample values
    try {
      // For WhatsApp approval, we need to use the proper approval request structure
      // This is a placeholder - in production, you would use Twilio's approval endpoint
      console.log(`Template created with ContentSid: ${contentSid}`);
      console.log(`Category: ${category}`);
      console.log(`Sample values provided: ${sampleValues ? 'Yes' : 'No'}`);
      console.log('For WhatsApp approval, submit this template through Twilio Console or use the proper approval API endpoint');
      
      // The guide specifies that approval requires:
      // - Correct category (UTILITY/MARKETING/AUTHENTICATION)
      // - Sample values for all variables
      // - Content that matches the selected category
      
    } catch (approvalError) {
      console.warn('WhatsApp approval request setup:', approvalError);
      // Continue with template creation even if approval setup fails
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
        status: newTemplate.status
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};
    
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
