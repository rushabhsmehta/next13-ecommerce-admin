import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface PurchaseVoucherPageProps {
  params: {
    purchaseId: string;
  };
}

const PurchaseVoucherPage = async ({ params }: PurchaseVoucherPageProps) => {
  // Get purchase details with related data
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: params.purchaseId },
    include: {
      tourPackageQuery: true,
      supplier: true,
    },
  });

  if (!purchase) {
    return notFound();
  }

  // Format the purchase date
  const formattedDate = format(purchase.purchaseDate, "MMMM d, yyyy");

  // Package name and description
  const packageName = purchase.tourPackageQuery?.tourPackageQueryName || "Purchase";
  const description = purchase.description || "No description provided";

  // Prepare data for voucher layout
  const voucherData = {
    title: "PURCHASE VOUCHER",
    subtitle: "Supplier Purchase Record",
    voucherNo: `PV-${purchase.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    leftInfo: [
      { 
        label: "SUPPLIER", 
        content: (
          <div>
            <p className="font-medium">{purchase.supplier?.name || "N/A"}</p>
            <p>{purchase.supplier?.contact || "No contact information"}</p>
            <p>{purchase.supplier?.email || ""}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [],
    tableHeaders: ["Description", "Amount"],
    tableRows: [(
      <tr key={purchase.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{packageName}</p>
            <p className="text-slate-500 text-sm">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4 text-right">{formatPrice(purchase.price)}</td>
      </tr>
    )],
    totalAmount: purchase.price,
    additionalNotes: "Thank you for your service!",
    signatures: { left: "Prepared By", right: "Supplier Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Purchase Voucher" 
            description="View and print purchase voucher"
          />
          <VoucherActions id={params.purchaseId} type="purchase" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="purchase"
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default PurchaseVoucherPage;
