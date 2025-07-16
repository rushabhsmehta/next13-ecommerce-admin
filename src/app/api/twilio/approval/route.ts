import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentSid = searchParams.get('contentSid');

    if (!contentSid) {
      return NextResponse.json(
        { error: 'Content SID is required' },
        { status: 400 }
      );
    }

    // Since Twilio Content API approval endpoints might not be available,
    // return a placeholder response with instructions
    return NextResponse.json({
      success: true,
      contentSid: contentSid,
      whatsappApproval: {
        status: 'unknown',
        message: 'Please check approval status in Twilio Console',
        consoleUrl: 'https://console.twilio.com/us1/develop/content/templates'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error checking approval status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check approval status',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Submit a template for WhatsApp approval
export async function POST(request: NextRequest) {
  try {
    const { contentSid, name, category } = await request.json();

    if (!contentSid || !name || !category) {
      return NextResponse.json(
        { error: 'Content SID, name, and category are required' },
        { status: 400 }
      );
    }

    const validCategories = ['AUTHENTICATION', 'MARKETING', 'UTILITY'];
    if (!validCategories.includes(category.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Return instructions for manual approval since API might not be available
    return NextResponse.json({
      success: true,
      message: 'Please submit template for WhatsApp approval manually',
      instructions: {
        step1: 'Go to Twilio Console Content Templates',
        step2: `Find template: ${contentSid}`,
        step3: 'Click "Submit for WhatsApp Approval"',
        step4: `Set category to: ${category.toUpperCase()}`,
        step5: `Set name to: ${name}`
      },
      consoleUrl: 'https://console.twilio.com/us1/develop/content/templates'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error submitting approval request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit approval request',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
