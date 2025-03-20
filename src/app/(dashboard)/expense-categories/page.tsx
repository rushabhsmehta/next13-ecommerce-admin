import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { ExpenseCategoryClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseCategory } from "@prisma/client"; // Import the Prisma type

const ExpenseCategoriesPage = async () => {
  const expenseCategories = await prismadb.expenseCategory.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedExpenseCategories = expenseCategories.map((item: ExpenseCategory) => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    isActive: item.isActive ? "Active" : "Inactive",
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading title="Expense Categories" description="Manage expense categories" />
        <Separator />
        <ExpenseCategoryClient data={formattedExpenseCategories} />
      </div>
    </div>
  );
};

export default ExpenseCategoriesPage;

