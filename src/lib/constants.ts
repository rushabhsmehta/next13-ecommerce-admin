// Standard room types available across the application
export const ROOM_TYPES = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUPER_DELUXE: 'Super Deluxe',
  EXECUTIVE: 'Executive',
  SUITE: 'Suite'
};

// Standard occupancy types available across the application
export const OCCUPANCY_TYPES = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  QUAD: 'Quad',
  CHILD_WITH_BED: 'Child with Bed',
  CHILD_WITHOUT_BED: 'Child without Bed'
};

// Standard meal plan options available across the application
export const MEAL_PLANS = {
  EP: 'EP (No Meals)',
  CP: 'CP (Breakfast Only)',
  MAP: 'MAP (Breakfast + Dinner)',
  AP: 'AP (All Meals)'
};

// Helper function to get meal plan display name from code
export function getMealPlanName(code: string): string {
  const mealPlanKey = Object.keys(MEAL_PLANS).find(
    key => key.toLowerCase() === code.toLowerCase()
  );
  return mealPlanKey ? MEAL_PLANS[mealPlanKey as keyof typeof MEAL_PLANS] : code;
}

// Helper function to get meal plan code from display name
export function getMealPlanCode(name: string): string {
  const entry = Object.entries(MEAL_PLANS).find(
    ([_, value]) => value.toLowerCase() === name.toLowerCase()
  );
  return entry ? entry[0] : name;
}
