import prismadb from "@/lib/prismadb";
import { IncomeCategoryForm } from "./components/income-category-form";

const IncomeCategoryPage = async (
  props: {
    params: Promise<{ categoryId: string }>
  }
) => {
  const params = await props.params;
  const incomeCategory = await prismadb.incomeCategory.findUnique({
    where: {
      id: params.categoryId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <IncomeCategoryForm initialData={incomeCategory} />
      </div>
    </div>
  );
}

export default IncomeCategoryPage;
