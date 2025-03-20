import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PurchasesListTable } from "./components/purchases-list-table";

export default async function PurchasesPage() {
  /* const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  
  const purchases = await prismadb.purchaseDetail.findMany({
    orderBy: { purchaseDate: "desc" },
    include: {
      supplier: {
        select: {
          name: true
        }
      }
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Purchases</h2>
          <Link href="/purchases/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <PurchasesListTable data={purchases} />
      </div>
    </div>
  );
}

