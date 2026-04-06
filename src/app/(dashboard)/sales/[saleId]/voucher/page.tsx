import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface SaleVoucherPageProps {
  params: Promise<{ saleId: string }>;
}

const SaleVoucherPage = async (props: SaleVoucherPageProps) => {
  const params = await props.params;

  const sale = await prismadb.saleDetail.findUnique({
    where: { id: params.saleId },
    include: {
      tourPackageQuery: true,
      customer: true,
    },
  });

  if (!sale) return notFound();

  const organization = await prismadb.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const formattedDate = formatLocalDate(sale.saleDate, "MMMM d, yyyy");
  const formattedDueDate = sale.dueDate
    ? formatLocalDate(sale.dueDate, "MMMM d, yyyy")
    : null;

  const packageName =
    sale.tourPackageQuery?.tourPackageQueryName || "Tour Package";
  const hasGst = !!sale.gstAmount && sale.gstAmount > 0;
  const baseAmount = sale.salePrice;
  const totalAmount = sale.salePrice + (sale.gstAmount || 0);

  const voucherData = {
    title: "SALES INVOICE",
    subtitle: "Tax Invoice",
    voucherNo:
      sale.invoiceNumber || `SV-${sale.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    dueDate: formattedDueDate,
    leftInfo: [
      {
        label: "BILL TO",
        content: (
          <div>
            <p className="font-medium">{sale.customer?.name || "N/A"}</p>
            {sale.customer?.contact && <p>{sale.customer.contact}</p>}
            {sale.customer?.email && <p>{sale.customer.email}</p>}
          </div>
        ),
      },
    ],
    rightInfo: [
      {
        label: "INVOICE DETAILS",
        content: (
          <div>
            {sale.stateOfSupply && <p>State of Supply: {sale.stateOfSupply}</p>}
            {sale.dueDate && <p>Due Date: {formattedDueDate}</p>}
            {hasGst && <p>GST: {sale.gstPercentage}% (Exclusive)</p>}
            {sale.gstin && <p>GSTIN: {sale.gstin}</p>}
          </div>
        ),
      },
    ],
    additionalNotes: sale.description || undefined,
    signatures: { left: "Customer Signature", right: "Authorized Signature" },
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Sales Invoice"
            description="View and download sales invoice"
          />
          <VoucherActions id={params.saleId} type="sale" />
        </div>
        <Separator />

        <VoucherLayout type="sale" organization={organization} {...voucherData}>
          {/* Consolidated view — internal item breakdown (margins) never shown to customer */}
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
                      GST @ {sale.gstPercentage}%
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {formatPrice(sale.gstAmount || 0)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">
                    {formatPrice(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </VoucherLayout>
      </div>
    </div>
  );
};

export default SaleVoucherPage;
