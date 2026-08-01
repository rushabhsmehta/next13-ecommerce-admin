import { NextResponse } from "next/server";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import prismadb from "@/lib/prismadb";
import { sendMetaEvent } from "@/lib/meta-capi";
import { headers } from "next/headers";
import { INQUIRY_STATUSES } from "@/lib/inquiry-statuses";
import { canAccessInquiryForContext, resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { resolveQueryQuoteTotal } from "@/lib/resolve-query-quote-total";

const validStatuses: readonly string[] = INQUIRY_STATUSES;

export async function PATCH(req: Request, props: { params: Promise<{ inquiryId: string }> }) {
  const params = await props.params;
  try {
    const userId = await getRequestClerkUserId(req);
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    const accessContext = await resolveInquiryAccessContext(userId);

    if (!params.inquiryId) {
      return new NextResponse("Inquiry id is required", { status: 400 });
    }

    if (!body.status || !validStatuses.includes(body.status)) {
      return new NextResponse("Invalid status value", { status: 400 });
    }

    const existingInquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: { id: true, associatePartnerId: true },
    });
    if (!existingInquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }
    if (!canAccessInquiryForContext(accessContext, existingInquiry.associatePartnerId ?? null)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const inquiry = await prismadb.inquiry.update({
      where: {
        id: params.inquiryId,
      },
      data: {
        status: body.status,
      }
    });

    // Send "Purchase" event if status is CONFIRMED
    if (body.status === "CONFIRMED") {
      try {
        const fullInquiry = await prismadb.inquiry.findUnique({
          where: { id: params.inquiryId },
          include: {
            tourPackageQueries: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                confirmedVariantId: true,
                variantPricingData: true,
              },
            }
          }
        });

        if (fullInquiry) {
          const headersList = await headers();
          const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
          const userAgent = headersList.get("user-agent") || "";

          let purchaseValue = 0;
          if (fullInquiry.tourPackageQueries.length > 0) {
            const latestQuery = fullInquiry.tourPackageQueries[0];
            const quote = resolveQueryQuoteTotal({
              confirmedVariantId: latestQuery.confirmedVariantId,
              variantPricingData: latestQuery.variantPricingData,
            });
            purchaseValue = quote.total ?? 0;
          }

          await sendMetaEvent("Purchase", {
            ip,
            userAgent,
            email: undefined, // Could fetch if we needed to, but phone is main key usually
            phone: fullInquiry.customerMobileNumber,
            fbc: fullInquiry.fb_browser_id,
            fbp: fullInquiry.fb_client_id,
            externalId: fullInquiry.id,
            url: req.url
          }, {
            value: purchaseValue,
            currency: 'INR'
          });
        }
      } catch (metaError) {
        console.error("[META_CAPI] Error sending Purchase event:", metaError);
      }
    }

    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_STATUS_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
