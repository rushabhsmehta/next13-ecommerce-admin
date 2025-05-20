import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";
import { ItemTransactionTable } from "@/components/item-transaction-table";
import { Card, CardContent } from "@/components/ui/card";
import { calculateSalePaymentStatus } from "@/lib/payment-utils";

interface CreditNoteVoucherPageProps {
    params: {
        saleReturnId: string;
    };
}

const CreditNoteVoucherPage = async ({ params }: CreditNoteVoucherPageProps) => {
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
        }
    });    // Format the sale return date
    const formattedDate = format(saleReturn.returnDate, "MMMM d, yyyy");
    const originalSaleDate = format(saleReturn.saleDetail.saleDate, "MMMM d, yyyy");

    // Check if this is a multi-item return
    const isMultiItem = saleReturn.items && saleReturn.items.length > 0;

    // Original invoice info
    const originalInvoice = saleReturn.saleDetail.invoiceNumber || `SV-${saleReturn.saleDetail.id.substring(0, 8).toUpperCase()}`;
    const packageName = saleReturn.saleDetail.tourPackageQuery?.tourPackageQueryName || "Sale Return";

    // Get payment status to determine how much of the return should be credited
    const paymentStatus = await calculateSalePaymentStatus(saleReturn.saleDetail.id);
    
    // Calculate the proportion of the return amount that should be credited based on payment status
    const creditablePercentage = paymentStatus.paymentPercentage;
    
    // Convert the original amounts to creditable amounts based on payment percentage
    const originalBaseAmount = saleReturn.amount;
    const originalGstAmount = saleReturn.gstAmount || 0;
    
    // Apply payment percentage to get the actual amount to be credited
    const creditableBaseAmount = parseFloat((originalBaseAmount * creditablePercentage).toFixed(2));
    const creditableGstAmount = parseFloat((originalGstAmount * creditablePercentage).toFixed(2));

    // Calculate tax details
    const hasGst = !!creditableGstAmount && creditableGstAmount > 0;

    // Define GST type (always exclusive for consistency with sales)
    const isGstInclusive = false;

    // Calculate base and total amounts based on GST type
    let baseAmount = creditableBaseAmount;
    let totalAmount = creditableBaseAmount;
    let gstDisplayText = "";    if (hasGst) {
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
        additionalNotes: `This credit note is issued against invoice ${originalInvoice} for ${(creditablePercentage * 100).toFixed(0)}% of the return value, based on customer's payment status. ${saleReturn.returnReason ? `Reason for return: ${saleReturn.returnReason}` : ''}`,
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
            <div className="flex-1 space-y-4 p-8 pt-6">
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
                    {isMultiItem ? (
                        <div className="space-y-4">
                            <ItemTransactionTable
                                items={saleReturn.items.map(item => ({
                                    id: item.id,
                                    productName: item.productName,
                                    description: item.description || "",
                                    quantity: item.quantity,
                                    unitOfMeasure: item.unitOfMeasure,
                                    pricePerUnit: item.pricePerUnit || 0,
                                    totalAmount: item.totalAmount || 0,
                                    taxAmount: item.taxAmount || 0,
                                    taxSlab: item.taxSlab
                                }))}
                            />
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="space-y-4 p-6">
                                <div className="flex justify-between">
                                    <div>
                                        <h3 className="font-medium text-lg">{packageName}</h3>
                                        <p className="text-sm text-muted-foreground">{saleReturn.returnReason}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatPrice(baseAmount)}</div>                                        {hasGst && (
                                            <div className="text-sm text-muted-foreground">
                                                + GST: {formatPrice(creditableGstAmount)} {gstDisplayText}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="mt-6 space-y-4">
                        <div className="flex justify-end">
                            <div className="w-60 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>{formatPrice(summaryData.baseAmount)}</span>
                                </div>

                                {summaryData.hasGst && (
                                    <div className="flex justify-between text-sm">
                                        <span>GST {summaryData.gstDisplayText}:</span>
                                        <span>{formatPrice(summaryData.gstAmount)}</span>
                                    </div>
                                )}                                <div className="flex justify-between text-sm">
                                    <span>Payment status:</span>
                                    <span>{(summaryData.paymentPercentage * 100).toFixed(0)}% paid</span>
                                </div>
                                
                                {summaryData.paymentPercentage < 1 && (
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Original return value:</span>
                                        <span>{formatPrice(summaryData.originalTotalAmount)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between font-medium pt-2 border-t">
                                    <span>Total credit:</span>
                                    <span>{formatPrice(summaryData.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </VoucherLayout>
            </div>
        </div>
    );
};

export default CreditNoteVoucherPage;
