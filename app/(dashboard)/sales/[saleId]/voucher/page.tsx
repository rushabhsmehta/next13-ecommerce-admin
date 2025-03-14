import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface SaleVoucherPageProps {
  params: {
    saleId: string;
  };
}

const SaleVoucherPage = async ({ params }: SaleVoucherPageProps) => {
  // Get sale details with related data
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: params.saleId },
    include: {
      tourPackageQuery: true,
      customer: true,
    },
  });

  if (!sale) {
    return notFound();
  }

  // Format the sale date
  const formattedDate = format(sale.saleDate, "MMMM d, yyyy");

  // Package name and description
  const packageName = sale.tourPackageQuery?.tourPackageQueryName || "Tour Package";
  const description = sale.description || "No description provided";

  // Prepare data for voucher layout
  const voucherData = {
    title: "SALES VOUCHER",
    subtitle: "Tour Package Sale Receipt",
    voucherNo: `SV-${sale.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
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
    rightInfo: [],
    tableHeaders: ["Description", "Amount"],
    tableRows: [(
      <tr key={sale.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{packageName}</p>
            <p className="text-slate-500 text-sm">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4 text-right">{formatPrice(sale.salePrice)}</td>
      </tr>
    )],
    totalAmount: sale.salePrice,
    additionalNotes: "Thank you for your business!",
    signatures: { left: "Customer Signature", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Sales Voucher" 
            description="View and print sales voucher"
          />
          <VoucherActions id={params.saleId} type="sale" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="sale"
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default SaleVoucherPage;
