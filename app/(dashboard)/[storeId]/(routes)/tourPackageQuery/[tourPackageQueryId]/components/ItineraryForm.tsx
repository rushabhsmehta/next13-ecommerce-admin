import React from 'react';

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

import { Button } from "@/components/ui/button"
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // Replace with your actual UI library imports

interface Itinerary {
    days: string | null;
    activities: string | null;
    places: string | null; 
    mealsIncluded: string[];
}

interface Props {
    itineraries: Itinerary[];
    updateItinerary: (index: number, field: keyof Itinerary, value: string) => void;
    handleMealChange: (mealType: string, isChecked: boolean, index: number) => void;
    addItinerary: () => void;
    removeItinerary: (index: number) => void;
}

const ItineraryForm: React.FC<Props> = ({ itineraries, updateItinerary, handleMealChange, addItinerary, removeItinerary }) => {
    
    
    return (
        <>
            {itineraries.map((itinerary, index) => (
                <div key={index} className="space-y-4">
                    <FormControl>
                        <Input
                            placeholder="Day"
                            value={itinerary.days?? ''}
                            onChange={(e) => updateItinerary(index, 'days', e.target.value)}
                        />
                    </FormControl>

                    <FormControl>
                        <Input
                            placeholder="Activities"
                            value={itinerary.activities?? ''}
                            onChange={(e) => updateItinerary(index, 'activities', e.target.value)}
                        />
                    </FormControl>

                    <FormControl>
                        <Input
                            placeholder="Places"
                            value={itinerary.places?? ''}
                            onChange={(e) => updateItinerary(index, 'places', e.target.value)}
                        />
                    </FormControl>

                    <FormControl>
                        <div className="flex flex-col">
                            <label>
                                <Checkbox
                                    checked={itinerary.mealsIncluded?.includes('breakfast')}
                                    onCheckedChange={(isChecked) =>
                                        handleMealChange('breakfast', !!isChecked, index)
                                    }
                                />
                                Breakfast
                            </label>
                            <label>
                                <Checkbox
                                    checked={itinerary.mealsIncluded?.includes('lunch')}
                                    onCheckedChange={(isChecked) =>
                                        handleMealChange('lunch', !!isChecked, index)
                                    }
                                />
                                Lunch
                            </label>
                            <label>
                                <Checkbox
                                    checked={itinerary.mealsIncluded?.includes('dinner')}
                                    onCheckedChange={(isChecked) =>
                                        handleMealChange('dinner', !!isChecked, index)
                                    }
                                />
                                Dinner
                            </label>
                        </div>
                    </FormControl>



                    <Button type = "button"  onClick={() => removeItinerary(index)} variant="destructive">Remove Itinerary</Button>
                </div>
            ))}

            <Button type = "button" onClick={addItinerary}>Add Itinerary</Button>
        </>
    );
};

export default ItineraryForm;
