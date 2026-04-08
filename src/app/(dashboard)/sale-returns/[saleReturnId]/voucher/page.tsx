import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";
import { calculateSalePaymentStatus } from "@/lib/payment-utils";

interface CreditNoteVoucherPageProps {
    params: Promise<{
        saleReturnId: string;
    }>;
}

const CreditNoteVoucherPage = async (props: CreditNoteVoucherPageProps) => {
    const params = await props.params;
    // Get sale return details with related data including items
    const saleReturn = await prismadb.saleReturn.findUnique({
        where: { id: params.saleReturnId },
        include: {
            saleDetail: {
                include: {
                    customer: true,
                    tourPackageQuery: true
                }
            },
            items: {
                include: {
                    unitOfMeasure: true,
                    taxSlab: true,
                    saleItem: true
                }
            }
        },
    });

    if (!saleReturn) {
        return notFound();
    }

    // Get organization data for displaying in the voucher
    const organization = await prismadb.organization.findFirst({
        orderBy: {
            createdAt: 'asc'
        }    });    // Format the sale return date
    const formattedDate = formatLocalDate(saleReturn.returnDate, "MMMM d, yyyy");
    const originalSaleDate = formatLocalDate(saleReturn.saleDetail.saleDate, "MMMM d, yyyy");

    // Check if this is a multi-item return
    const isMultiItem = saleReturn.items && saleReturn.items.length > 0;

    // Original invoice info
    const originalInvoice = saleReturn.saleDetail.invoiceNumber || `SV-${saleReturn.saleDetail.id.substring(0, 8).toUpperCase()}`;
    const packageName = saleReturn.saleDetail.tourPackageQuery?.tourPackageQueryName || "Sale Return";

    // Get payment status to determine how much of the return should be credited
    const paymentStatus = await calculateSalePaymentStatus(saleReturn.saleDetail.id);

    // Calculate the proportion of the return amount that should be credited based on payment status
    const creditablePercentage = paymentStatus.paymentPercentage;

    // Convert the original amounts to creditable amounts
    const originalBaseAmount = saleReturn.amount;
    const originalGstAmount = saleReturn.gstAmount || 0;

    // If creditNoteAmount is explicitly set, use it; otherwise fall back to payment percentage
    let creditableBaseAmount: number;
    let creditableGstAmount: number;
    if (saleReturn.creditNoteAmount != null) {
      // User specified a credit note amount at issuance
      creditableBaseAmount = saleReturn.creditNoteAmount;
      // Proportionally compute GST based on the ratio of creditNoteAmount to original amount
      creditableGstAmount = originalBaseAmount > 0
        ? parseFloat((originalGstAmount * (saleReturn.creditNoteAmount / originalBaseAmount)).toFixed(2))
        : 0;
    } else {
      // Legacy: apply payment percentage to get the actual amount to be credited
      creditableBaseAmount = parseFloat((originalBaseAmount * creditablePercentage).toFixed(2));
      creditableGstAmount = parseFloat((originalGstAmount * creditablePercentage).toFixed(2));
    }

    // Calculate tax details
    const hasGst = !!creditableGstAmount && creditableGstAmount > 0;

    // Define GST type (always exclusive for consistency with sales)
    const isGstInclusive = false;

    // Calculate base and total amounts based on GST type
    let baseAmount = creditableBaseAmount;
    let totalAmount = creditableBaseAmount;
    let gstDisplayText = "";if (hasGst) {
            if (isGstInclusive) {
                // If GST is inclusive, the base amount is the price minus GST
                baseAmount = creditableBaseAmount - creditableGstAmount;
                totalAmount = creditableBaseAmount;
                gstDisplayText = "(Inclusive)";
            } else {
                // If GST is exclusive, the base amount is the price and total includes GST
                baseAmount = creditableBaseAmount;
                totalAmount = creditableBaseAmount + creditableGstAmount;
                gstDisplayText = "(Exclusive)";
            }
        }    // Prepare data for voucher layout with GST info
    const voucherData = {
        title: "CREDIT NOTE",
        subtitle: isMultiItem ? "Credit Note for Returned Items" : "Credit Note for Returned Product",
        voucherNo: saleReturn.reference || `CR-${saleReturn.id.substring(0, 8).toUpperCase()}`,
        date: formattedDate,
        leftInfo: [
            {
                label: "CUSTOMER",
                content: (
                    <div>
                        <p className="font-medium">{saleReturn.saleDetail.customer?.name || "N/A"}</p>
                        <p>{saleReturn.saleDetail.customer?.contact || "No contact information"}</p>
                        <p>{saleReturn.saleDetail.customer?.email || ""}</p>
                    </div>
                )
            }
        ],
        rightInfo: [
            {
                label: "ORIGINAL INVOICE",
                content: (
                    <div>
                        <p>{originalInvoice}</p>
                        <p>Date: {originalSaleDate}</p>
                    </div>
                )
            },
            {
                label: "REASON",
                content: <p>{saleReturn.returnReason || "Not specified"}</p>
            }
        ],
        additionalNotes: creditablePercentage < 1
            ? `Issued against invoice ${originalInvoice}. Credit of ${(creditablePercentage * 100).toFixed(0)}% applied based on customer payment status.`
            : `Issued against invoice ${originalInvoice}.`,
        signatures: {
            left: "Customer Signature",
            right: "Authorized Signature"
        },
        totalAmount: totalAmount,
        type: "sale-return" as "sale-return", // Type assertion to match the expected literal type
        organization
    };// Generate summary table data
    const summaryData = {
        baseAmount,
        hasGst,
        gstAmount: creditableGstAmount,
        gstDisplayText,
        totalAmount,
        paymentPercentage: creditablePercentage,
        originalBaseAmount,
        originalGstAmount,
        originalTotalAmount: originalBaseAmount + originalGstAmount,
    };

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Credit Note"
                        description="View and print customer credit note"
                    />
                    <VoucherActions
                        id={saleReturn.id}
                        type="sale-return"
                    />
                </div>
                <Separator />

                {creditablePercentage < 1 && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                        <p className="text-sm">
                            <strong>Notice:</strong> This credit note is for {(creditablePercentage * 100).toFixed(0)}% of the return value ({formatPrice(totalAmount)}) 
                            because the customer has only paid {(creditablePercentage * 100).toFixed(0)}% of the original invoice.
                        </p>
                    </div>
                )}
                <VoucherLayout {...voucherData}>
                    {/* Consolidated view — never expose internal margin/commission breakdown */}
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b">
                                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                                    <th className="text-right px-3 py-2 font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="px-3 py-2">
                                        <p className="font-medium">{packageName}</p>
                                        {saleReturn.returnReason && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{saleReturn.returnReason}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium">{formatPrice(baseAmount)}</td>
                                </tr>
                                {hasGst && (
                                    <tr className="border-b text-muted-foreground">
                                        <td className="px-3 py-2 text-xs">GST @ 18%</td>
                                        <td className="px-3 py-2 text-right text-xs">{formatPrice(creditableGstAmount)}</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-muted/40 font-bold">
                                    <td className="px-3 py-2">Total Credit</td>
                                    <td className="px-3 py-2 text-right">{formatPrice(totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Only show adjustment summary when partially paid */}
                    {summaryData.paymentPercentage < 1 && (
                        <div className="flex justify-end mt-2">
                            <div className="w-56 text-xs space-y-1 bg-muted/30 rounded-md px-3 py-2">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Original return value:</span>
                                    <span>{formatPrice(summaryData.originalTotalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Payment received:</span>
                                    <span>{(summaryData.paymentPercentage * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between font-semibold border-t pt-1">
                                    <span>Credit amount:</span>
                                    <span>{formatPrice(summaryData.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </VoucherLayout>
            </div>
        </div>
    );
};

export default CreditNoteVoucherPage;
