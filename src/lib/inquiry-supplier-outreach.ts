/**
 * Structured supplier outreach logged on InquiryAction.remarks as JSON
 * with a stable prefix for safe parsing alongside legacy free-text remarks.
 */

import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import type { InquiryStatus } from "@/lib/inquiry-statuses";

export const OUTREACH_REMARKS_PREFIX = "SUPPLIER_OUTREACH_V1:";

export const SUPPLIER_OUTREACH_ACTION_TYPES = [
  "EMAIL_SUPPLIER",
  "WHATSAPP_SUPPLIER",
  "SUPPLIER_QUOTE_RECEIVED",
] as const;

export type SupplierOutreachActionType =
  (typeof SUPPLIER_OUTREACH_ACTION_TYPES)[number];

export type SupplierOutreachChannel = "EMAIL" | "WHATSAPP";

export interface SupplierOutreachPayload {
  supplierId?: string | null;
  supplierName: string;
  channel: SupplierOutreachChannel;
  contact: string;
  subject?: string | null;
  messagePreview?: string | null;
  externalId?: string | null;
  quoteReceivedAt?: string | null;
  notes?: string | null;
}

export interface SupplierOutreachSummary extends SupplierOutreachPayload {
  actionId: string;
  actionType: SupplierOutreachActionType;
  actionDate: string;
  createdAt: string;
}

const TERMINAL_STATUSES: InquiryStatus[] = ["CONFIRMED", "CANCELLED"];

export function shouldSetAskedToSupplier(currentStatus: string | null | undefined): boolean {
  const normalized = (currentStatus || "").toUpperCase();
  return !TERMINAL_STATUSES.includes(normalized as InquiryStatus);
}

function optionalTrimmed(value: string | null | undefined, max?: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (max != null && trimmed.length > max) {
    return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
  }
  return trimmed;
}

export function buildOutreachRemarks(payload: SupplierOutreachPayload): string {
  // Omit null/empty fields; soft-cap message preview so action rows stay readable.
  const body: Record<string, string> = {
    supplierName: optionalTrimmed(payload.supplierName) || "Supplier",
    channel: payload.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
    contact: optionalTrimmed(payload.contact) || "",
  };
  const supplierId = optionalTrimmed(payload.supplierId);
  if (supplierId) body.supplierId = supplierId;
  const subject = optionalTrimmed(payload.subject);
  if (subject) body.subject = subject;
  const messagePreview = optionalTrimmed(payload.messagePreview, 2000);
  if (messagePreview) body.messagePreview = messagePreview;
  const externalId = optionalTrimmed(payload.externalId);
  if (externalId) body.externalId = externalId;
  const quoteReceivedAt = optionalTrimmed(payload.quoteReceivedAt);
  if (quoteReceivedAt) body.quoteReceivedAt = quoteReceivedAt;
  const notes = optionalTrimmed(payload.notes, 2000);
  if (notes) body.notes = notes;

  return `${OUTREACH_REMARKS_PREFIX}${JSON.stringify(body)}`;
}

export function parseOutreachRemarks(
  remarks: string | null | undefined
): SupplierOutreachPayload | null {
  if (!remarks || !remarks.startsWith(OUTREACH_REMARKS_PREFIX)) {
    // Legacy free-text email remarks: "Emailed supplier email@x: subject..."
    if (remarks && /^Emailed supplier\s+/i.test(remarks)) {
      const match = remarks.match(/^Emailed supplier\s+(\S+?):/i);
      return {
        supplierId: null,
        supplierName: match?.[1] || "Supplier",
        channel: "EMAIL",
        contact: match?.[1] || "",
        subject: null,
        messagePreview: remarks,
        externalId: null,
        quoteReceivedAt: null,
        notes: null,
      };
    }
    return null;
  }
  try {
    const raw = JSON.parse(remarks.slice(OUTREACH_REMARKS_PREFIX.length)) as SupplierOutreachPayload;
    if (!raw || typeof raw !== "object") return null;
    return {
      supplierId: raw.supplierId ?? null,
      supplierName: raw.supplierName || "Supplier",
      channel: raw.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
      contact: raw.contact || "",
      subject: raw.subject ?? null,
      messagePreview: raw.messagePreview ?? null,
      externalId: raw.externalId ?? null,
      quoteReceivedAt: raw.quoteReceivedAt ?? null,
      notes: raw.notes ?? null,
    };
  } catch {
    return null;
  }
}

export function summarizeSupplierOutreach(
  actions: Array<{
    id: string;
    actionType: string;
    remarks: string;
    actionDate: Date | string;
    createdAt: Date | string;
  }>
): SupplierOutreachSummary[] {
  const quoteByKey = new Map<string, string>();
  const outreach: SupplierOutreachSummary[] = [];

  for (const action of actions) {
    if (action.actionType === "SUPPLIER_QUOTE_RECEIVED") {
      const parsed = parseOutreachRemarks(action.remarks);
      if (parsed) {
        const key = `${parsed.supplierId || ""}|${parsed.contact}|${parsed.channel}`;
        const when =
          parsed.quoteReceivedAt ||
          (typeof action.actionDate === "string"
            ? action.actionDate
            : action.actionDate.toISOString());
        quoteByKey.set(key, when);
      }
      continue;
    }
    if (
      action.actionType !== "EMAIL_SUPPLIER" &&
      action.actionType !== "WHATSAPP_SUPPLIER"
    ) {
      continue;
    }
    const parsed = parseOutreachRemarks(action.remarks);
    if (!parsed) continue;
    outreach.push({
      ...parsed,
      actionId: action.id,
      actionType: action.actionType as SupplierOutreachActionType,
      actionDate:
        typeof action.actionDate === "string"
          ? action.actionDate
          : action.actionDate.toISOString(),
      createdAt:
        typeof action.createdAt === "string"
          ? action.createdAt
          : action.createdAt.toISOString(),
    });
  }

  return outreach.map((item) => {
    const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
    const quoteAt = quoteByKey.get(key);
    if (quoteAt && !item.quoteReceivedAt) {
      return { ...item, quoteReceivedAt: quoteAt };
    }
    return item;
  });
}

export async function recordSupplierOutreach(input: {
  inquiryId: string;
  actionType: "EMAIL_SUPPLIER" | "WHATSAPP_SUPPLIER";
  payload: SupplierOutreachPayload;
  currentStatus?: string | null;
}): Promise<{
  action: { id: string; actionType: string; remarks: string; actionDate: Date };
  inquiryStatus: string;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const remarks = buildOutreachRemarks(input.payload);

  const action = await prismadb.inquiryAction.create({
    data: {
      inquiryId: input.inquiryId,
      actionType: input.actionType,
      remarks,
      actionDate: dateToUtc(today)!,
    },
  });

  let inquiryStatus = input.currentStatus || "PENDING";
  if (shouldSetAskedToSupplier(input.currentStatus)) {
    const updated = await prismadb.inquiry.update({
      where: { id: input.inquiryId },
      data: { status: "ASKED_TO_SUPPLIER" },
      select: { status: true },
    });
    inquiryStatus = updated.status;
  }

  return { action, inquiryStatus };
}

export async function markSupplierQuoteReceived(input: {
  inquiryId: string;
  payload: Omit<SupplierOutreachPayload, "channel"> & {
    channel?: SupplierOutreachChannel;
  };
}): Promise<{ action: { id: string; actionType: string; remarks: string } }> {
  const today = new Date().toISOString().slice(0, 10);
  const remarks = buildOutreachRemarks({
    supplierId: input.payload.supplierId ?? null,
    supplierName: input.payload.supplierName,
    channel: input.payload.channel || "EMAIL",
    contact: input.payload.contact || "",
    subject: null,
    messagePreview: input.payload.notes || null,
    externalId: null,
    quoteReceivedAt: new Date().toISOString(),
    notes: input.payload.notes ?? null,
  });

  const action = await prismadb.inquiryAction.create({
    data: {
      inquiryId: input.inquiryId,
      actionType: "SUPPLIER_QUOTE_RECEIVED",
      remarks,
      actionDate: dateToUtc(today)!,
    },
  });

  return { action };
}

export function outreachActionLabel(actionType: string): string {
  switch (actionType) {
    case "EMAIL_SUPPLIER":
      return "Email Supplier";
    case "WHATSAPP_SUPPLIER":
      return "WhatsApp Supplier";
    case "SUPPLIER_QUOTE_RECEIVED":
      return "Supplier Quote Received";
    default:
      return actionType;
  }
}
