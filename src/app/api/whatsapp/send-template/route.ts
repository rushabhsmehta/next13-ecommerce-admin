import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import prisma from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, templateId, variables, saveToDb = true } = body;

    // Validate required fields
    if (!to || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: to and templateId' },
        { status: 400 }
      );
    }

    // Fetch template
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Replace variables in template body
    let message = template.body;
    const templateVariables = template.variables as string[] || [];

    if (templateVariables.length > 0 && variables) {
      templateVariables.forEach((variable, index) => {
        const placeholder = `{{${variable}}}`;
        const value = variables[variable] || variables[index] || placeholder;
        message = message.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanTo = to.replace('whatsapp:', '');
    if (!phoneRegex.test(cleanTo)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Send the message
    const result = await sendWhatsAppMessage({
      to: cleanTo,
      message,
      saveToDb,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        status: 'Template message sent successfully',
        template: template.name,
        processedMessage: message,
        dbRecord: result.dbRecord,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          template: template.name,
          processedMessage: message,
          dbRecord: result.dbRecord,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending template message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Send Template API',
    usage: {
      method: 'POST',
      body: {
        to: 'Phone number with country code (e.g., +1234567890)',
        templateId: 'UUID of the template to use',
        variables: 'Object with variable names and values { "name": "John", "product": "Widget" }',
        saveToDb: 'Boolean (optional, defaults to true)',
      },
    },
  });
}
