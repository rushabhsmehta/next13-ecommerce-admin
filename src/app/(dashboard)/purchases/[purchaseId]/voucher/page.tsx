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

interface PurchaseVoucherPageProps {
  params: Promise<{
    purchaseId: string;
  }>;
}

const PurchaseVoucherPage = async (props: PurchaseVoucherPageProps) => {
  const params = await props.params;
  // Get purchase details with related data including items
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: params.purchaseId },
    include: {
      tourPackageQuery: true,
      supplier: true,
      items: {
        include: {
          unitOfMeasure: true,
          taxSlab: true
        },
        orderBy: {
          orderIndex: 'asc'
        }
      }
    },
  });

  if (!purchase) {
    return notFound();
  }

  // Get organization data for displaying in the voucher
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Format the purchase date
  const formattedDate = format(purchase.purchaseDate, "MMMM d, yyyy");
  const formattedDueDate = purchase.dueDate ? format(purchase.dueDate, "MMMM d, yyyy") : null;

  // Check if this is a multi-item purchase
  const isMultiItem = purchase.items && purchase.items.length > 0;

  // Package name and description
  const packageName = purchase.tourPackageQuery?.tourPackageQueryName || "Purchase";
  const description = purchase.description || "No description provided";

  // Calculate tax details
  const hasGst = !!purchase.gstAmount && purchase.gstAmount > 0;
  const baseAmount = hasGst  
    ? purchase.price - (purchase.gstAmount || 0)
    : purchase.price;
  const totalAmount = hasGst 
    ? purchase.price + (purchase.gstAmount || 0)
    : purchase.price;

  // Prepare data for voucher layout with GST info
  const voucherData = {
    title: "PURCHASE INVOICE",
    subtitle: isMultiItem ? "Purchase Bill" : "Supplier Purchase Record",
    voucherNo: purchase.billNumber || `PV-${purchase.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    dueDate: formattedDueDate,
    leftInfo: [
      { 
        label: "Particulars", 
        content: (
          <div>
            <p className="font-medium">{purchase.supplier?.name || "N/A"}</p>
            <p>{purchase.supplier?.contact || "No contact information"}</p>
            <p>{purchase.supplier?.email || ""}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      {
        label: "BILL DETAILS",
        content: (
          <div>
            {purchase.stateOfSupply && <p>State of Supply: {purchase.stateOfSupply}</p>}
            {purchase.referenceNumber && <p>Reference: {purchase.referenceNumber}</p>}
            {purchase.dueDate && <p>Due Date: {formattedDueDate}</p>}
            {hasGst && (
              <p>GST Info: {purchase.gstPercentage}% { '(Inclusive)' }</p>
            )}
          </div>
        )
      }
    ],
    additionalNotes: description,
    signatures: { left: "Prepared By", right: "Supplier Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Purchase Invoice" 
            description="View and print Purchase Invoice"
          />
          <VoucherActions id={params.purchaseId} type="purchase" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="purchase"
          organization={organization}
          {...voucherData}
        >
          {/* Use ItemTransactionTable for multi-item purchases */}
          {isMultiItem ? (
            <ItemTransactionTable items={purchase.items} />
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
                        <span>GST ({purchase.gstPercentage}%) </span>                      
                      </div>
                      <span>{formatPrice(purchase.gstAmount || 0)}</span>
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

export default PurchaseVoucherPage;
