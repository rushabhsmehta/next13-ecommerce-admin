import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const { purchaseDetails, saleDetails, paymentDetails, receiptDetails, expenseDetails } = await req.json();

    const tourPackageQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId
      },
      data: {
        purchaseDetails: purchaseDetails && purchaseDetails.length > 0
          ? { 
              deleteMany: {}, 
              createMany: { 
                data: purchaseDetails.map((detail: any) => ({
                  ...detail,
                 // tourPackageQueryId: params.tourPackageQueryId
                }))
              } 
            }
          : { deleteMany: {} },
        saleDetails: saleDetails && saleDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: saleDetails.map((detail: any) => ({
                  ...detail,
             //     tourPackageQueryId: params.tourPackageQueryId
                }))
              }
            }
          : { deleteMany: {} },
        paymentDetails: paymentDetails && paymentDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: paymentDetails.map((detail: any) => ({
                  ...detail,
               //   tourPackageQueryId: params.tourPackageQueryId
                }))
              }
            }
          : { deleteMany: {} },
        receiptDetails: receiptDetails && receiptDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: receiptDetails.map((detail: any) => ({
                  ...detail,
                //  tourPackageQueryId: params.tourPackageQueryId
                }))
              }
            }
          : { deleteMany: {} },
        expenseDetails: expenseDetails && expenseDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: expenseDetails.map((detail: any) => ({
                  ...detail,
             //     tourPackageQueryId: params.tourPackageQueryId
                }))
              }
            }
          : { deleteMany: {} },
      },
      include: {
        purchaseDetails: {
          include: {
            supplier: true
          }
        },
        saleDetails: {
          include: {
            customer: true
          }
        },
        paymentDetails: {
          include: {
            supplier: true
          }
        },
        receiptDetails: {
          include: {
            customer: true
          }
        },
        expenseDetails: true
      }
    });

    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[ACCOUNTING_DETAILS_UPDATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}