"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Location, Image, Hotel, TourPackage, Itinerary } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Decimal } from "@prisma/client/runtime/library"


const itinerarySchema = z.object({
  days: z.string(),
  activities: z.string(),
  places: z.string(),
  mealsIncluded: z.array(z.string()).optional(),
});

const formSchema = z.object({
  name: z.string().min(1),
  images: z.object({ url: z.string() }).array(),
  price: z.coerce.number().min(1),
  locationId: z.string().min(1),
  hotelId: z.string().min(1),
  itineraries: itinerarySchema.array(),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional()
});



type TourPackageFormValues = z.infer<typeof formSchema>

interface TourPackageFormProps {
  initialData: TourPackage & {
    images: Image[];
    itineraries: Itinerary[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  //  itineraries: Itinerary[];
};

export const TourPackageForm: React.FC<TourPackageFormProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const params = useParams();
  const router = useRouter();
  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  //console.log(initialData);
  const title = initialData ? 'Edit Tour Package' : 'Create Tour Package';
  const description = initialData ? 'Edit a Tour Package.' : 'Add a new Tour Package';
  const toastMessage = initialData ? 'Tour Package updated.' : 'Tour Package created.';
  const action = initialData ? 'Save changes' : 'Create';
  console.log("Initial Data : ", initialData?.itineraries)
  const transformInitialData = (data: { id: string; storeId: string; locationId: string; hotelId: string; name: string; price: Decimal; isFeatured: boolean; isArchived: boolean; createdAt: Date; updatedAt: Date } & { images: { id: string; productId: string | null; tourPackageId: string | null; url: string; createdAt: Date; updatedAt: Date }[]; itineraries: { id: string; tourPackageId: string; days: string | null; activities: string | null; places: string | null; mealsIncluded: string | null; createdAt: Date; updatedAt: Date }[] }) => {
    return {
      ...data,
      price: parseFloat(data.price.toString()), // Convert Decimal to number
      itineraries: data.itineraries.map(({ days, activities, places, mealsIncluded }) => ({
        days: days ?? '', // Convert null to empty string or undefined
        activities: activities ?? '',
        places: places ?? '',
        mealsIncluded: mealsIncluded ? mealsIncluded.split(',') : [] // Assuming mealsIncluded is a comma-separated string
      }))
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {
    name: '',
    images: [],
    itineraries: [],
    price: 0,
    locationId: '',
    hotelId: '',
    isFeatured: false,
    isArchived: false,
  };
  const form = useForm<TourPackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const handleMealChange = (mealType: string, isChecked: boolean, itineraryIndex: number) => {

    // console.log("Current meal change:", mealType, isChecked, itineraryIndex);

    const updatedItineraries = [...form.getValues('itineraries')];
    let currentMeals = updatedItineraries[itineraryIndex].mealsIncluded || [];

    if (isChecked) {
      // Add the meal type if checked and not already present
      if (!currentMeals.includes(mealType)) {
        currentMeals.push(mealType);
      }
    } else {
      // Remove the meal type if unchecked
      currentMeals = currentMeals.filter((meal) => meal !== mealType);
    }

    updatedItineraries[itineraryIndex].mealsIncluded = currentMeals;
    form.setValue('itineraries', updatedItineraries);
  };

  const onSubmit = async (data: TourPackageFormValues) => {
    console.log("Itineraries before submission:", data.itineraries);

    const formattedData = {
      ...data,
      itineraries: data.itineraries.map(itinerary => ({
        ...itinerary,
        mealsIncluded: itinerary.mealsIncluded && itinerary.mealsIncluded.length > 0 ? itinerary.mealsIncluded.join(',') : 'none'
      }))
    };


    try {
      setLoading(true);
      if (initialData) {
        // console.log({ formattedData })
        await axios.patch(`/api/${params.storeId}/tourPackages/${params.tourPackageId}`, formattedData);
      } else {
        await axios.post(`/api/${params.storeId}/tourPackages`, formattedData);
      }
      router.refresh();
      router.push(`/${params.storeId}/tourPackages`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);  // Updated line
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/tourPackages/${params.tourPackageId}`);
      router.refresh();
      router.push(`/${params.storeId}/tourPackages`);
      toast.success('Tour Package deleted.');
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }



  // Function to handle meal checkbox changes



  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Images</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value.map((image) => image.url)}
                    disabled={loading}
                    onChange={(url) => field.onChange([...field.value, { url }])}
                    onRemove={(url) => field.onChange([...field.value.filter((current) => current.url !== url)])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Tour Package name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={loading} placeholder="9.99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>{location.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hotelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hotels.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      // @ts-ignore
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Featured
                    </FormLabel>
                    <FormDescription>
                      This Tour Package will appear on the home page
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isArchived"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      // @ts-ignore
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Archived
                    </FormLabel>
                    <FormDescription>
                      This Tour Package will not appear anywhere in the store.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="itineraries"
              render={({ field: { value = [], onChange } }) => (
                <FormItem>
                  <FormLabel>Create Itineraries</FormLabel>
                  {

                    value.map((itinerary, index) => (
                      <div key={index} className="space-y-4">
                        <FormControl>
                          <Input
                            placeholder="Day"
                            value={itinerary.days}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index] = { ...itinerary, days: e.target.value };
                              onChange(newItineraries);
                            }}
                          />

                        </FormControl>

                        <FormControl>
                          <Input
                            placeholder="Activities"
                            value={itinerary.activities}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index] = { ...itinerary, activities: e.target.value };
                              onChange(newItineraries);
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <Input
                            placeholder="Places"
                            value={itinerary.places}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index] = { ...itinerary, places: e.target.value };
                              onChange(newItineraries);
                            }}
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



                        {/* Other inputs or elements related to each itinerary can go here */}

                        <FormControl>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newItineraries = value.filter((_, i) => i !== index);
                              onChange(newItineraries);
                            }}
                          >
                            Remove Itinerary
                          </Button>
                        </FormControl>
                      </div>
                    ))}
                  <FormControl>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onChange([...value, { days: '', activities: '', places: '', mealsIncluded: [] }])}
                    >
                      Add Itinerary
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form>
      </Form >
    </>
  )
} 
