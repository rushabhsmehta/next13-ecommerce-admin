"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown, Trash } from "lucide-react"
import { Location, ActivityMaster, Itinerary } from "@prisma/client"
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  activityMasterTitle: z.string().optional(),
  activityMasterDescription: z.string().optional(),
  activityMasterImages: z.array(z.object({ url: z.string() })),
  locationId: z.string().min(1),
  itineraryId: z.string().optional(), // Optional if itinerary is not mandatory
});

type ActivityMasterFormValues = z.infer<typeof formSchema>

interface ActivityMasterFormProps {
  initialData: ActivityMaster & {
    activityMasterImages: Images[]
  } | null;
  // images: Images[];
  locations: Location[];
  itineraries: Itinerary[];
};



export const ActivityMasterForm: React.FC<ActivityMasterFormProps> = ({
  initialData,
  locations
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Activity ' : 'Create Activity';
  const description = initialData ? 'Edit a Activity ' : 'Add a new Activity';
  const toastMessage = initialData ? 'Activity updated.' : 'Activity created.';
  const action = initialData ? 'Save changes' : 'Create';

  const transformInitialData = (data: any) => {
    return {
      ...data,
      itineraryId: data.itineraryId || '', // Convert null to undefined
    };
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {
    activityMasterTitle: '',
    activityMasterDescription: '',
    activityMasterImages: [],
    locationId: '',
    itineraryId: '',
  }

  const form = useForm<ActivityMasterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: ActivityMasterFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/activitiesMaster/${params?.activityMasterId}`, data);
      } else {
        await axios.post(`/api/activitiesMaster`, data);
      }
      router.refresh();
      router.push(`/activitiesMaster`);
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
      await axios.delete(`/api/activitiesMaster/${params?.activityMasterId}`);
      router.refresh();
      router.push(`/activitiesMaster`);
      toast.success('Activity deleted.');
    } catch (error: any) {
      toast.error('Make sure you removed all products using this Activity first.');
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
            name="activityMasterImages"
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
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? locations.find((location) => location.id === field.value)?.label
                            : "Select a location..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search location..." />
                        <CommandEmpty>No location found.</CommandEmpty>
                        <CommandGroup>
                          {locations.map((location) => (
                            <CommandItem
                              value={location.label}
                              key={location.id}
                              onSelect={() => {
                                form.setValue("locationId", location.id);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  location.id === field.value ? "opacity-100" : "opacity-0"
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
              name="activityMasterTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Title</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Activity Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityMasterDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Description</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
