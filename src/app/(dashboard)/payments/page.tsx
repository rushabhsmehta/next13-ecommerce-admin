import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PaymentsListTable } from "./components/payments-list-table";

export default async function PaymentsPage() {
/*   const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  
  const payments = await prismadb.paymentDetail.findMany({
    orderBy: { paymentDate: "desc" },
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
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <Link href="/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <PaymentsListTable data={payments} />
      </div>
    </div>
  );
}

