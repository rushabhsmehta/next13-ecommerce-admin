import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface ReceiptVoucherPageProps {
  params: {
    receiptId: string;
  };
}

const ReceiptVoucherPage = async ({ params }: ReceiptVoucherPageProps) => {
  // Get receipt details with related data
  const receipt = await prismadb.receiptDetail.findUnique({
    where: { id: params.receiptId },
    include: {
      tourPackageQuery: true,
      customer: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!receipt) {
    return notFound();
  }

  // Format the receipt date
  const formattedDate = format(receipt.receiptDate, "MMMM d, yyyy");
  
  // Determine payment method and account details
  const paymentMethod = receipt.bankAccount 
    ? `Bank - ${receipt.bankAccount.accountName}`
    : receipt.cashAccount
    ? `Cash - ${receipt.cashAccount.accountName}`
    : "Unknown";

  // Description text for table
  const description = receipt.tourPackageQuery?.tourPackageQueryName 
    ? `Payment for ${receipt.tourPackageQuery.tourPackageQueryName}` 
    : receipt.note || "Customer Payment";

  // Prepare data for voucher layout
  const voucherData = {
    title: "RECEIPT VOUCHER",
    subtitle: "Payment Receipt",
    voucherNo: `RV-${receipt.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    leftInfo: [
      { 
        label: "RECEIVED FROM", 
        content: (
          <div>
            <p className="font-medium">{receipt.customer?.name || "N/A"}</p>
            <p>{receipt.customer?.contact || "No contact information"}</p>
            <p>{receipt.customer?.email || ""}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      { label: "Reference", content: receipt.reference || "-" }
    ],
    tableHeaders: ["Description", "Payment Method", "Amount"],
    tableRows: [(
      <tr key={receipt.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4">{paymentMethod}</td>
        <td className="py-4 px-4 text-right">{formatPrice(receipt.amount)}</td>
      </tr>
    )],
    totalAmount: receipt.amount,
    additionalNotes: "Thank you for your payment!",
    signatures: { left: "Received By", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Receipt Voucher" 
            description="View and print receipt voucher"
          />
          <VoucherActions id={params.receiptId} type="receipt" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="receipt"
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default ReceiptVoucherPage;
