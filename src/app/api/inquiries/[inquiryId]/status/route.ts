import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { sendMetaEvent } from "@/lib/meta-capi";
import { headers } from "next/headers";

const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"];

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.inquiryId) {
      return new NextResponse("Inquiry id is required", { status: 400 });
    }

    if (!body.status || !validStatuses.includes(body.status)) {
      return new NextResponse("Invalid status value", { status: 400 });
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
              take: 1
            }
          }
        });

        if (fullInquiry) {
          const headersList = headers();
          const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
          const userAgent = headersList.get("user-agent") || "";

          let purchaseValue = 0;
          if (fullInquiry.tourPackageQueries.length > 0) {
            const latestQuery = fullInquiry.tourPackageQueries[0];
            // Safe parse the price string which might contain currency symbols or be text
            const rawPrice = latestQuery.totalPrice || "0";
            // Remove non-numeric chars except dot
            const cleanedPrice = rawPrice.replace(/[^0-9.]/g, '');
            purchaseValue = parseFloat(cleanedPrice) || 0;
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
