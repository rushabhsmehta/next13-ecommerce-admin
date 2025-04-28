import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SupplierIndividualLedgerClient } from "./components/client";
import { notFound } from "next/navigation";
import { PurchaseDetail, PaymentDetail, PurchaseItem, TourPackageQuery } from "@prisma/client";

interface SupplierLedgerPageProps {
  params: {
    supplierId: string;
  };
}

const SupplierLedgerPage = async ({ params }: SupplierLedgerPageProps) => {
  // Get supplier details
  const supplier = await prismadb.supplier.findUnique({
    where: {
      id: params.supplierId,
    },
  });

  if (!supplier) {
    return notFound();
  }
  // Get all purchases for this supplier
  const purchases = await prismadb.purchaseDetail.findMany({
    where: {
      supplierId: params.supplierId,
    },
    include: {
      tourPackageQuery: true,
      items: true, // Include purchase items
    },
    orderBy: {
      purchaseDate: 'asc',
    },
  });

  // Get all payments for this supplier
  const payments = await prismadb.paymentDetail.findMany({
    where: {
      supplierId: params.supplierId,
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
    },
    orderBy: {
      paymentDate: 'asc',
    },
  });    // Format transactions for display
  const formattedPurchases = purchases.map((purchase) => {
    // Calculate total including GST for each purchase
    const gstAmount = purchase.gstAmount || 0;
    const totalAmount = purchase.price + gstAmount;
      // Format items for display if they exist
    let formattedItems: Array<{
      productName: string;
      quantity: number;
      pricePerUnit: number;
      totalAmount: number;
    }> = [];
    let itemsSummary = "";
    
    if (purchase.items && purchase.items.length > 0) {
      formattedItems = purchase.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalAmount: item.totalAmount
      }));
      
      itemsSummary = purchase.items.map(item => 
        `${item.productName} (${item.quantity})`
      ).join(", ");
    }
    
    return {
      id: purchase.id,
      date: purchase.purchaseDate,
      type: "Purchase",
      description: purchase.description || purchase.tourPackageQuery?.tourPackageQueryName || "Purchase",
      amount: totalAmount, // Include GST in the amount
      baseAmount: purchase.price,
      gstAmount: gstAmount,
      isInflow: true, // Purchases are inflows from supplier perspective (we owe them)
      reference: purchase.id,
      packageId: purchase.tourPackageQueryId,
      packageName: purchase.tourPackageQuery?.tourPackageQueryName || "-",
      items: formattedItems,
      itemsSummary: itemsSummary
    };
  });

  const formattedPayments = payments.map(payment => ({
    id: payment.id,
    date: payment.paymentDate,
    type: "Payment",
    description: payment.note || "Payment",
    amount: payment.amount,
    isInflow: false, // Payments are outflows from supplier perspective (we pay them)
    reference: payment.transactionId || payment.id,
    paymentMode: payment.method || (payment.bankAccount ? "Bank" : payment.cashAccount ? "Cash" : "Unknown"),
    accountName: payment.bankAccount?.accountName || payment.cashAccount?.accountName || "-",
  }));

  // Combine transactions and sort by date
  const allTransactions = [...formattedPurchases, ...formattedPayments].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate opening balance and running balance
  let runningBalance = 0;
  const transactions = allTransactions.map(transaction => {
    if (transaction.isInflow) {
      runningBalance += transaction.amount; // Purchases increase supplier balance
    } else {
      runningBalance -= transaction.amount; // Payments decrease supplier balance
    }
    
    return {
      ...transaction,
      balance: runningBalance,
    };
  });

  // Calculate totals (now including GST)
  const totalPurchases = formattedPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const totalPayments = formattedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentBalance = totalPurchases - totalPayments;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${supplier.name} - Ledger`}
          description={`View transactions and balance for ${supplier.name}`}
        />
        <Separator />
        
        <SupplierIndividualLedgerClient 
          supplier={supplier}
          transactions={transactions}
          totalPurchases={totalPurchases}
          totalPayments={totalPayments}
          currentBalance={currentBalance}
        />
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
