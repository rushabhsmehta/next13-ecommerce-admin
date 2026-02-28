import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SupplierIndividualLedgerClient } from "./components/client";
import { notFound } from "next/navigation";
import { PurchaseDetail, PaymentDetail, PurchaseItem, TourPackageQuery, PurchaseReturn, PurchaseReturnItem } from "@prisma/client";

interface SupplierLedgerPageProps {
  params: Promise<{
    supplierId: string;
  }>;
}

const SupplierLedgerPage = async (props: SupplierLedgerPageProps) => {
  const params = await props.params;
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
      purchaseReturns: {  // Include purchase returns
        include: {
          items: true
        }
      }
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
  });

  // Format transactions for display
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
      debit: totalAmount,
      credit: 0,
      balance: 0, // Will be calculated later
      status: purchase.status || "completed",
      isInflow: true, // Purchases are inflows from supplier perspective (we owe them)
      amount: totalAmount, // Include GST in the amount
      baseAmount: purchase.price,
      gstAmount: gstAmount,
      reference: purchase.id,
      packageId: purchase.tourPackageQueryId,
      packageName: purchase.tourPackageQuery?.tourPackageQueryName || undefined, // Use undefined instead of null or "-"
      items: formattedItems,
      itemsSummary: itemsSummary
    };
  });

  // Format purchase returns as transactions
  const formattedPurchaseReturns = purchases.flatMap((purchase) => {
    if (!purchase.purchaseReturns || purchase.purchaseReturns.length === 0) return [];
    
    return purchase.purchaseReturns.map((purchaseReturn) => {
      const returnGstAmount = purchaseReturn.gstAmount || 0;
      const totalReturnAmount = purchaseReturn.amount + returnGstAmount;
      
      // Format return items for display if they exist
      let itemsSummary = "";
      if (purchaseReturn.items && purchaseReturn.items.length > 0) {
        itemsSummary = purchaseReturn.items.map(item => 
          `${item.productName} (${item.quantity})`
        ).join(", ");
      }
      
      return {
        id: purchaseReturn.id,
        date: purchaseReturn.returnDate,
        type: "Purchase Return",
        description: `Return ${purchaseReturn.reference || '#' + purchaseReturn.id.substring(0, 8)} for Purchase ${purchase.id.substring(0, 8)}`,
        debit: 0,
        credit: totalReturnAmount, // Return reduces the supplier balance
        balance: 0, // Will be calculated later
        status: purchaseReturn.status,
        isInflow: false, // Returns decrease supplier balance (like payments)
        amount: totalReturnAmount,
        baseAmount: purchaseReturn.amount,
        gstAmount: returnGstAmount,
        reference: purchaseReturn.reference || '', 
        packageId: purchase.tourPackageQueryId,
        packageName: purchase.tourPackageQuery?.tourPackageQueryName || undefined,
        itemsSummary: itemsSummary
      };
    });
  });
  const formattedPayments = payments.map(payment => ({
    id: payment.id,
    date: payment.paymentDate,
    type: "Payment",
    description: payment.note || (payment.tourPackageQuery?.tourPackageQueryName ? `Payment for ${payment.tourPackageQuery.tourPackageQueryName}` : "Payment"),
    debit: 0,
    credit: payment.amount,
    balance: 0, // Will be calculated later
    status: "completed",
    isInflow: false, // Payments are outflows from supplier perspective (we pay them)
    amount: payment.amount,
    reference: payment.transactionId || payment.id,
    paymentMode: payment.method || (payment.bankAccount ? "Bank" : payment.cashAccount ? "Cash" : "Unknown"),
    accountName: payment.bankAccount?.accountName || payment.cashAccount?.accountName || undefined,
    packageId: payment.tourPackageQueryId,
    packageName: payment.tourPackageQuery?.tourPackageQueryName || undefined,
  }));

  // Combine transactions and sort by date
  const allTransactions = [...formattedPurchases, ...formattedPurchaseReturns, ...formattedPayments].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate opening balance and running balance
  let runningBalance = 0;
  const transactions = allTransactions.map(transaction => {
    if (transaction.isInflow) {
      runningBalance += transaction.amount; // Purchases increase supplier balance
    } else {
      runningBalance -= transaction.amount; // Payments and returns decrease supplier balance
    }
    
    return {
      ...transaction,
      balance: runningBalance,
    };
  });

  // Calculate totals (now including GST)
  const totalPurchases = formattedPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const totalPurchaseReturns = formattedPurchaseReturns.reduce((sum, purchaseReturn) => sum + purchaseReturn.amount, 0);
  const totalPayments = formattedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentBalance = totalPurchases - totalPurchaseReturns - totalPayments;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title={`${supplier.name} - Ledger`}
          description={`View transactions and balance for ${supplier.name}`}
        />
        <Separator />
        
        <SupplierIndividualLedgerClient 
          supplier={supplier}
          transactions={transactions}
          totalPurchases={totalPurchases}
          totalReturns={totalPurchaseReturns}
          totalPayments={totalPayments}
          currentBalance={currentBalance}
        />
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
