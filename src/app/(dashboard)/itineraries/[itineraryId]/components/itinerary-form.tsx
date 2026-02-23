"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Location, Hotel, Itinerary, Activity } from "@prisma/client"
import { Images } from "@prisma/client"

import { useParams, useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
import { Command, CommandInput, CommandItem } from "@/components/ui/command" // new import
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

const activitySchema = z.object({
  activityTitle: z.string().min(2),
  activityDescription: z.string().min(2),
  activityImages: z.array(z.object({ url: z.string() })),
  locationId: z.string().optional(),
  itineraryId: z.string().optional(),
});

const formSchema = z.object({
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().optional(),
  itineraryImages: z.array(z.object({ url: z.string() })),
  locationId: z.string().min(1),
  hotelId: z.string().optional(),
  numberofRooms: z.string().optional(),
  roomCategory: z.string().optional(),
  tourPackageId: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
  dayNumber: z.number().optional(),
  days: z.string().optional(),
  mealsIncluded: z.array(z.string()).optional(),
  activities: z.array(activitySchema),
});

type ItineraryFormValues = z.infer<typeof formSchema>

interface ItineraryFormProps {
  initialData: Itinerary
  & {
    itineraryImages: Images[],
    activities: Activity[],
  }
  | null;
  // images: Images[];
  locations: Location[];
  hotels: Hotel[];
};

export const ItineraryForm: React.FC<ItineraryFormProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);

  const title = initialData ? 'Edit Itinerary' : 'Create Itinerary';
  const description = initialData ? 'Edit a Itinerary.' : 'Add a new Itinerary';
  const toastMessage = initialData ? 'Itinerary updated.' : 'Itinerary created.';
  const action = initialData ? 'Save changes' : 'Create';

  const transformInitialData = (data: any) => {
    return {
      ...data,
      mealsIncluded: data.mealsIncluded ? data.mealsIncluded.split(',') : [],
      activities: data.activities.map((activity: any) => ({
        ...activity,
        activityImages: activity.activityImages.map((image: any) => ({
          url: image.url,
        })),
        itineraryId: data.itineraryId || '', // Convert null to undefined
      }))
    };
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {
    locationId: '',
    tourPackageId: '',
    tourPackageQueryId: '',
    itineraryTitle: '',
    itineraryDescription: '',
    itineraryImages: [],
    dayNumber: 0,
    days: '',
    hotelId: '',
    numberofRooms: '',
    roomCategory: '',
    mealsIncluded: '',
    activities: [],
  }


  const form = useForm<ItineraryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: ItineraryFormValues) => {
    // Transform data for submission
    const submitData = {
      ...data,
      mealsIncluded: data.mealsIncluded?.join(','), // Convert array to comma-separated string
      activities: data.activities?.map((activity) => ({
        ...activity,
        locationId: data.locationId,
      }))
    };
    console.log("Data being Submitted is : ", submitData);
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/itineraries/${params?.itineraryId}`, submitData);
      } else {
        await axios.post(`/api/itineraries`, submitData);
      }
      router.refresh();
      router.push(`/itineraries`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/itineraries/${params?.itineraryId}`);
      router.refresh();
      router.push(`/itineraries`);
      toast.success('Itinerary deleted.');
    } catch (error: any) {
      toast.error('Make sure you removed all products using this Itinerary first.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

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
            name="itineraryImages"
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
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Location</FormLabel>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="justify-between"
                        >
                          {field.value
                            ? locations.find((location) => location.id === field.value)?.label
                            : "Select location..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search location..." />
                        <CommandList>
                        <CommandEmpty>No location found.</CommandEmpty>
                        <CommandGroup>
                          {locations.map((location) => (
                            <CommandItem
                              key={location.id}
                              value={location.label}
                              onSelect={() => {
                                field.onChange(location.id)
                                setLocationOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === location.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {location.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itineraryTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itineraryDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hotelId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Hotel</FormLabel>
                  <Popover open={hotelOpen} onOpenChange={setHotelOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={hotelOpen}
                          className="justify-between"
                        >
                          {field.value
                            ? hotels.find((hotel) => hotel.id === field.value)?.name
                            : "Select hotel..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search hotel..." />
                        <CommandList>
                        <CommandEmpty>No hotel found.</CommandEmpty>
                        <CommandGroup>
                          {hotels.map((hotel) => (
                            <CommandItem
                              key={hotel.id}
                              value={hotel.name}
                              onSelect={() => {
                                field.onChange(hotel.id)
                                setHotelOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === hotel.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {hotel.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numberofRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Rooms</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Number of Rooms" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Category</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Room Category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mealsIncluded"
              render={({ field }) => (
                <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                  <FormLabel>Meal Plan</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                        <label key={mealType} className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes(mealType)}
                            onCheckedChange={(checked) => {
                              const updatedMeals = checked
                                ? [...(field.value || []), mealType]
                                : (field.value || []).filter((value) => value !== mealType);
                              field.onChange(updatedMeals);
                            }}
                          />
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

          </div>

          <FormField
            control={form.control}
            name="activities"
            render={({ field: { value = [], onChange } }) => (
              <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                <FormLabel> Activities </FormLabel>
                {value.map((activity, index) => (
                  <div key={index} className="md:grid md:grid-cols-3 gap-8">
                    <FormItem>
                      <FormLabel>Activity {index + 1}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Title"
                          disabled={loading}
                          value={activity.activityTitle}
                          onChange={(e) => {
                            const newActivities = [...value];
                            newActivities[index] = {
                              ...newActivities[index],
                              activityTitle: e.target.value
                            };
                            onChange(newActivities);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Description"
                          disabled={loading}
                          value={activity.activityDescription}
                          onChange={(e) => {
                            const newActivities = [...value];
                            newActivities[index] = {
                              ...newActivities[index],
                              activityDescription: e.target.value
                            };
                            onChange(newActivities);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <ImageUpload
                        value={activity.activityImages?.map((image) => image.url) || []}
                        disabled={loading}
                        onChange={(newActivityUrl) => {
                          const updatedImages = [...activity.activityImages, { url: newActivityUrl }];
                          // Update the itinerary with the new images array
                          const updatedActivities = [...value];
                          updatedActivities[index] = { ...activity, activityImages: updatedImages };
                          onChange(updatedActivities);
                        }}
                        onRemove={(activityURLToRemove) => {
                          // Filter out the image to remove
                          const updatedImages = activity.activityImages.filter((image) => image.url !== activityURLToRemove);
                          // Update the itinerary with the new images array
                          const updatedActivities = [...value];
                          updatedActivities[index] = { ...activity, activityImages: updatedImages };
                          onChange(updatedActivities);
                        }}
                      />
                    </FormItem>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newActivities = value.filter((_, i) => i !== index);
                        onChange(newActivities);
                      }}
                    >
                      Remove Activity
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onChange([...value, { activityTitle: '', activityDescription: '', itineraryId: '', activityImages: [] }])}
                >
                  Add Activity
                </Button>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form>
      </Form>
    </>
  );
};
