import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { SupplierLedgerClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

interface SupplierLedgerPageProps {
  params: {
    supplierId: string;
  }
}

const SupplierLedgerPage = async ({ params }: SupplierLedgerPageProps) => {
  const supplier = await prismadb.supplier.findUnique({
    where: {
      id: params.supplierId
    }
  });

  if (!supplier) {
    return <div>Supplier not found</div>;
  }

  // Get purchases transactions
  const purchases = await prismadb.purchaseDetail.findMany({
    where: {
      supplierId: params.supplierId
    },
    include: {
      tourPackageQuery: true
    },
    orderBy: {
      purchaseDate: 'desc'
    }
  });

  // Get payment transactions
  const payments = await prismadb.paymentDetail.findMany({
    where: {
      supplierId: params.supplierId
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true
    },
    orderBy: {
      paymentDate: 'desc'
    }
  });

  // Format purchases data
  const formattedPurchases = purchases.map(purchase => ({
    id: purchase.id,
    date: format(purchase.purchaseDate, 'MMMM d, yyyy'),
    amount: purchase.price, // Updated to match schema field name
    description: purchase.description || "Purchase",
    packageName: purchase.tourPackageQuery?.tourPackageQueryName || "-",
    type: "PURCHASE" as const
  }));

  // Format payments data
  const formattedPayments = payments.map(payment => ({
    id: payment.id,
    date: format(payment.paymentDate, 'MMMM d, yyyy'),
    amount: payment.amount,
    description: payment.note || "Payment",
    packageName: payment.tourPackageQuery?.tourPackageQueryName || "-",
    reference: payment.transactionId || payment.method || "-", // Updated to use proper schema fields
    paymentMode: payment.method || (payment.bankAccount ? "Bank" : payment.cashAccount ? "Cash" : "Unknown"),
    account: payment.bankAccount?.accountName || payment.cashAccount?.accountName || "-",
    type: "PAYMENT" as const
  }));

  // Calculate totals and balance
  const totalPurchases = formattedPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const totalPayments = formattedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = totalPurchases - totalPayments;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`Ledger for ${supplier.name}`} 
          description="View all financial transactions for this supplier"
        />
        <Separator />
        
        <SupplierLedgerClient 
          supplier={supplier} 
          purchases={formattedPurchases}
          payments={formattedPayments}
          totalPurchases={totalPurchases}
          totalPayments={totalPayments}
          balance={balance}
        />
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
