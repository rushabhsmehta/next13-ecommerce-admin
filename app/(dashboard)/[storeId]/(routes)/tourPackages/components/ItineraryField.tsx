import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';


const ItineraryField = () => {  const { control, register, setValue } = useFormContext(); // useFormContext hook to access form methods
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itineraries'
  });

  const handleMealChange = (mealType: string, isChecked: any, index: number) => {
    let updatedMeals = fields[index].mealsIncluded || [];
    if (isChecked) {
      updatedMeals = [...updatedMeals, mealType];
    } else {
      updatedMeals = updatedMeals.filter((meal: any) => meal !== mealType);
    }
    setValue(`itineraries.${index}.mealsIncluded`, updatedMeals);
  };

  return (
    <div>
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-4">
          <Input
            placeholder="Day"
            {...register(`itineraries.${index}.days`)}
          />
          <Input
            placeholder="Activities"
            {...register(`itineraries.${index}.activities`)}
          />
          <Input
            placeholder="Places"
            {...register(`itineraries.${index}.places`)}
          />
          <div className="flex flex-col">
            {/* Loop through meals options */}
            {['breakfast', 'lunch', 'dinner'].map(meal => (
              <label key={meal}>
                <Checkbox
                  checked={field.mealsIncluded?.includes(meal)}
                  onChange={e => handleMealChange(meal, e.target.checked, index)}
                />
                {meal}
              </label>
            ))}
          </div>
          <Button variant="destructive" size="sm" onClick={() => remove(index)}>
            Remove Itinerary
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" onClick={() => append({ days: '', activities: '', places: '', mealsIncluded: [] })}>
        Add Itinerary
      </Button>
    </div>
  );
};

export default ItineraryField;
