import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { SupplierCreditsClient } from "./components/client";

export const metadata = {
  title: "Supplier Credits",
  description: "Manage supplier rebooking credits",
};

export default async function SupplierCreditsPage() {
  const credits = await prismadb.purchaseReturn.findMany({
    where: { supplierCreditType: 'rebooking_credit' },
    include: {
      purchaseDetail: {
        include: {
          tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
          supplier: { select: { name: true } }
        }
      },
      supplier: true,
      creditPayments: {
        where: { paymentType: 'supplier_credit_redemption' },
        select: { amount: true }
      }
    },
    orderBy: { returnDate: 'desc' }
  });

  const formatted = credits.map(sc => {
    const usedAmount = sc.creditPayments.reduce((sum, p) => sum + p.amount, 0);
    const availableCredit = sc.amount - usedAmount;
    const isExpired = sc.supplierCreditExpiry ? sc.supplierCreditExpiry < new Date() : false;
    const daysUntilExpiry = sc.supplierCreditExpiry
      ? Math.ceil((sc.supplierCreditExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const supplier = sc.supplier || sc.purchaseDetail?.supplier;

    return {
      id: sc.id,
      supplierName: supplier?.name || 'Unknown',
      originalTour: sc.purchaseDetail?.tourPackageQuery?.tourPackageQueryNumber || '-',
      returnDate: sc.returnDate,
      supplierCreditExpiry: sc.supplierCreditExpiry,
      amount: sc.amount,
      usedAmount,
      availableCredit,
      status: sc.status,
      isExpired,
      daysUntilExpiry,
      returnReason: sc.returnReason || '-',
      purchaseReturnId: sc.id,
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Supplier Credits"
          description="Track rebooking credits received from suppliers"
        />
        <SupplierCreditsClient data={formatted} />
      </div>
    </div>
  );
}
