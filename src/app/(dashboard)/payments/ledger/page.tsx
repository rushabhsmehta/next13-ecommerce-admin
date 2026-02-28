import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PaymentLedgerClient } from "./components/client";

const PaymentLedgerPage = async () => {
  // Get all suppliers
  const suppliers = await prismadb.supplier.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  // Get all payment transactions with supplier and tour package details
  const payments = await prismadb.paymentDetail.findMany({
    include: {
      tourPackageQuery: true,
      supplier: true,
      bankAccount: true,
      cashAccount: true
    },
    orderBy: {
      paymentDate: 'desc'
    }
  });

    // Format payments data
  const formattedPayments = payments.map(payment => ({
    id: payment.id,
    date: format(payment.paymentDate, 'MMMM d, yyyy'),
    amount: payment.amount,
    description: payment.note || (payment.tourPackageQuery?.tourPackageQueryName ? `Payment for ${payment.tourPackageQuery.tourPackageQueryName}` : "Payment"),
    packageName: payment.tourPackageQuery?.tourPackageQueryName || "-",
    supplierName: payment.supplier?.name || "Unknown Supplier",
    supplierContact: payment.supplier?.contact || "-",
    reference: payment.transactionId || payment.method || "-",
    paymentMode: payment.method || (payment.bankAccount ? "Bank" : payment.cashAccount ? "Cash" : "Unknown"),
    account: payment.bankAccount?.accountName || payment.cashAccount?.accountName || "-",
  }));

  // Calculate total payments
  const totalPayments = formattedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Format suppliers for dropdown
  const formattedSuppliers = suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.name
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Payment Ledger" 
          description="View all payment transactions"
        />
        <Separator />
        
        <PaymentLedgerClient 
          payments={formattedPayments}
          suppliers={formattedSuppliers}
          totalPayments={totalPayments}
        />
      </div>
    </div>
  );
};

export default PaymentLedgerPage;

