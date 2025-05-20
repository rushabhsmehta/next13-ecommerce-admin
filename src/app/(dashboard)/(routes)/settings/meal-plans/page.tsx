import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { MealPlansClient } from "./components/client";

const MealPlansPage = async () => {
  const mealPlans = await prismadb.mealPlan.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedMealPlans = mealPlans.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    description: item.description,
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <MealPlansClient data={formattedMealPlans} />
      </div>
    </div>
  );
};

export default MealPlansPage;
