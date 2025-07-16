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
            message: templateName,
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
    // Sample templates for demo purposes
    // In production, these would come from Twilio Content Templates API
    const templates = [
      {
        id: '1',
        name: 'booking_confirmation',
        category: 'TRANSACTIONAL',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Booking Confirmation',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, your booking for {{2}} has been confirmed. Check-in: {{3}}. Reference: {{4}}',
            parameters: ['Customer Name', 'Service/Hotel', 'Check-in Date', 'Booking Reference']
          },
          {
            type: 'FOOTER',
            text: 'Aagam Holidays - Your Travel Partner'
          }
        ]
      },
      {
        id: '2',
        name: 'payment_reminder',
        category: 'UTILITY',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Payment Reminder',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Dear {{1}}, this is a reminder that your payment of {{2}} for {{3}} is due on {{4}}. Please contact us for any queries.',
            parameters: ['Customer Name', 'Amount', 'Service', 'Due Date']
          },
          {
            type: 'FOOTER',
            text: 'Aagam Holidays'
          }
        ]
      },
      {
        id: '3',
        name: 'welcome_message',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            text: 'Welcome to Aagam Holidays!',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, welcome to our travel family! We\'re excited to help you plan your perfect getaway. Feel free to reach out anytime for assistance.',
            parameters: ['Customer Name']
          },
          {
            type: 'FOOTER',
            text: 'Your trusted travel partner'
          }
        ]
      },
      {
        id: '4',
        name: 'trip_update',
        category: 'TRANSACTIONAL',
        language: 'en',
        status: 'PENDING',
        components: [
          {
            type: 'HEADER',
            text: 'Trip Update',
            format: 'TEXT'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}}, we have an important update regarding your trip to {{2}} scheduled for {{3}}. Please check your email for details.',
            parameters: ['Customer Name', 'Destination', 'Travel Date']
          },
          {
            type: 'FOOTER',
            text: 'Aagam Holidays'
          }
        ]
      }
    ];

    return NextResponse.json({
      success: true,
      templates
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
