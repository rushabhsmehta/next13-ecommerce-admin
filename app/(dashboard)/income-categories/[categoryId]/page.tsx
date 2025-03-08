import prismadb from "@/lib/prismadb";
import { IncomeCategoryForm } from "./components/income-category-form";

const IncomeCategoryPage = async ({
  params
}: {
  params: { categoryId: string }
}) => {
  const incomeCategory = await prismadb.incomeCategory.findUnique({
    where: {
      id: params.categoryId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <IncomeCategoryForm initialData={incomeCategory} />
      </div>
    </div>
  );
}

export default IncomeCategoryPage;
