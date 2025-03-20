import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { IncomeCategoryClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

const IncomeCategoriesPage = async () => {
  const incomeCategories = await prismadb.incomeCategory.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  
  const formattedIncomeCategories = incomeCategories.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    isActive: item.isActive ? "Active" : "Inactive",
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading title="Income Categories" description="Manage income categories" />
        <Separator />
        <IncomeCategoryClient data={formattedIncomeCategories} />
      </div>
    </div>
  );
};

export default IncomeCategoriesPage;

