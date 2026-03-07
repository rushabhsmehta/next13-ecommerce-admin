import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PurchasesPageClient } from "./components/purchases-page-client";

export default async function PurchasesPage() {
  const [purchases, suppliers] = await Promise.all([
    prismadb.purchaseDetail.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        paymentAllocations: { select: { allocatedAmount: true } },
      },
    }),
    prismadb.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <Link href="/purchases/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <PurchasesPageClient purchases={purchases} suppliers={suppliers} />
      </div>
    </div>
  );
}
