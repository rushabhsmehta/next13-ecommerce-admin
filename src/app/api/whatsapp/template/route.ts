import { NextRequest, NextResponse } from 'next/server';
import { sendTemplateMessage } from '@/lib/twilio-whatsapp';
import prismadb from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const { to, templateName, variables } = await request.json();

    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Phone number and template name are required' },
        { status: 400 }
      );
    }

    // Send template message via Twilio
    const message = await sendTemplateMessage({ to, template: templateName, variables });

    // Save to database
    try {
      if (message.success) {
        await prismadb.whatsAppMessage.create({
          data: {
            messageId: message.messageId,
            fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890',
            toNumber: to,
            message: message.body || templateName, // Use the rendered message body instead of template name
            status: message.status || 'sent',
            timestamp: new Date(),
            direction: 'outgoing',
            mediaUrl: null,
            mediaContentType: null,
          },
        });
      }
    } catch (dbError) {
      console.error('Error saving template message to database:', dbError);
      // Continue even if database save fails
    }

    return NextResponse.json({
      success: true,
      data: message,
      message: 'Template message sent successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error sending template message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send template message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { getAllTemplates, getTemplateVariables, getTemplateBody } = await import('@/lib/twilio-whatsapp');
    
    const allTemplates = getAllTemplates();
    
    // Convert our template structure to the format expected by the frontend
    const templates = Object.entries(allTemplates).map(([name, description], index) => {
      const variables = getTemplateVariables(name);
      const templateBody = getTemplateBody(name);
      
      // Determine category based on template name
      let category = 'TRANSACTIONAL';
      if (name.includes('offer') || name.includes('deal') || name.includes('special') || 
          name.includes('birthday') || name.includes('anniversary') || name.includes('seasonal') ||
          name.includes('new_destination') || name.includes('photo_sharing') || name.includes('festival')) {
        category = 'MARKETING';
      } else if (name.includes('reminder') || name.includes('support') || name.includes('emergency') ||
                 name.includes('guidelines') || name.includes('contact') || name.includes('currency')) {
        category = 'UTILITY';
      }

      return {
        id: (index + 1).toString(),
        name: name,
        category: category,
        language: 'en',
        status: 'APPROVED',
        description: description,
        components: [
          {
            type: 'HEADER',
            text: description.charAt(0).toUpperCase() + description.slice(1),
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: templateBody || `Template: ${name}`,
            parameters: variables
          },
          {
            type: 'FOOTER',
            text: 'Aagam Holidays - Your Travel Partner'
          }
        ]
      };
    });

    return NextResponse.json({
      success: true,
      templates,
      totalCount: templates.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add a new endpoint to get template details with actual body
export async function PUT(request: NextRequest) {
  try {
    const { templateName } = await request.json();
    
    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const { getTemplateVariables, getTemplateBody, getAllTemplates } = await import('@/lib/twilio-whatsapp');
    
    const variables = getTemplateVariables(templateName);
    const templates = getAllTemplates();
    const description = templates[templateName];
    const templateBody = getTemplateBody(templateName);
    
    if (!description || !templateBody) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        name: templateName,
        description: description,
        body: templateBody,
        variables: variables,
        variableCount: variables.length,
        preview: templateBody.replace(/\{\{(\d+)\}\}/g, (match, idx) => {
          const i = parseInt(idx, 10) - 1;
          return variables[i] ? `[${variables[i]}]` : match;
        })
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching template details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch template details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
