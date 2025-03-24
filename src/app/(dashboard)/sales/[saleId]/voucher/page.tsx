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

interface SaleVoucherPageProps {
  params: {
    saleId: string;
  };
}

const SaleVoucherPage = async ({ params }: SaleVoucherPageProps) => {
  // Get sale details with related data including items
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: params.saleId },
    include: {
      tourPackageQuery: true,
      customer: true,
      items: {
        include: {
          unitOfMeasure: true,
          taxSlab: true
        }
      }
    },
  });

  if (!sale) {
    return notFound();
  }

  // Format the sale date
  const formattedDate = format(sale.saleDate, "MMMM d, yyyy");
  const formattedDueDate = sale.dueDate ? format(sale.dueDate, "MMMM d, yyyy") : null;

  // Check if this is a multi-item sale
  const isMultiItem = sale.items && sale.items.length > 0;

  // Package name and description
  const packageName = sale.tourPackageQuery?.tourPackageQueryName || "Tour Package";
  const description = sale.description || "No description provided";

  // Calculate tax details with better handling for inclusive/exclusive scenarios
  const hasGst = !!sale.gstAmount && sale.gstAmount > 0;
  
  // Define GST type (inclusive or exclusive)
  const isGstInclusive = false; // You may want to store this in your database
  
  // Calculate base and total amounts based on GST type
  let baseAmount = sale.salePrice;
  let totalAmount = sale.salePrice;
  let gstDisplayText = "";
  
  if (hasGst) {
    if (isGstInclusive) {
      // If GST is inclusive, the base amount is the sale price minus GST
      baseAmount = sale.salePrice - (sale.gstAmount || 0);
      totalAmount = sale.salePrice;
      gstDisplayText = "(Inclusive)";
    } else {
      // If GST is exclusive, the base amount is the sale price and total includes GST
      baseAmount = sale.salePrice;
      totalAmount = sale.salePrice + (sale.gstAmount || 0);
      gstDisplayText = "(Exclusive)";
    }
  }

  // Prepare data for voucher layout with GST info
  const voucherData = {
    title: "SALES INVOICE",
    subtitle: isMultiItem ? "Invoice" : "Tour Package Sale Receipt",
    voucherNo: sale.invoiceNumber || `SV-${sale.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    dueDate: formattedDueDate,
    leftInfo: [
      { 
        label: "CUSTOMER", 
        content: (
          <div>
            <p className="font-medium">{sale.customer?.name || "N/A"}</p>
            <p>{sale.customer?.contact || "No contact information"}</p>
            <p>{sale.customer?.email || ""}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      {
        label: "INVOICE DETAILS",
        content: (
          <div>
            {sale.stateOfSupply && <p>State of Supply: {sale.stateOfSupply}</p>}
            {sale.dueDate && <p>Due Date: {formattedDueDate}</p>}
            {hasGst && (
              <p>GST Info: {sale.gstPercentage}% {gstDisplayText}</p>
            )}
          </div>
        )
      }
    ],
    additionalNotes: description,
    signatures: { left: "Customer Signature", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Sales Inovice" 
            description="View and print Sales Inovice"
          />
          <VoucherActions id={params.saleId} type="sale" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="sale"
          {...voucherData}
        >
          {isMultiItem ? (
            <ItemTransactionTable items={sale.items} />
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-lg">{packageName}</h3>
                    <span>{formatPrice(baseAmount)}</span>
                  </div>
                  <p className="text-muted-foreground">{description}</p>
                  
                  {hasGst && (
                    <div className="flex justify-between border-t pt-4">
                      <div>
                        <span>GST ({sale.gstPercentage}%) {gstDisplayText}</span>
                      </div>
                      <span>{formatPrice(sale.gstAmount || 0)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between border-t pt-4 font-bold">
                    <span>Total</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </VoucherLayout>
      </div>
    </div>
  );
};

export default SaleVoucherPage;
