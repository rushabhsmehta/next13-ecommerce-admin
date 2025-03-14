"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Location, Hotel, ItineraryMaster, Activity, ActivityMaster } from "@prisma/client"
import { Images } from "@prisma/client"
import { CheckIcon, ChevronDown, ChevronUp, Trash } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Value } from "@radix-ui/react-select"

const activitySchema = z.object({
  activityTitle: z.string().min(2),
  activityDescription: z.string().min(2),
  activityImages: z.array(z.object({ url: z.string() })),
  locationId: z.string().optional(),
  itineraryMasterId: z.string().optional(),
});

const formSchema = z.object({
  itineraryMasterTitle: z.string().optional(),
  itineraryMasterDescription: z.string().optional(),
  itineraryMasterImages: z.array(z.object({ url: z.string() })),
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

type ItineraryMasterFormValues = z.infer<typeof formSchema>

interface ItineraryMasterFormProps {
  initialData: ItineraryMaster
  & {
    itineraryMasterImages: Images[],
    activities: Activity[],
  }
  | null;
  // images: Images[];
  locations: Location[];
  hotels: Hotel[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
};

export const ItineraryMasterForm: React.FC<ItineraryMasterFormProps> = ({
  initialData,
  locations,
  activitiesMaster,
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
      dayNumber: data.dayNumber ? 0 : 0,
      mealsIncluded: data.mealsIncluded ? data.mealsIncluded.split(',') : [],
      activities: data.activities.map((activity: any) => ({
        ...activity,
        activityImages: activity.activityImages.map((image: any) => ({
          url: image.url,
        })),
        itineraryMasterId: data.itineraryMasterId || '', // Convert null to undefined
      }))


      // locationId: data.locationId ?? '',
      // tourPackageId: data.tourPackageId ?? '',
      // tourPackageQueryId: data.tourPackageQueryId ?? '',
      // itineraryTitle: data.itineraryTitle ?? '',
      // itineraryDescription: data.itineraryDescription ?? '',
      // itineraryImages: data.itineraryImages ?? [],
      // days: data.days ?? '',
      // hotelId: data.hotelId ?? '',
      // mealsIncluded: data.mealsIncluded ?? '',
      // activities: data.activities.map((activity : any) => ({
      //   ...activity,
      //   activityImages: activity.activityImages ?? [], // Default to an empty array if not present
      //   activityTitle: activity.activityTitle ?? '',
      //   activityDescription: activity.activityDescription ?? '',
      //   locationId: activity.locationId ?? '',
      //   itineraryId: activity.itineraryId ?? '',
      //})),
    };
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {

    locationId: '',
    tourPackageId: '',
    tourPackageQueryId: '',
    itineraryMasterTitle: '',
    itineraryMasterDescription: '',
    itineraryMasterImages: [],
    dayNumber: 0,
    days: '',
    hotelId: '',
    numberofRooms: '',
    roomCategory: '',
    mealsIncluded: '',
    activities: [],
  }


  const form = useForm<ItineraryMasterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: ItineraryMasterFormValues) => {
    // Transform data for submission
    const submitData = {
      ...data,
      dayNumber: data.dayNumber ? 0 : 0,
      mealsIncluded: data.mealsIncluded?.join(','), // Convert array to comma-separated string
      activities: data.activities?.map((activity) => ({
        ...activity,

        locationId: data.locationId,
        //      activityImages: activity.activityImages.map(img => img.url) // Extract URLs from activityImages

      }))
    };
    console.log("Data being Submitted is : ", submitData);
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/itinerariesMaster/${params.itineraryMasterId}`, submitData);
      } else {
        await axios.post(`/api/itinerariesMaster`, submitData);
      }
      router.refresh();
      router.push(`/itinerariesMaster`);
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
      await axios.delete(`/api/itinerariesMaster/${params.itineraryMasterId}`);
      router.refresh();
      router.push(`/itinerariesMaster`);
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
            name="itineraryMasterImages"
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
                          aria-expanded={locationOpen}
                          className="justify-between"
                        >
                          {field.value
                            ? locations.find((location) => location.id === field.value)?.label
                            : "Select location..."}
                          <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search location..." />
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
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === location.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {location.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itineraryMasterTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Textarea rows={3} disabled={loading} placeholder="Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itineraryMasterDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Description" {...field} />
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
                          <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search hotel..." />
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
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === hotel.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {hotel.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
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
                    <Input
                      placeholder="Number of Rooms"
                      disabled={loading}
                      {...field}
                    />
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
                    <Input
                      placeholder="Room Category"
                      disabled={loading}
                      {...field}
                    />
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
                <FormLabel>Create Activities </FormLabel>
                {value.map((activity, index) => (
                  <><div key={index} className="flex items-center gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-[200px] justify-between",
                              !activity.activityTitle && "text-muted-foreground"
                            )}
                            disabled={loading}
                          >
                            {activity.activityTitle || "Select an Activity"}
                            <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0 max-h-[10rem] overflow-auto">
                        <Command>
                          <CommandInput
                            placeholder="Search activity..."
                            className="h-9" />
                          <CommandEmpty>No activity found.</CommandEmpty>
                          <CommandGroup>
                            {activitiesMaster?.map((activityMaster) => (
                              <CommandItem 
                              value={activityMaster.activityMasterTitle ?? ''}
                              key={activityMaster.id}
                                onSelect={() => {
                                    
                                  const updatedActivities = [...value]
                                  updatedActivities[index].activityTitle = activityMaster.activityMasterTitle ?? ''
                                  updatedActivities[index].activityDescription = activityMaster.activityMasterDescription ?? ''
                                  updatedActivities[index].activityImages = activityMaster.activityMasterImages.map((image) => ({ url: image.url }))
                                  onChange(updatedActivities)
                                }
                                }
                                >
                                {activityMaster.activityMasterTitle}
                                <CheckIcon
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    activityMaster.locationId === activity.locationId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </div>

                    <FormItem>
                      <Input
                        placeholder="Activity Title"
                        value={activity.activityTitle}
                        onChange={(e) => {
                          const updatedActivities = [...value]
                          updatedActivities[index].activityTitle = e.target.value
                          onChange(updatedActivities)
                        }} />
                      <Textarea
                        rows={3}
                        placeholder="Activity Description"
                        value={activity.activityDescription}
                        onChange={(e) => {
                          const updatedActivities = [...value]
                          updatedActivities[index].activityDescription = e.target.value
                          onChange(updatedActivities)
                        }} />
                      <ImageUpload
                        value={activity.activityImages.map((image) => image.url)}
                        onChange={(url) => {
                          const updatedActivities = [...value]
                          updatedActivities[index].activityImages.push({ url })
                          onChange(updatedActivities)
                        }}
                        onRemove={(url) => {
                          const updatedActivities = [...value]
                          updatedActivities[index].activityImages = updatedActivities[index].activityImages.filter((current) => current.url !== url)
                          onChange(updatedActivities)
                        }} />
                      <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                          const updatedActivities = [...value];
                          updatedActivities.splice(index, 1);
                          onChange(updatedActivities);
                        }}
                      >
                          Remove Activity
                      </Button>

                    </FormItem>
                  </>)
                )}
                <Button
                  variant="outline"
                  onClick={() => onChange([...value, { activityTitle: '', activityDescription: '', activityImages: [] }])}
                >
                  Add Activity
                </Button>
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
}

