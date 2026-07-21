import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface EmailSupplierPayload {
  to: string | string[];
  subject: string;
  body: string;
  supplierId?: string | null;
  supplierName?: string | null;
}

export interface WhatsAppSupplierLogPayload {
  phone: string;
  supplierId?: string | null;
  supplierName?: string | null;
  messagePreview?: string | null;
}

export interface SupplierQuoteReceivedPayload {
  supplierId?: string | null;
  supplierName: string;
  contact?: string | null;
  channel?: "EMAIL" | "WHATSAPP";
  notes?: string | null;
}

export function createInquirySupplierClient(authRequest: AuthenticatedRequest) {
  return {
    emailSupplier(inquiryId: string, payload: EmailSupplierPayload) {
      return authRequest<{
        success: boolean;
        messageId?: string;
        inquiryStatus?: string;
      }>(`/api/inquiries/${encodeURIComponent(inquiryId)}/email-supplier`, {
        method: "POST",
        body: payload,
      });
    },

    logWhatsAppSupplier(inquiryId: string, payload: WhatsAppSupplierLogPayload) {
      return authRequest<{
        success: boolean;
        inquiryStatus?: string;
      }>(`/api/inquiries/${encodeURIComponent(inquiryId)}/whatsapp-supplier`, {
        method: "POST",
        body: payload,
      });
    },

    markSupplierQuoteReceived(
      inquiryId: string,
      payload: SupplierQuoteReceivedPayload
    ) {
      return authRequest<{ success: boolean }>(
        `/api/inquiries/${encodeURIComponent(inquiryId)}/supplier-quote-received`,
        {
          method: "POST",
          body: payload,
        }
      );
    },
  };
}

export type InquirySupplierClient = ReturnType<typeof createInquirySupplierClient>;

/** Lightweight outreach summary for mobile (mirrors web helper logic). */
export interface MobileOutreachItem {
  supplierId: string | null;
  supplierName: string;
  channel: "EMAIL" | "WHATSAPP";
  contact: string;
  actionDate: string;
  quoteReceivedAt: string | null;
}

const PREFIX = "SUPPLIER_OUTREACH_V1:";

function parseRemarks(remarks: string): {
  supplierId: string | null;
  supplierName: string;
  channel: "EMAIL" | "WHATSAPP";
  contact: string;
  quoteReceivedAt: string | null;
} | null {
  if (!remarks?.startsWith(PREFIX)) {
    if (/^Emailed supplier\s+/i.test(remarks || "")) {
      const match = remarks.match(/^Emailed supplier\s+(\S+?):/i);
      return {
        supplierId: null,
        supplierName: match?.[1] || "Supplier",
        channel: "EMAIL",
        contact: match?.[1] || "",
        quoteReceivedAt: null,
      };
    }
    return null;
  }
  try {
    const raw = JSON.parse(remarks.slice(PREFIX.length));
    return {
      supplierId: raw.supplierId ?? null,
      supplierName: raw.supplierName || "Supplier",
      channel: raw.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
      contact: raw.contact || "",
      quoteReceivedAt: raw.quoteReceivedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function summarizeMobileOutreach(
  actions: Array<{
    id: string;
    actionType: string;
    remarks: string;
    actionDate: string;
    createdAt?: string;
  }>
): MobileOutreachItem[] {
  const quoteByKey = new Map<string, string>();
  const items: MobileOutreachItem[] = [];

  for (const action of actions) {
    const parsed = parseRemarks(action.remarks);
    if (!parsed) continue;
    const key = `${parsed.supplierId || ""}|${parsed.contact}|${parsed.channel}`;
    if (action.actionType === "SUPPLIER_QUOTE_RECEIVED") {
      quoteByKey.set(key, parsed.quoteReceivedAt || action.actionDate);
      continue;
    }
    if (
      action.actionType !== "EMAIL_SUPPLIER" &&
      action.actionType !== "WHATSAPP_SUPPLIER"
    ) {
      continue;
    }
    items.push({
      supplierId: parsed.supplierId,
      supplierName: parsed.supplierName,
      channel: parsed.channel,
      contact: parsed.contact,
      actionDate: action.actionDate,
      quoteReceivedAt: parsed.quoteReceivedAt,
    });
  }

  const map = new Map<string, MobileOutreachItem>();
  for (const item of items) {
    const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
    const existing = map.get(key);
    if (!existing || existing.actionDate < item.actionDate) {
      map.set(key, item);
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
      const quoteAt = quoteByKey.get(key);
      return quoteAt && !item.quoteReceivedAt
        ? { ...item, quoteReceivedAt: quoteAt }
        : item;
    })
    .sort((a, b) => (a.actionDate < b.actionDate ? 1 : -1));
}

export function buildSupplierInquiryMessage(parts: {
  customerName?: string | null;
  location?: string;
  journeyDate?: string | null;
  numAdults?: number;
  numChildren5to11?: number;
  numChildrenBelow5?: number;
  remarks?: string | null;
}): { subject: string; body: string; whatsappBody: string } {
  const travelers = [
    parts.numAdults ? `${parts.numAdults} Adults` : null,
    parts.numChildren5to11 ? `${parts.numChildren5to11} Children (5-11)` : null,
    parts.numChildrenBelow5 ? `${parts.numChildrenBelow5} Children (below 5)` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const customerName = parts.customerName?.trim() || null;
  const location = parts.location || "—";
  const journey =
    parts.journeyDate?.slice(0, 10) || "Not specified";
  const remarks = parts.remarks?.trim() || "None";

  const subject = ["Travel inquiry", customerName, location, journey]
    .filter(Boolean)
    .join(" — ");
  const body = `New Travel Inquiry

Destination: ${location}

Journey Date: ${journey}

Travelers: ${travelers || "Not specified"}

Special Requirements:
${remarks}

Please share your best rates and availability.
Looking forward to your response.

Best regards,
Aagam Holidays Team`;

  const whatsappBody = `🌟 *New Travel Inquiry* 🌟

📍 *Destination:* ${location}

📅 *Journey Date:* ${journey}

👥 *Travelers:* ${travelers || "Not specified"}

💬 *Special Requirements:*
${remarks}

Please share your best rates and availability.
Looking forward to your response! 🙏

Best regards,
Aagam Holidays Team`;

  return { subject, body, whatsappBody };
}

export function formatPhoneForWhatsApp(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) return digitsOnly;
  if (digitsOnly.length === 10) return `91${digitsOnly}`;
  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return `91${digitsOnly.substring(1)}`;
  }
  return digitsOnly;
}
