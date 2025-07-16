import { NextRequest, NextResponse } from 'next/server';

// Use Twilio Content Templates for WhatsApp template management
export async function POST(request: NextRequest) {
  try {
    const { name, category, language, components } = await request.json();

    // Validate required fields
    if (!name || !category || !language || !components) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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

    // Extract body text from components
    const bodyComponent = components.find((comp: any) => comp.type === 'BODY');
    if (!bodyComponent || !bodyComponent.text) {
      return NextResponse.json(
        { success: false, error: 'Template body is required' },
        { status: 400 }
      );
    }

    // Extract header and footer
    const headerComponent = components.find((comp: any) => comp.type === 'HEADER');
    const footerComponent = components.find((comp: any) => comp.type === 'FOOTER');
    const buttonsComponent = components.find((comp: any) => comp.type === 'BUTTONS');

    // Build template body with header and footer
    let fullBody = '';
    if (headerComponent && headerComponent.text) {
      fullBody += `*${headerComponent.text}*\n\n`;
    }
    fullBody += bodyComponent.text;
    if (footerComponent && footerComponent.text) {
      fullBody += `\n\n_${footerComponent.text}_`;
    }

    // Extract variables from body text
    const variableMatches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
    const variables: Record<string, string> = {};
    if (variableMatches) {
      variableMatches.forEach((match: string) => {
        const varNum = match.replace(/[{}]/g, '');
        variables[varNum] = `Variable ${varNum}`;
      });
    }

    // Prepare template data for Twilio
    const templateData = {
      friendlyName: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      language: language,
      body: fullBody,
      variables: variables,
      category: category,
      templateType: buttonsComponent ? 'quick-reply' : 'text'
    };

    console.log('Creating Twilio template:', JSON.stringify(templateData, null, 2));

    // Create template using Twilio API
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/twilio/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio template creation error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || 'Failed to create template',
          details: data.details || 'Unknown error'
        },
        { status: response.status }
      );
    }

    // Template created successfully
    console.log('Template created successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Template created successfully with Twilio',
      templateId: data.template.sid,
      status: 'APPROVED', // Twilio templates are immediately available
      data: data.template,
      whatsappApproval: data.template.whatsappApproval || {
        note: 'For WhatsApp use, submit for approval in Twilio Console'
      }
    });

  } catch (error) {
    console.error('Error creating template:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Get all templates using Twilio
export async function GET(request: NextRequest) {
  try {
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
            ]
          }
        },
        { status: 500 }
      );
    }

    // Get templates from Twilio API
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/twilio/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Twilio API Error:', responseData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates from Twilio' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      templates: responseData.templates || []
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
