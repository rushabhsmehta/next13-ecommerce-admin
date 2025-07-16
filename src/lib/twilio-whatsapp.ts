import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('Missing Twilio credentials. Please check your environment variables.');
}

let client: any = null;

try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

export interface WhatsAppMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export async function sendWhatsAppMessage({ to, body, mediaUrl }: WhatsAppMessageOptions) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messageOptions: any = {
      from: whatsappNumber,
      to: `whatsapp:${to}`,
      body,
    };

    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }

    const message = await client.messages.create(messageOptions);
    
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getWhatsAppMessages(limit = 20) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messages = await client.messages.list({
      from: whatsappNumber,
      limit,
    });

    return {
      success: true,
      messages: messages.map((msg: any) => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
      })),
    };
  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getConversationHistory(phoneNumber: string, limit = 50) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messages = await client.messages.list({
      to: `whatsapp:${phoneNumber}`,
      limit,
    });

    return {
      success: true,
      messages: messages.map((msg: any) => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
      })),
    };
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper to get template body by name
export function getTemplateBody(templateName: string): string | null {
  // These should match the templates in route.ts
  const templates: Record<string, string> = {
    // Existing templates
    booking_confirmation: 'Hello {{1}}, your booking for {{2}} has been confirmed. Check-in: {{3}}. Reference: {{4}}',
    payment_reminder: 'Hi {{1}}, your payment of ₹{{2}} for booking {{3}} is due on {{4}}. Please complete your payment to confirm your booking.',
    welcome_message: "Hello {{1}}, welcome to our travel family! We're excited to help you plan your perfect getaway. Feel free to reach out anytime for assistance.",
    trip_update: 'Hi {{1}}, we have an important update regarding your trip to {{2}} scheduled for {{3}}. Please check your email for details.',
    travel_itinerary: 'Dear {{1}}, here is your travel itinerary for {{2}}: {{3}}. For any changes, contact us at {{4}}.',
    payment_received: 'Thank you {{1}}! We have received your payment of ₹{{2}} for booking {{3}}. Your booking is now confirmed.',
    feedback_request: 'Hi {{1}}, we hope you enjoyed your experience with us. Please share your feedback for booking {{2}}.',
    cancellation_notice: 'Dear {{1}}, your booking {{2}} scheduled for {{3}} has been cancelled. For details, contact us.',
    festival_greeting: 'Happy {{1}}! Wishing you and your family a wonderful {{2}}. - Aagam Holidays',
    support_info: 'Hi {{1}}, for any support regarding your booking {{2}}, reach us at {{3}}.',
    
    // New comprehensive templates
    booking_pending: 'Hi {{1}}, your booking request for {{2}} is being processed. We will confirm within {{3}} hours. Reference: {{4}}',
    partial_payment_received: 'Thank you {{1}}! We received ₹{{2}} as partial payment for booking {{3}}. Remaining amount: ₹{{4}}. Due date: {{5}}',
    departure_reminder: 'Hi {{1}}, your trip to {{2}} starts tomorrow ({{3}}). Please arrive at {{4}} by {{5}}. Have a great journey! 🌟',
    return_reminder: 'Welcome back {{1}}! We hope you had an amazing trip to {{2}}. Please share your experience and photos with us! 📸',
    document_reminder: 'Hi {{1}}, please submit the following documents for your {{2}} trip: {{3}}. Deadline: {{4}}',
    visa_update: 'Dear {{1}}, your visa application for {{2}} has been {{3}}. {{4}}. Contact us for assistance.',
    weather_alert: 'Hi {{1}}, weather update for your {{2}} trip: {{3}}. We recommend {{4}}. Stay safe! 🌦️',
    flight_delay: 'Travel Alert: {{1}}, your flight {{2}} to {{3}} is delayed by {{4}} hours. New departure: {{5}}',
    hotel_upgrade: 'Great news {{1}}! We have upgraded your accommodation in {{2}} to {{3}} at no extra cost. Enjoy! ✨',
    emergency_contact: 'Hi {{1}}, for any emergency during your {{2}} trip, contact our 24/7 helpline: {{3}} or WhatsApp: {{4}}',
    group_booking: 'Hi {{1}}, your group booking for {{2}} people to {{3}} is confirmed. Total amount: ₹{{4}}. Trip date: {{5}}',
    last_minute_deal: 'Flash Sale Alert! {{1}}, exclusive {{2}}% off on {{3}} packages. Valid till {{4}}. Book now! 🔥',
    birthday_special: 'Happy Birthday {{1}}! 🎉 Celebrate with our special birthday discount of {{2}}% on your next booking. Valid till {{3}}',
    anniversary_offer: 'Happy Anniversary {{1}}! 💕 Enjoy {{2}}% off on couple packages. Create new memories with us!',
    referral_bonus: 'Hi {{1}}, you earned ₹{{2}} referral bonus for referring {{3}}. Use code {{4}} on your next booking!',
    package_customization: 'Hi {{1}}, we have customized your {{2}} package as requested. New itinerary: {{3}}. Additional cost: ₹{{4}}',
    transport_update: 'Hi {{1}}, your transport for {{2}} trip has been updated. Pickup: {{3}} at {{4}}. Vehicle: {{5}}',
    activity_booking: 'Hi {{1}}, your activity "{{2}}" for {{3}} trip is confirmed. Date: {{4}}, Time: {{5}}. Get ready for adventure! 🎢',
    insurance_reminder: 'Hi {{1}}, we recommend travel insurance for your {{2}} trip. Coverage: {{3}}. Premium: ₹{{4}}',
    loyalty_reward: 'Congratulations {{1}}! You have earned {{2}} loyalty points. Total points: {{3}}. Redeem for exciting rewards! 🏆',
    seasonal_offer: '🌅 {{1}} Season Special! {{1}}, enjoy {{2}}% off on {{3}} destinations. Limited time offer till {{4}}!',
    check_in_reminder: 'Hi {{1}}, online check-in for your {{2}} flight is now available. Check-in before {{3}} to avoid queues.',
    covid_guidelines: 'Hi {{1}}, COVID guidelines for your {{2}} trip: {{3}}. Stay safe and follow protocols! 😷',
    currency_exchange: 'Hi {{1}}, current exchange rate for {{2}}: 1 INR = {{3}} {{4}}. We recommend exchanging {{5}} for your trip.',
    local_contact: 'Hi {{1}}, your local contact in {{2}}: {{3}} ({{4}}). They will assist you during your stay.',
    meal_preference: 'Hi {{1}}, please confirm your meal preferences for {{2}} trip: {{3}}. Special dietary requirements: {{4}}',
    room_assignment: 'Hi {{1}}, your room details for {{2}}: Room {{3}}, Floor {{4}}. Check-in after {{5}}.',
    tour_guide: 'Hi {{1}}, your tour guide for {{2}} is {{3}} ({{4}}). Meeting point: {{5}} at {{6}}.',
    spa_booking: 'Hi {{1}}, your spa appointment "{{2}}" at {{3}} is confirmed for {{4}} at {{5}}. Relax and rejuvenate! 💆‍♀️',
    adventure_waiver: 'Hi {{1}}, please sign the adventure activity waiver for {{2}}. Required for safety compliance. Link: {{3}}',
    photo_sharing: 'Hi {{1}}, share your amazing {{2}} trip photos with #{{3}} and get featured on our social media! 📱',
    post_trip_survey: 'Hi {{1}}, please rate your {{2}} experience: {{3}}. Your feedback helps us improve! ⭐',
    refund_processed: 'Hi {{1}}, your refund of ₹{{2}} for booking {{3}} has been processed. It will reflect in {{4}} days.',
    voucher_expiry: 'Reminder {{1}}: Your travel voucher {{2}} worth ₹{{3}} expires on {{4}}. Use it before expiry!',
    new_destination: 'Exciting news {{1}}! We now offer packages to {{2}}. Starting from ₹{{3}}. Early bird discount: {{4}}%',
    maintenance_notice: 'Hi {{1}}, {{2}} at your destination {{3}} will be under maintenance on {{4}}. Alternative arrangements: {{5}}',
    price_drop: 'Great news {{1}}! Price for your wishlist item "{{2}}" has dropped to ₹{{3}} (was ₹{{4}}). Book now!',
    group_discount: 'Hi {{1}}, you qualify for {{2}}% group discount on {{3}}+ bookings. Minimum group size: {{4}} people.',
    early_checkin: 'Hi {{1}}, early check-in approved for {{2}}. You can check-in from {{3}} instead of {{4}}. Enjoy! 🎉'
  };
  return templates[templateName] || null;
}

export async function sendTemplateMessage(options: { to: string; template: string; variables?: string[] }) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    // Render template body with variables
    let body = getTemplateBody(options.template) || options.template;
    if (options.variables && options.variables.length > 0) {
      body = body.replace(/\{\{(\d+)\}\}/g, (match, idx) => {
        const i = parseInt(idx, 10) - 1;
        return options.variables && options.variables[i] !== undefined ? options.variables[i] : match;
      });
    }

    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${options.to}`,
      body,
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      body,
      to: options.to,
      from: whatsappNumber,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error sending template message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function validateWebhookSignature(signature: string, url: string, body: string): boolean {
  try {
    // Basic validation - in production you would use Twilio's webhook validation
    return typeof signature === 'string' && signature.length > 0;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

export function parseIncomingMessage(body: any) {
  try {
    return {
      from: body.From?.replace('whatsapp:', '') || '',
      to: body.To?.replace('whatsapp:', '') || '',
      body: body.Body || '',
      messageSid: body.MessageSid || '',
      accountSid: body.AccountSid || '',
      numMedia: parseInt(body.NumMedia || '0'),
      mediaUrl: body.MediaUrl0 || null,
      mediaContentType: body.MediaContentType0 || null,
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return null;
  }
}

// Helper to get all available templates
export function getAllTemplates(): Record<string, string> {
  return {
    // Booking & Payment Templates
    booking_confirmation: 'Booking confirmation with details',
    booking_pending: 'Booking request under processing',
    payment_reminder: 'Payment due reminder',
    payment_received: 'Payment confirmation',
    partial_payment_received: 'Partial payment acknowledgment',
    refund_processed: 'Refund processing notification',
    
    // Trip Management Templates
    trip_update: 'Important trip updates',
    travel_itinerary: 'Detailed travel itinerary',
    departure_reminder: 'Trip departure reminder',
    return_reminder: 'Post-trip welcome back message',
    document_reminder: 'Required documents reminder',
    visa_update: 'Visa application status update',
    
    // Customer Service Templates
    welcome_message: 'Welcome new customers',
    support_info: 'Customer support information',
    emergency_contact: '24/7 emergency contact details',
    feedback_request: 'Post-trip feedback request',
    post_trip_survey: 'Detailed trip rating survey',
    
    // Travel Alerts & Updates
    weather_alert: 'Weather conditions and recommendations',
    flight_delay: 'Flight delay notifications',
    transport_update: 'Transportation updates',
    check_in_reminder: 'Online check-in reminders',
    covid_guidelines: 'COVID safety guidelines',
    maintenance_notice: 'Facility maintenance notices',
    
    // Accommodation & Services
    hotel_upgrade: 'Room upgrade notifications',
    room_assignment: 'Hotel room details',
    early_checkin: 'Early check-in approvals',
    spa_booking: 'Spa appointment confirmations',
    activity_booking: 'Activity booking confirmations',
    meal_preference: 'Meal preference confirmations',
    
    // Special Offers & Promotions
    last_minute_deal: 'Flash sales and urgent offers',
    seasonal_offer: 'Season-specific promotions',
    birthday_special: 'Birthday discount offers',
    anniversary_offer: 'Anniversary special packages',
    price_drop: 'Price reduction alerts',
    group_discount: 'Group booking discounts',
    voucher_expiry: 'Voucher expiration reminders',
    new_destination: 'New destination announcements',
    
    // Loyalty & Referral
    referral_bonus: 'Referral reward notifications',
    loyalty_reward: 'Loyalty points updates',
    
    // Specialized Services
    package_customization: 'Custom package confirmations',
    tour_guide: 'Tour guide assignment details',
    local_contact: 'Local assistance contact info',
    currency_exchange: 'Currency exchange rates',
    insurance_reminder: 'Travel insurance recommendations',
    adventure_waiver: 'Adventure activity waivers',
    group_booking: 'Group booking confirmations',
    
    // Social & Engagement
    photo_sharing: 'Social media photo sharing',
    festival_greeting: 'Festival and holiday greetings',
    
    // Cancellation
    cancellation_notice: 'Booking cancellation notices'
  };
}

// Helper to get template variables/placeholders
export function getTemplateVariables(templateName: string): string[] {
  const variableMap: Record<string, string[]> = {
    booking_confirmation: ['Name', 'Destination/Package', 'Check-in Date', 'Reference Number'],
    booking_pending: ['Name', 'Destination/Package', 'Processing Hours', 'Reference Number'],
    payment_reminder: ['Name', 'Amount', 'Booking Reference', 'Due Date'],
    payment_received: ['Name', 'Amount', 'Booking Reference'],
    partial_payment_received: ['Name', 'Paid Amount', 'Booking Reference', 'Remaining Amount', 'Due Date'],
    welcome_message: ['Name'],
    trip_update: ['Name', 'Destination', 'Trip Date'],
    travel_itinerary: ['Name', 'Destination', 'Itinerary Details', 'Contact Number'],
    feedback_request: ['Name', 'Booking Reference'],
    cancellation_notice: ['Name', 'Booking Reference', 'Trip Date'],
    festival_greeting: ['Festival Name', 'Festival Details'],
    support_info: ['Name', 'Booking Reference', 'Support Contact'],
    departure_reminder: ['Name', 'Destination', 'Departure Date', 'Meeting Point', 'Reporting Time'],
    return_reminder: ['Name', 'Destination'],
    document_reminder: ['Name', 'Trip Destination', 'Required Documents', 'Deadline'],
    visa_update: ['Name', 'Destination', 'Status', 'Additional Info'],
    weather_alert: ['Name', 'Destination', 'Weather Condition', 'Recommendation'],
    flight_delay: ['Name', 'Flight Number', 'Destination', 'Delay Hours', 'New Departure Time'],
    hotel_upgrade: ['Name', 'Destination', 'Upgraded Room Type'],
    emergency_contact: ['Name', 'Destination', 'Emergency Number', 'WhatsApp Number'],
    group_booking: ['Name', 'Group Size', 'Destination', 'Total Amount', 'Trip Date'],
    last_minute_deal: ['Name', 'Discount Percentage', 'Package Type', 'Validity'],
    birthday_special: ['Name', 'Discount Percentage', 'Validity'],
    anniversary_offer: ['Name', 'Discount Percentage'],
    referral_bonus: ['Name', 'Bonus Amount', 'Referred Person', 'Promo Code'],
    package_customization: ['Name', 'Package Name', 'Custom Itinerary', 'Additional Cost'],
    transport_update: ['Name', 'Trip Destination', 'Pickup Location', 'Pickup Time', 'Vehicle Details'],
    activity_booking: ['Name', 'Activity Name', 'Trip Destination', 'Activity Date', 'Activity Time'],
    insurance_reminder: ['Name', 'Destination', 'Coverage Details', 'Premium Amount'],
    loyalty_reward: ['Name', 'Points Earned', 'Total Points'],
    seasonal_offer: ['Season Name', 'Name', 'Discount Percentage', 'Destinations', 'Validity'],
    check_in_reminder: ['Name', 'Flight Details', 'Check-in Deadline'],
    covid_guidelines: ['Name', 'Destination', 'Guidelines'],
    currency_exchange: ['Name', 'Destination Currency', 'Exchange Rate', 'Currency Code', 'Recommended Amount'],
    local_contact: ['Name', 'Destination', 'Contact Person', 'Contact Number'],
    meal_preference: ['Name', 'Trip Destination', 'Meal Options', 'Special Requirements'],
    room_assignment: ['Name', 'Hotel Name', 'Room Number', 'Floor Number', 'Check-in Time'],
    tour_guide: ['Name', 'Destination', 'Guide Name', 'Guide Contact', 'Meeting Point', 'Meeting Time'],
    spa_booking: ['Name', 'Service Name', 'Spa Location', 'Appointment Date', 'Appointment Time'],
    adventure_waiver: ['Name', 'Activity Name', 'Waiver Link'],
    photo_sharing: ['Name', 'Trip Destination', 'Hashtag'],
    post_trip_survey: ['Name', 'Trip Destination', 'Survey Link'],
    refund_processed: ['Name', 'Refund Amount', 'Booking Reference', 'Processing Days'],
    voucher_expiry: ['Name', 'Voucher Code', 'Voucher Value', 'Expiry Date'],
    new_destination: ['Name', 'Destination', 'Starting Price', 'Discount Percentage'],
    maintenance_notice: ['Name', 'Facility Name', 'Destination', 'Maintenance Date', 'Alternative Arrangements'],
    price_drop: ['Name', 'Package Name', 'New Price', 'Old Price'],
    group_discount: ['Name', 'Discount Percentage', 'Minimum Bookings', 'Minimum Group Size'],
    early_checkin: ['Name', 'Hotel Name', 'Early Check-in Time', 'Standard Check-in Time']
  };
  
  return variableMap[templateName] || [];
}

// Helper to validate template variables
export function validateTemplateVariables(templateName: string, variables: string[]): { isValid: boolean; missing: string[]; extra: string[] } {
  const requiredVars = getTemplateVariables(templateName);
  const missing = requiredVars.filter((_, index) => !variables[index] || variables[index].trim() === '');
  const extra = variables.slice(requiredVars.length);
  
  return {
    isValid: missing.length === 0,
    missing: missing.map((_, index) => `{{${index + 1}}} - ${requiredVars[index]}`),
    extra: extra
  };
}
