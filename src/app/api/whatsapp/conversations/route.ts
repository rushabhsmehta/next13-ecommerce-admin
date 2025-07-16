import { NextRequest, NextResponse } from 'next/server';
import { getConversationHistory } from '@/lib/twilio-whatsapp';
import prismadb from '@/lib/prismadb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const limit = parseInt(searchParams.get('limit') || '50');

    let messages = [];

    // Try to get from database first
    try {
      const dbMessages = await prismadb.whatsAppMessage.findMany({
        where: phoneNumber ? {
          OR: [
            { fromNumber: phoneNumber },
            { toNumber: phoneNumber }
          ]
        } : undefined,
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      messages = dbMessages.map(msg => ({
        id: msg.messageId,
        from: msg.fromNumber,
        to: msg.toNumber,
        body: msg.message,
        status: msg.status,
        timestamp: msg.timestamp,
        mediaUrl: msg.mediaUrl,
        mediaContentType: msg.mediaContentType,
        direction: msg.direction
      }));

    } catch (dbError) {
      console.error('Error fetching from database, falling back to Twilio API:', dbError);
      
      // Fallback to Twilio API
      if (!phoneNumber) {
        return NextResponse.json(
          { success: false, error: 'Phone number is required' },
          { status: 400 }
        );
      }
      
      const twilioResult = await getConversationHistory(phoneNumber);
      if (!twilioResult.success) {
        return NextResponse.json(
          { success: false, error: twilioResult.error },
          { status: 500 }
        );
      }
      
      messages = twilioResult.messages.map((msg: any) => ({
        ...msg,
        direction: msg.from.includes(process.env.TWILIO_WHATSAPP_NUMBER || '+1234567890') ? 'outgoing' : 'incoming'
      }));
    }

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Show oldest first
      total: messages.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Delete conversation history from database
    await prismadb.whatsAppMessage.deleteMany({
      where: {
        OR: [
          { fromNumber: phoneNumber },
          { toNumber: phoneNumber }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Conversation history deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting conversation history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
