import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { CreditNotesClient } from "./components/client";

export const metadata = {
  title: "Credit Notes",
  description: "Manage issued credit notes",
};

export default async function CreditNotesPage() {
  const creditNotes = await prismadb.saleReturn.findMany({
    where: { creditType: 'credit_note' },
    include: {
      saleDetail: {
        include: {
          tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
          customer: { select: { name: true } }
        }
      },
      customer: true,
      creditReceipts: {
        where: { receiptType: 'credit_note_redemption' },
        select: { amount: true }
      }
    },
    orderBy: { returnDate: 'desc' }
  });

  const formatted = creditNotes.map(cn => {
    const usedAmount = cn.creditReceipts.reduce((sum, r) => sum + r.amount, 0);
    const cnAmount = cn.creditNoteAmount ?? cn.amount;
    const availableCredit = cnAmount - usedAmount;
    const isExpired = cn.expiryDate ? cn.expiryDate < new Date() : false;
    const daysUntilExpiry = cn.expiryDate
      ? Math.ceil((cn.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber || '-',
      customerName: cn.customer?.name || cn.saleDetail?.customer?.name || 'Unknown',
      originalTour: cn.saleDetail?.tourPackageQuery?.tourPackageQueryNumber || '-',
      returnDate: cn.returnDate,
      expiryDate: cn.expiryDate,
      amount: cnAmount,
      usedAmount,
      availableCredit,
      status: cn.status,
      isExpired,
      daysUntilExpiry,
      returnReason: cn.returnReason || '-',
      saleReturnId: cn.id,
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Credit Notes"
          description="Track issued credit notes and their redemption status"
        />
        <CreditNotesClient data={formatted} />
      </div>
    </div>
  );
}
