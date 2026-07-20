import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import {
  canAccessInquiryForContext,
  resolveInquiryAccessContext,
} from "@/lib/inquiry-access";
import { markSupplierQuoteReceived } from "@/lib/inquiry-supplier-outreach";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().min(1, "Supplier name is required").max(200),
  contact: z.string().optional().nullable(),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

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

    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: {
        id: true,
        associatePartnerId: true,
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

    const { action } = await markSupplierQuoteReceived({
      inquiryId: inquiry.id,
      payload: {
        supplierId: parsed.supplierId ?? null,
        supplierName: parsed.supplierName,
        contact: parsed.contact ?? "",
        channel: parsed.channel,
        notes: parsed.notes ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      action,
    });
  });
}
