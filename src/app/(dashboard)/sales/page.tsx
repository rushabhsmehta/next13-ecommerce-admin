import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { SalesPageClient } from "./components/sales-page-client";

export default async function SalesPage() {
  const [sales, customers] = await Promise.all([
    prismadb.saleDetail.findMany({
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { id: true } },
        receiptAllocations: { select: { allocatedAmount: true } },
      },
    }),
    prismadb.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <Link href="/sales/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <SalesPageClient sales={sales} customers={customers} />
      </div>
    </div>
  );
}
