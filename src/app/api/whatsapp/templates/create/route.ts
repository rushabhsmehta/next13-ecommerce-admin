import { NextRequest, NextResponse } from 'next/server';

// Meta WhatsApp Business API endpoint for creating templates
const WHATSAPP_BUSINESS_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

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

    // Validate environment variables
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp Business API credentials not configured' 
        },
        { status: 500 }
      );
    }

    // Prepare the template data for Meta API
    const templateData = {
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      category: category.toUpperCase(),
      language,
      components: components.map((component: any) => {
        const formattedComponent: any = {
          type: component.type
        };

        if (component.format) {
          formattedComponent.format = component.format;
        }

        if (component.text) {
          formattedComponent.text = component.text;
        }

        // Handle examples for variables
        if (component.type === 'BODY' && component.example) {
          formattedComponent.example = component.example;
        }

        // Handle buttons
        if (component.type === 'BUTTONS' && component.buttons) {
          formattedComponent.buttons = component.buttons;
        }

        return formattedComponent;
      })
    };

    console.log('Submitting template to Meta:', JSON.stringify(templateData, null, 2));

    // Submit to Meta WhatsApp Business API
    const response = await fetch(WHATSAPP_BUSINESS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Meta API Error:', responseData);
      
      // Handle specific Meta API errors
      if (responseData.error) {
        const errorMessage = responseData.error.message || 'Failed to create template';
        const errorDetails = responseData.error.error_user_msg || '';
        
        return NextResponse.json(
          { 
            success: false, 
            error: `${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`,
            details: responseData.error
          },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to submit template to Meta' },
        { status: response.status }
      );
    }

    // Template submitted successfully
    console.log('Template submitted successfully:', responseData);

    return NextResponse.json({
      success: true,
      message: 'Template submitted for approval successfully',
      templateId: responseData.id,
      status: responseData.status || 'PENDING',
      data: responseData
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

// Get all templates
export async function GET(request: NextRequest) {
  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp Business API credentials not configured' 
        },
        { status: 500 }
      );
    }

    // Get templates from Meta API
    const response = await fetch(WHATSAPP_BUSINESS_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Meta API Error:', responseData);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates from Meta' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      templates: responseData.data || []
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
