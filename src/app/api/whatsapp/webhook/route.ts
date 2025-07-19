import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

// Simple message type detection
function getMessageType(body: string, numMedia: number, latitude?: number, longitude?: number, buttonText?: string): string {
  if (buttonText) return 'interactive_button';
  if (latitude && longitude) return 'location';
  if (numMedia > 0) return 'media';
  if (body) return 'text';
  return 'unknown';
}

// Simple auto-reply logic
function createAutoReply(body: string, numMedia: number, mediaContentType?: string, latitude?: number, longitude?: number, buttonText?: string, profileName?: string): string | null {
  const lowerBody = body.toLowerCase().trim();
  
  // Text message responses
  if (lowerBody) {
    if (lowerBody === 'hello' || lowerBody === 'hi' || lowerBody.includes('hello') || lowerBody.includes('hi')) {
      return `Hello, ${profileName || 'there'}! How can we assist you today?`;
    }
    
    if (lowerBody.includes('help') || lowerBody.includes('support')) {
      return 'Thanks for reaching out! Our team will contact you shortly. You can also call us for immediate assistance.';
    }
    
    if (lowerBody.includes('hours') || lowerBody.includes('timing') || lowerBody.includes('open')) {
      return 'We are open 9am-6pm Monday-Friday, and 10am-4pm on weekends. How can we help you today?';
    }
    
    if (lowerBody.includes('price') || lowerBody.includes('cost') || lowerBody.includes('rate')) {
      return 'Thank you for your interest in our services! Our team will send you detailed pricing information shortly.';
    }
    
    // Button/interactive response
    if (buttonText) {
      return `Thank you for selecting "${buttonText}". We'll process your request and get back to you.`;
    }
    
    // Default text response
    return 'Thank you for your message. We have received it and will respond soon.';
  }
  
  // Media message responses
  if (numMedia > 0 && mediaContentType) {
    if (mediaContentType.startsWith('image/')) {
      if (mediaContentType === 'image/webp') {
        return '🎉 Nice sticker! We have received your image.';
      }
      return '🖼️ Thank you for the image! We have received it and will review it.';
    }
    
    if (mediaContentType.startsWith('video/')) {
      return '📹 Thanks for the video! We have received it.';
    }
    
    if (mediaContentType.startsWith('audio/')) {
      return '🎵 Received your audio message! We will listen to it and respond.';
    }
    
    if (mediaContentType.includes('vcard') || mediaContentType.includes('contact')) {
      return '📞 Thanks for the contact card. We have received it.';
    }
    
    if (mediaContentType.includes('pdf') || mediaContentType.includes('document')) {
      return '📄 Thank you for the document! We have received it and will review it.';
    }
    
    return 'We have received your attachment. Thank you!';
  }
  
  // Location message response
  if (latitude && longitude) {
    return `📍 Location received! (${latitude.toFixed(6)}, ${longitude.toFixed(6)}). Thank you for sharing your location.`;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('📥 Received WhatsApp webhook');

    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = new URLSearchParams(body);
    const params: { [key: string]: string } = {};
    formData.forEach((value, key) => {
      params[key] = value;
    });

    console.log('📋 Webhook params received:', Object.keys(params).join(', '));

    // Extract message data
    const from = params.From;
    const to = params.To;
    const messageBody = params.Body || '';
    const messageSid = params.MessageSid;
    const numMedia = parseInt(params.NumMedia || '0', 10);
    const mediaUrl = params.MediaUrl0;
    const mediaContentType = params.MediaContentType0;
    const latitude = params.Latitude ? parseFloat(params.Latitude) : undefined;
    const longitude = params.Longitude ? parseFloat(params.Longitude) : undefined;
    const locationLabel = params.Label;
    const profileName = params.ProfileName;
    const buttonText = params.ButtonText;

    if (!from || !to || !messageSid) {
      console.error('❌ Missing required fields:', { from, to, messageSid });
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    const messageType = getMessageType(messageBody, numMedia, latitude, longitude, buttonText);
    console.log(`📨 Received ${messageType} message from:`, from);
    
    if (messageBody) {
      console.log('💬 Message text:', messageBody);
    }
    
    if (numMedia > 0) {
      console.log(`📎 Media attachment: ${mediaContentType}`);
    }
    
    if (latitude && longitude) {
      console.log('📍 Location shared:', { lat: latitude, lng: longitude, label: locationLabel });
    }
    
    if (buttonText) {
      console.log('🔘 Button clicked:', buttonText);
    }

    // Store the message in database
    try {
      await (prisma as any).whatsAppMessage.create({
        data: {
          messageId: messageSid,
          messageSid: messageSid,
          fromNumber: from,
          toNumber: to,
          message: messageBody || '', // Store empty string instead of null
          status: 'received',
          timestamp: new Date(),
          mediaUrl: mediaUrl || null,
          mediaContentType: mediaContentType || null,
          direction: 'incoming',
          // Store additional data as JSON
          contentVars: {
            messageType,
            profileName,
            numMedia,
            latitude,
            longitude,
            locationLabel,
            buttonText
          }
        }
      });
      
      console.log('✅ Incoming message saved to database');
    } catch (dbError) {
      console.error('❌ Error saving incoming message to database:', dbError);
      // Continue processing even if DB save fails (as recommended in guide)
    }

    // Generate auto-reply using intelligent logic
    const autoReplyText = createAutoReply(messageBody, numMedia, mediaContentType, latitude, longitude, buttonText, profileName);
    
    if (autoReplyText) {
      try {
        console.log('🤖 Sending auto-reply:', autoReplyText);
        
        // Import dynamically to avoid build issues
        const { sendWhatsAppMessage } = await import('@/lib/twilio-whatsapp');
        
        const sentMessage = await sendWhatsAppMessage({
          to: from,
          body: autoReplyText
        });

        // Log the outgoing message to database if sent successfully
        if ((sentMessage as any).success) {
          try {
            await (prisma as any).whatsAppMessage.create({
              data: {
                messageId: (sentMessage as any).messageId,
                messageSid: (sentMessage as any).messageId,
                fromNumber: to, // Our number
                toNumber: from, // Their number
                message: autoReplyText,
                status: 'sent',
                timestamp: new Date(),
                direction: 'outgoing',
                contentVars: {
                  messageType: 'auto_reply',
                  triggerType: messageType,
                  originalMessageSid: messageSid
                }
              }
            });
            
            console.log('✅ Auto-reply logged to database');
          } catch (dbError) {
            console.error('❌ Error logging auto-reply to database:', dbError);
          }
        }
        
      } catch (replyError) {
        console.error('❌ Error sending auto-reply:', replyError);
        // Don't fail the webhook if auto-reply fails
      }
    }

    // Respond quickly to Twilio (within 15 seconds as recommended)
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Always return 200 to prevent Twilio retries for application errors
    // Only return error status for actual webhook/security issues
    return new NextResponse('Error processed', { status: 200 });
  }
}

// Handle status updates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verify = searchParams.get('verify');
    
    // Simple verification endpoint
    if (verify) {
      return NextResponse.json({ status: 'verified' }, { status: 200 });
    }

    return NextResponse.json({ status: 'WhatsApp webhook endpoint is active' });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
