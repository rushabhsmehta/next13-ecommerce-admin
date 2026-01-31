"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { MultiSelect } from "@/components/ui/multi-select"; // You'll need to implement this component

const formSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  email: z.string().optional().or(z.literal('')),
  locationIds: z.array(z.string()).optional(),
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface Location {
  id: string;
  label: string; // Changed from name to label to match schema
}

interface SupplierFormProps {
  initialData: { 
    id: string; 
    name: string; 
    contact?: string | null;
    gstNumber?: string | null;
    address?: string | null;
    contacts?: Array<{id: string; number: string}>;
    email?: string | null;
    locations?: Array<{location: Location}>;
  } | null;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get('/api/locations');
        console.log("Fetched locations:", response.data);
        setLocations(response.data);
        
        // Debug info for selected locations
        if (initialData?.locations) {
          console.log("Initial locations:", initialData.locations);
        }
      } catch (error) {
        toast.error('Failed to load locations');
        console.error(error);
      }
    };
    
    fetchLocations();
  }, [initialData]);

  const title = initialData ? "Edit Supplier" : "Create Supplier";
  const description = initialData ? "Edit supplier details." : "Add a new supplier";
  const toastMessage = initialData ? "Supplier updated." : "Supplier created.";
  const action = initialData ? "Save changes" : "Create";

  const defaultValues = initialData
    ? {
        name: initialData.name,
        contact: initialData.contact || "",
        gstNumber: initialData.gstNumber || "",
        address: initialData.address || "",
        contacts: initialData.contacts?.map(c => c.number) || [],
        email: initialData.email || "",
        locationIds: initialData.locations?.map(l => l.location.id) || [],
      }
    : { name: "", contact: "", gstNumber: "", address: "", contacts: [], email: "", locationIds: [] };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/suppliers/${params.supplierId}`, data);
      } else {
        await axios.post(`/api/suppliers`, data);
      }
      
      // Force router refresh before navigating
      router.refresh();
      router.push(`/suppliers`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setLoading(true);
          await axios.delete(`/api/suppliers/${params.supplierId}`);
          router.refresh();
          router.push(`/suppliers`);
          toast.success("Supplier deleted.");
          setLoading(false);
          setOpen(false);
        }}
        loading={loading}
      />
      <div className="flex flex-col md:flex-row items-center justify-between w-full">
        <Heading title={title} description={description} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <div className="max-w-3xl mx-auto w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Primary contact" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contacts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Contacts (one per line)</FormLabel>
                  <FormControl>
                    <textarea
                      disabled={loading}
                      placeholder="Enter additional contact numbers, one per line"
                      className="w-full p-2 rounded border"
                      value={(field.value || []).join('\n')}
                      onChange={(e) => field.onChange(e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="GST Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <textarea
                      disabled={loading}
                      placeholder="Supplier address"
                      className="w-full p-2 rounded border"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locations</FormLabel>
                  <FormControl>
                    <MultiSelect
                      disabled={loading}
                      placeholder="Select locations"
                      options={locations.map(location => ({
                        label: location.label, // Changed from name to label
                        value: location.id
                      }))}
                      selected={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={loading} className="ml-auto" type="submit">
              {action}
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};
