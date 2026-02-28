import prismadb from "@/lib/prismadb";
import { MealPlanForm } from "../components/meal-plan-form";

const MealPlanPage = async (
  props: {
    params: Promise<{ mealPlanId: string }>
  }
) => {
  const params = await props.params;
  const mealPlan = await prismadb.mealPlan.findUnique({
    where: {
      id: params.mealPlanId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <MealPlanForm initialData={mealPlan} />
      </div>
    </div>
  );
}

export default MealPlanPage;
