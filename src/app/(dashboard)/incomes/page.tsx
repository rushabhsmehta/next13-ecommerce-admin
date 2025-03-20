import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { IncomesListTable } from "./components/incomes-list-table";

export default async function IncomesPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const incomes = await prismadb.incomeDetail.findMany({
    orderBy: { incomeDate: "desc" },
    include: {
      incomeCategory: {
        select: {
          name: true
        }
      },
      bankAccount: {
        select: {
          accountName: true
        }
      },
      cashAccount: {
        select: {
          accountName: true
        }
      }
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Incomes</h2>
          <Link href="/incomes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <IncomesListTable data={incomes} />
      </div>
    </div>
  );
}

