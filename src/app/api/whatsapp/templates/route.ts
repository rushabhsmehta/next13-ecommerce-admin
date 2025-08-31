import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';

export async function GET() {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, body: templateBody, variables } = body;

    // Validate required fields
    if (!name || !templateBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name and body' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.whatsAppTemplate.create({
      data: {
        name,
        body: templateBody,
        variables: variables || [],
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    
    // Handle unique constraint violation
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
