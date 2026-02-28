import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { IncomesClient } from "./components/incomes-client";

export default async function IncomesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const incomes = await prismadb.incomeDetail.findMany({
    orderBy: { incomeDate: "desc" },
    include: {
      incomeCategory: {
        select: {
          name: true,
          id: true
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

  // Get all income categories for filtering
  const categories = await prismadb.incomeCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <IncomesClient 
          incomes={incomes}
          categories={categories}
        />
      </div>
    </div>
  );
}

