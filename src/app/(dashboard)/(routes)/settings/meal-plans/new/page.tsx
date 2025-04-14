import { MealPlanForm } from "../components/meal-plan-form";

const NewMealPlanPage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MealPlanForm initialData={null} />
      </div>
    </div>
  );
};

export default NewMealPlanPage;
