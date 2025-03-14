import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { VoucherActions } from "@/components/voucher-actions";
import { VoucherLayout } from "@/components/voucher-layout";

interface PaymentVoucherPageProps {
  params: {
    paymentId: string;
  };
}

const PaymentVoucherPage = async ({ params }: PaymentVoucherPageProps) => {
  // Get payment details with related data
  const payment = await prismadb.paymentDetail.findUnique({
    where: { id: params.paymentId },
    include: {
      tourPackageQuery: true,
      supplier: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!payment) {
    return notFound();
  }

  // Format the payment date
  const formattedDate = format(payment.paymentDate, "MMMM d, yyyy");
  
  // Determine payment method and account details
  const paymentMethod = payment.method || (payment.bankAccount 
    ? `Bank - ${payment.bankAccount.accountName}`
    : payment.cashAccount
    ? `Cash - ${payment.cashAccount.accountName}`
    : "Unknown");

  // Description text for table
  const description = payment.tourPackageQuery?.tourPackageQueryName 
    ? `Payment for ${payment.tourPackageQuery.tourPackageQueryName}` 
    : payment.note || "Supplier Payment";

  // Prepare data for voucher layout
  const voucherData = {
    title: "PAYMENT VOUCHER",
    subtitle: "Payment to Supplier",
    voucherNo: `PY-${payment.id.substring(0, 8).toUpperCase()}`,
    date: formattedDate,
    leftInfo: [
      { 
        label: "PAID TO", 
        content: (
          <div>
            <p className="font-medium">{payment.supplier?.name || "N/A"}</p>
            <p>{payment.supplier?.contact || "No contact information"}</p>
            <p>{payment.supplier?.email || ""}</p>
          </div>
        ) 
      }
    ],
    rightInfo: [
      { label: "Reference", content: payment.transactionId || "-" }
    ],
    tableHeaders: ["Description", "Payment Method", "Amount"],
    tableRows: [(
      <tr key={payment.id}>
        <td className="py-4 px-4">
          <div>
            <p className="font-medium">{description}</p>
          </div>
        </td>
        <td className="py-4 px-4">{paymentMethod}</td>
        <td className="py-4 px-4 text-right">{formatPrice(payment.amount)}</td>
      </tr>
    )],
    totalAmount: payment.amount,
    additionalNotes: "This serves as official proof of payment.",
    signatures: { left: "Received By", right: "Authorized Signature" }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Payment Voucher" 
            description="View and print payment voucher"
          />
          <VoucherActions id={params.paymentId} type="payment" />
        </div>
        <Separator />
        
        <VoucherLayout 
          type="payment"
          {...voucherData}
        />
      </div>
    </div>
  );
};

export default PaymentVoucherPage;
