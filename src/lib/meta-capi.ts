import { format } from 'date-fns';

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Helper to hash PII data (SHA-256) - Simplified for this environment without dragging in complex crypto libs if crypto is available globally or we use minimal implementation. 
// However, in Node environment, we can use 'crypto'.
import crypto from 'crypto';

function hashData(data: string | undefined | null): string | undefined {
    if (!data) return undefined;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

interface UserData {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string; // Email (hashed)
    ph?: string; // Phone (hashed)
    fbc?: string;
    fbp?: string;
    external_id?: string;
    [key: string]: any;
}

interface CustomData {
    currency?: string;
    value?: number;
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    status?: string;
    [key: string]: any;
}

interface MetaEvent {
    event_name: string;
    event_time: number;
    user_data: UserData;
    custom_data?: CustomData;
    event_source_url?: string;
    action_source: 'website';
}

export async function sendMetaEvent(
    eventName: string,
    userDataRaw: {
        ip?: string;
        userAgent?: string;
        email?: string;
        phone?: string;
        fbc?: string | null;
        fbp?: string | null;
        externalId?: string;
        url?: string;
    },
    customData?: CustomData
) {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
        console.warn('[META_CAPI] Missing META_PIXEL_ID or META_ACCESS_TOKEN env variables. Event not sent.');
        return;
    }

    try {
        const currentTimestamp = Math.floor(Date.now() / 1000);

        const userData: UserData = {
            client_ip_address: userDataRaw.ip,
            client_user_agent: userDataRaw.userAgent,
            fbc: userDataRaw.fbc || undefined,
            fbp: userDataRaw.fbp || undefined,
            external_id: userDataRaw.externalId ? hashData(userDataRaw.externalId) : undefined,
        };

        if (userDataRaw.email) userData.em = hashData(userDataRaw.email);
        if (userDataRaw.phone) userData.ph = hashData(userDataRaw.phone);

        const eventPayload: MetaEvent = {
            event_name: eventName,
            event_time: currentTimestamp,
            action_source: 'website',
            user_data: userData,
            custom_data: customData,
            event_source_url: userDataRaw.url
        };

        console.log(`[META_CAPI] Sending event: ${eventName}`, JSON.stringify(eventPayload, null, 2));

        const response = await fetch(`https://graph.facebook.com/v18.0/${PIXEL_ID}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: [eventPayload],
                access_token: ACCESS_TOKEN,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[META_CAPI] Error response from Meta:', JSON.stringify(result, null, 2));
        } else {
            console.log('[META_CAPI] Success:', JSON.stringify(result));
        }
    } catch (error) {
        console.error('[META_CAPI] Exception sending event:', error);
    }
}
