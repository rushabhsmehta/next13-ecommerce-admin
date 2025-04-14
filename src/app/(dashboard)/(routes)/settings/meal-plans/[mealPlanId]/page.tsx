import prismadb from "@/lib/prismadb";
import { MealPlanForm } from "../components/meal-plan-form";

const MealPlanPage = async ({
  params
}: {
  params: { mealPlanId: string }
}) => {
  const mealPlan = await prismadb.mealPlan.findUnique({
    where: {
      id: params.mealPlanId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MealPlanForm initialData={mealPlan} />
      </div>
    </div>
  );
}

export default MealPlanPage;
