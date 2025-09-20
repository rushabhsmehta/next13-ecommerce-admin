"use client"

import * as z from "zod"
import axios from "axios"
import React, { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Location, Hotel, TourDestination } from "@prisma/client"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CheckIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import Navbar from "@/components/navbar"

const formSchema = z.object({
  name: z.string().min(2),
  images: z.object({ url: z.string() }).array(),
  locationId: z.string().min(1),
  destinationId: z.string().optional(),
  link: z.string().url().optional(), // Added link field
});

type HotelFormValues = z.infer<typeof formSchema>

interface HotelFormProps {
  initialData: (Hotel & { images: Images[] }) | null;
  // images: Images[];
  locations: Location[];
};

export const HotelForm: React.FC<HotelFormProps> = ({
  initialData,
  locations
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<TourDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  const title = initialData ? 'Edit hotel' : 'Create hotel';
  const description = initialData ? 'Edit a hotel.' : 'Add a new hotel';
  const toastMessage = initialData ? 'Hotel updated.' : 'Hotel created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<HotelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      images: initialData?.images || [],
      locationId: initialData?.locationId || '',
      destinationId: initialData?.destinationId || '',
      link: initialData?.link || ''
    }
  });

  // Fetch destinations when location changes
  const fetchDestinations = async (locationId: string) => {
    if (!locationId) {
      setDestinations([]);
      return;
    }
    
    try {
      setLoadingDestinations(true);
      const response = await axios.get(`/api/destinations?locationId=${locationId}`);
      setDestinations(response.data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
    } finally {
      setLoadingDestinations(false);
    }
  };

  // Watch for location changes
  const watchedLocationId = form.watch('locationId');

  React.useEffect(() => {
    if (watchedLocationId) {
      fetchDestinations(watchedLocationId);
    } else {
      setDestinations([]);
      form.setValue('destinationId', '');
    }
  }, [watchedLocationId, form]);

  // Load initial destinations if editing
  React.useEffect(() => {
    if (initialData?.locationId) {
      fetchDestinations(initialData.locationId);
    }
  }, [initialData?.locationId]);

  const onSubmit = async (data: HotelFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/hotels/${params.hotelId}`, data);
      } else {
        await axios.post(`/api/hotels`, data);
      }
      router.refresh();
      router.push(`/hotels`);
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
      await axios.delete(`/api/hotels/${params.hotelId}`);
      router.refresh();
      router.push(`/hotels`);
      toast.success('Hotel deleted.');
    } catch (error: any) {
      toast.error('Make sure you removed all products using this Hotel first.');
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
                    <Input disabled={loading} placeholder="Hotel name" {...field} />
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
                                form.setValue("destinationId", ""); // Reset destination when location changes
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
              name="destinationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={!watchedLocationId || loadingDestinations}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? destinations.find((destination) => destination.id === field.value)?.name
                            : loadingDestinations
                            ? "Loading destinations..."
                            : !watchedLocationId
                            ? "Select location first..."
                            : "Select a destination..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search destination..." />
                        <CommandEmpty>No destination found.</CommandEmpty>
                        <CommandGroup>
                          {destinations.map((destination) => (
                            <CommandItem
                              value={destination.name}
                              key={destination.id}
                              onSelect={() => {
                                form.setValue("destinationId", destination.id);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  destination.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {destination.name}
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
          </div>
          <div className="md:grid md:grid-cols-1 gap-8">
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Hotel link" {...field} />
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




