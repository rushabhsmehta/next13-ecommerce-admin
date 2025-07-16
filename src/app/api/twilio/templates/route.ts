import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    const { friendlyName, language = 'en', templateType, body, variables, category } = await request.json();

    if (!friendlyName || !body) {
      return NextResponse.json(
        { error: 'Template name and body are required' },
        { status: 400 }
      );
    }

    // Validate Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Create template data for Twilio Content API
    const templateData: any = {
      friendlyName: friendlyName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      language: language,
      variables: variables || {},
      types: {} as any
    };

    // Add the appropriate content type
    if (templateType === 'quick-reply') {
      templateData.types['twilio/quick-reply'] = {
        body: body,
        actions: [
          { title: "Yes", id: "yes" },
          { title: "No", id: "no" },
          { title: "More Info", id: "info" }
        ]
      };
      // Also add text fallback
      templateData.types['twilio/text'] = {
        body: body
      };
    } else {
      // Default to text template
      templateData.types['twilio/text'] = {
        body: body
      };
    }

    console.log('Creating Twilio Content Template:', JSON.stringify(templateData, null, 2));

    // Create template using Twilio Content API
    const content = await client.content.v1.contents.create(templateData);

    // If WhatsApp category is provided, submit for WhatsApp approval
    let approvalResult = null;
    if (category) {
      try {
        // Note: This API might not be available in all Twilio accounts
        // Just mark as submitted for now
        approvalResult = {
          status: 'submitted',
          category: category.toUpperCase(),
          name: friendlyName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          note: 'Please submit for WhatsApp approval manually in Twilio Console'
        };
      } catch (approvalError: any) {
        console.error('WhatsApp approval submission failed:', approvalError);
        approvalResult = {
          error: 'Failed to submit for WhatsApp approval',
          details: approvalError?.message || 'Unknown error',
          note: 'Please submit for WhatsApp approval manually in Twilio Console'
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template: {
        sid: content.sid,
        friendlyName: content.friendlyName,
        language: content.language,
        types: content.types,
        variables: content.variables,
        url: content.url,
        dateCreated: content.dateCreated,
        whatsappApproval: approvalResult
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error creating Twilio template:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create template',
        details: error?.message || 'Unknown error',
        twilioError: error?.code || null
      },
      { status: 500 }
    );
  }
}

// Get all Twilio content templates
export async function GET(request: NextRequest) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const contents = await client.content.v1.contents.list({ limit: 50 });

    const templates = contents.map(content => ({
      sid: content.sid,
      friendlyName: content.friendlyName,
      language: content.language,
      types: content.types,
      variables: content.variables,
      dateCreated: content.dateCreated,
      dateUpdated: content.dateUpdated,
      url: content.url
    }));

    return NextResponse.json({
      success: true,
      templates: templates,
      count: templates.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching Twilio templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch templates',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
