import prismadb from "@/lib/prismadb";
import { ExpenseCategoryForm } from "./components/expense-category-form";

const ExpenseCategoryPage = async (
  props: {
    params: Promise<{ categoryId: string }>
  }
) => {
  const params = await props.params;
  const expenseCategory = await prismadb.expenseCategory.findUnique({
    where: {
      id: params.categoryId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ExpenseCategoryForm initialData={expenseCategory} />
      </div>
    </div>
  );
}

export default ExpenseCategoryPage;
