import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface PurchaseVoucherPageProps {
  params: Promise<{ purchaseId: string }>;
}

const PurchaseVoucherPage = async (props: PurchaseVoucherPageProps) => {
  const params = await props.params;

  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: params.purchaseId },
    include: {
      tourPackageQuery: true,
      supplier: true,
    },
  });

  if (!purchase) return notFound();

  const organization = await prismadb.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const formattedDate = formatLocalDate(purchase.purchaseDate, "MMMM d, yyyy");
  const formattedDueDate = purchase.dueDate
    ? formatLocalDate(purchase.dueDate, "MMMM d, yyyy")
    : null;

  const packageName =
    purchase.tourPackageQuery?.tourPackageQueryName || "Purchase";
  const hasGst = !!purchase.gstAmount && purchase.gstAmount > 0;
  const baseAmount = purchase.price;
  const totalAmount = purchase.netPayable ?? purchase.price + (purchase.gstAmount || 0);

  const voucherData = {
    title: "PURCHASE INVOICE",
    subtitle: "Supplier Bill",
    voucherNo:
      purchase.billNumber || `PV-${purchase.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    dueDate: formattedDueDate,
    leftInfo: [
      {
        label: "SUPPLIER",
        content: (
          <div>
            <p className="font-medium">{purchase.supplier?.name || "N/A"}</p>
            {purchase.supplier?.contact && <p>{purchase.supplier.contact}</p>}
            {purchase.supplier?.email && <p>{purchase.supplier.email}</p>}
          </div>
        ),
      },
    ],
    rightInfo: [
      {
        label: "BILL DETAILS",
        content: (
          <div>
            {purchase.stateOfSupply && <p>State of Supply: {purchase.stateOfSupply}</p>}
            {purchase.referenceNumber && <p>Reference: {purchase.referenceNumber}</p>}
            {purchase.dueDate && <p>Due Date: {formattedDueDate}</p>}
            {hasGst && <p>GST: {purchase.gstPercentage}% (Exclusive)</p>}
          </div>
        ),
      },
    ],
    additionalNotes: purchase.description || undefined,
    signatures: { left: "Prepared By", right: "Supplier Signature" },
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Purchase Invoice"
            description="View and download purchase invoice"
          />
          <VoucherActions id={params.purchaseId} type="purchase" />
        </div>
        <Separator />

        <VoucherLayout
          type="purchase"
          organization={organization}
          {...voucherData}
        >
          {/* Consolidated view — no internal cost breakdown shown */}
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
                  <td className="px-3 py-2 font-medium">{packageName}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatPrice(baseAmount)}
                  </td>
                </tr>
                {hasGst && (
                  <tr className="border-b text-muted-foreground">
                    <td className="px-3 py-2 text-xs">
                      GST @ {purchase.gstPercentage}%
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {formatPrice(purchase.gstAmount || 0)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{formatPrice(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </VoucherLayout>
      </div>
    </div>
  );
};

export default PurchaseVoucherPage;
