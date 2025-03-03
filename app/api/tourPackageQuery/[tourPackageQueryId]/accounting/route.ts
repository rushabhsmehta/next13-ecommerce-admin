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

    const data = await req.json();
    const { purchaseDetails, saleDetails, paymentDetails, receiptDetails, expenseDetails } = data;

    console.log("Incoming data:", data);

    // Process payment details to map account IDs correctly
    const processedPaymentDetails = paymentDetails.map((detail: any) => {
      const { accountId, accountType, ...restDetail } = detail;
      
      return {
        ...restDetail,
        // Set the appropriate account ID based on account type
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      };
    });

    // Process receipt details
    const processedReceiptDetails = receiptDetails.map((detail: any) => {
      const { accountId, accountType, ...restDetail } = detail;
      
      return {
        ...restDetail,
        // Set the appropriate account ID based on account type
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      };
    });

    // Process expense details
    const processedExpenseDetails = expenseDetails.map((detail: any) => {
      const { accountId, accountType, ...restDetail } = detail;
      
      return {
        ...restDetail,
        // Set the appropriate account ID based on account type
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      };
    });

    // Log processed details for debugging
    console.log("Processed payment details:", processedPaymentDetails);
    console.log("Processed receipt details:", processedReceiptDetails);
    console.log("Processed expense details:", processedExpenseDetails);

    const tourPackageQuery = await prismadb.tourPackageQuery.update({
      where: {
        id: params.tourPackageQueryId
      },
      data: {
        purchaseDetails: purchaseDetails && purchaseDetails.length > 0
          ? { 
              deleteMany: {}, 
              createMany: { 
                data: purchaseDetails
              } 
            }
          : { deleteMany: {} },
        saleDetails: saleDetails && saleDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: saleDetails
              }
            }
          : { deleteMany: {} },
        paymentDetails: paymentDetails && paymentDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: processedPaymentDetails
              }
            }
          : { deleteMany: {} },
        receiptDetails: receiptDetails && receiptDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: processedReceiptDetails
              }
            }
          : { deleteMany: {} },
        expenseDetails: expenseDetails && expenseDetails.length > 0
          ? {
              deleteMany: {},
              createMany: {
                data: processedExpenseDetails
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
            supplier: true,
            bankAccount: true,
            cashAccount: true
          }
        },
        receiptDetails: {
          include: {
            customer: true,
            bankAccount: true,
            cashAccount: true
          }
        },
        expenseDetails: {
          include: {
            bankAccount: true,
            cashAccount: true
          }
        }
      }
    });

    return NextResponse.json(tourPackageQuery);
  } catch (error) {
    console.log('[ACCOUNTING_DETAILS_UPDATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}