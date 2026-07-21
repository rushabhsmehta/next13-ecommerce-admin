import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import {
  canAccessInquiryForContext,
  resolveInquiryAccessContext,
} from "@/lib/inquiry-access";
import { sendGmailMessage } from "@/lib/gmail-send";
import { recordSupplierOutreach } from "@/lib/inquiry-supplier-outreach";
import {
  formatSupplierEmails,
  requireValidSupplierEmails,
} from "@/lib/supplier-emails";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.union([
    z.string().min(1, "Valid supplier email is required"),
    z.array(z.string().min(1)).min(1, "Valid supplier email is required"),
  ]),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Message body is required").max(20000),
  htmlBody: z.string().max(50000).optional(),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToSimpleHtml(text: string): string {
  const escaped = escapeHtml(text);
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;white-space:pre-wrap;">${escaped}</body></html>`;
}

export async function POST(
  req: Request,
  props: { params: Promise<{ inquiryId: string }> }
) {
  return handleApi(async () => {
    const params = await props.params;
    const userId = await getRequestClerkUserId(req);
    if (!userId) {
      return jsonError("Unauthenticated", 403, "FORBIDDEN");
    }

    const accessContext = await resolveInquiryAccessContext(userId);
    const parsed = bodySchema.parse(await req.json());

    let recipients: string[];
    try {
      recipients = requireValidSupplierEmails(parsed.to);
    } catch (err) {
      return jsonError(
        err instanceof Error ? err.message : "Valid supplier email is required",
        422,
        "VALIDATION_ERROR"
      );
    }
    const toContact = formatSupplierEmails(recipients) || recipients[0];

    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: {
        id: true,
        status: true,
        associatePartnerId: true,
        location: { select: { label: true } },
      },
    });

    if (!inquiry) {
      return jsonError("Inquiry not found", 404, "NOT_FOUND");
    }

    if (
      !canAccessInquiryForContext(
        accessContext,
        inquiry.associatePartnerId ?? null
      )
    ) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    let supplierName = parsed.supplierName?.trim() || "";
    if (parsed.supplierId) {
      const supplier = await prismadb.supplier.findUnique({
        where: { id: parsed.supplierId },
        select: { id: true, email: true, name: true },
      });
      if (!supplier) {
        return jsonError("Supplier not found", 404, "NOT_FOUND");
      }
      supplierName = supplier.name;
    }
    if (!supplierName) {
      supplierName = toContact;
    }

    const html = parsed.htmlBody?.trim() || textToSimpleHtml(parsed.body);

    let messageId: string;
    try {
      const result = await sendGmailMessage({
        to: recipients,
        subject: parsed.subject,
        text: parsed.body,
        html,
      });
      messageId = result.id;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      console.error("[INQUIRY_EMAIL_SUPPLIER]", err);
      if (err.code === "GMAIL_NOT_CONFIGURED") {
        return jsonError(err.message, 503, "GMAIL_NOT_CONFIGURED");
      }
      return jsonError(
        err.message || "Failed to send email",
        502,
        "GMAIL_SEND_FAILED"
      );
    }

    const locationLabel = inquiry.location?.label || "Unknown location";
    const { action, inquiryStatus } = await recordSupplierOutreach({
      inquiryId: inquiry.id,
      actionType: "EMAIL_SUPPLIER",
      currentStatus: inquiry.status,
      payload: {
        supplierId: parsed.supplierId ?? null,
        supplierName,
        channel: "EMAIL",
        contact: toContact,
        subject: parsed.subject,
        messagePreview: `${parsed.subject} (${locationLabel})`,
        externalId: messageId,
      },
    });

    return NextResponse.json({
      success: true,
      messageId,
      action,
      inquiryStatus,
      outreach: {
        supplierId: parsed.supplierId ?? null,
        supplierName,
        channel: "EMAIL",
        contact: toContact,
        recipients,
      },
    });
  });
}
