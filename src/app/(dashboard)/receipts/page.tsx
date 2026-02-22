import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ReceiptsListTable } from "./components/receipts-list-table";

export default async function ReceiptsPage() {
 /*  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  } */
  

  const receipts = await prismadb.receiptDetail.findMany({
    orderBy: { receiptDate: "desc" },
    include: {
      customer: {
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
          <h2 className="text-3xl font-bold tracking-tight">Receipts</h2>
          <Link href="/receipts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <ReceiptsListTable data={receipts} />
      </div>
    </div>
  );
}

