import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import {
  canAccessInquiryForContext,
  resolveInquiryAccessContext,
} from "@/lib/inquiry-access";
import { recordSupplierOutreach } from "@/lib/inquiry-supplier-outreach";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().min(5, "Phone number is required").max(30),
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  messagePreview: z.string().max(2000).optional().nullable(),
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
        status: true,
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

    let supplierName = parsed.supplierName?.trim() || "";
    if (parsed.supplierId) {
      const supplier = await prismadb.supplier.findUnique({
        where: { id: parsed.supplierId },
        select: { id: true, name: true },
      });
      if (!supplier) {
        return jsonError("Supplier not found", 404, "NOT_FOUND");
      }
      supplierName = supplier.name;
    }
    if (!supplierName) {
      supplierName = parsed.phone;
    }

    const { action, inquiryStatus } = await recordSupplierOutreach({
      inquiryId: inquiry.id,
      actionType: "WHATSAPP_SUPPLIER",
      currentStatus: inquiry.status,
      payload: {
        supplierId: parsed.supplierId ?? null,
        supplierName,
        channel: "WHATSAPP",
        contact: parsed.phone,
        messagePreview: parsed.messagePreview ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      inquiryStatus,
      outreach: {
        supplierId: parsed.supplierId ?? null,
        supplierName,
        channel: "WHATSAPP",
        contact: parsed.phone,
      },
    });
  });
}
