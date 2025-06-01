"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, CalendarIcon, CheckIcon } from "lucide-react";
import { Inquiry, Location, TourPackage, Images, FlightDetails, Itinerary, Activity } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  tourPackageId: z.string().min(1, "Tour Package selection is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerNumber: z.string().min(1, "Customer number is required"),
  numAdults: z.string().min(1, "Number of adults is required"),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  totalPrice: z.string().optional(),
  remarks: z.string().optional(),
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>;

interface TourPackageQueryFromInquiryAssociateFormProps {
  inquiry: Inquiry & {
    associatePartner: any;
  } | null;
  locations: Location[];
  tourPackages: (TourPackage & {
    images: Images[];
    flightDetails: FlightDetails[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
  })[] | null;
}

export const TourPackageQueryFromInquiryAssociateForm: React.FC<TourPackageQueryFromInquiryAssociateFormProps> = ({
  inquiry,
  locations,
  tourPackages
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTourPackage, setSelectedTourPackage] = useState<any>(null);

  const title = "Create Tour Package Query";
  const description = "Create a tour package query from inquiry (Associate Partner)";
  const toastMessage = "Tour Package Query created successfully.";
  const action = "Create Query";
  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourPackageId: "",
      customerName: inquiry?.customerName || "",
      customerNumber: inquiry?.customerMobileNumber || "",
      numAdults: inquiry?.numAdults?.toString() || "",
      numChild5to12: inquiry?.numChildren5to11?.toString() || "",
      numChild0to5: inquiry?.numChildrenBelow5?.toString() || "",
      totalPrice: "",
      remarks: "",
    }
  });

  // Watch for tour package selection changes
  const watchTourPackageId = form.watch("tourPackageId");

  useEffect(() => {
    if (watchTourPackageId && tourPackages) {
      const selectedPackage = tourPackages.find(pkg => pkg.id === watchTourPackageId);
      setSelectedTourPackage(selectedPackage);
        // Auto-calculate pricing based on selected tour package
      if (selectedPackage) {
        const numAdults = parseInt(form.getValues("numAdults") || "0") || 0;
        const numChild5to12 = parseInt(form.getValues("numChild5to12") || "0") || 0;
        const numChild0to5 = parseInt(form.getValues("numChild0to5") || "0") || 0;
        
        // Calculate basic pricing (this can be enhanced with more complex logic)
        const basePrice = parseFloat(selectedPackage.price?.replace(/[^\d.-]/g, '') || "0") || 0;
        const adultPrice = basePrice * numAdults;
        const childPrice = basePrice * 0.7 * numChild5to12; // 70% for children 5-12
        const infantPrice = basePrice * 0.3 * numChild0to5; // 30% for children 0-5
        
        const totalCalculatedPrice = adultPrice + childPrice + infantPrice;
        
        form.setValue("totalPrice", totalCalculatedPrice.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }));
      }
    }
  }, [watchTourPackageId, form, tourPackages]);
  // Recalculate pricing when passenger numbers change
  useEffect(() => {
    if (selectedTourPackage) {
      const numAdults = parseInt(form.getValues("numAdults") || "0") || 0;
      const numChild5to12 = parseInt(form.getValues("numChild5to12") || "0") || 0;
      const numChild0to5 = parseInt(form.getValues("numChild0to5") || "0") || 0;
      
      const basePrice = parseFloat(selectedTourPackage.price?.replace(/[^\d.-]/g, '') || "0") || 0;
      const adultPrice = basePrice * numAdults;
      const childPrice = basePrice * 0.7 * numChild5to12;
      const infantPrice = basePrice * 0.3 * numChild0to5;
      
      const totalCalculatedPrice = adultPrice + childPrice + infantPrice;
      
      form.setValue("totalPrice", totalCalculatedPrice.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }));
    }
  }, [form.watch("numAdults"), form.watch("numChild5to12"), form.watch("numChild0to5"), selectedTourPackage, form]);

  const onSubmit = async (data: TourPackageQueryFormValues) => {
    try {
      setLoading(true);

      if (!selectedTourPackage) {
        toast.error("Please select a tour package");
        return;
      }

      // Prepare data based on selected tour package
      const formattedData = {
        inquiryId: params.inquiryId,
        tourPackageQueryNumber: `TPQ-${Date.now()}`,
        tourPackageQueryName: selectedTourPackage.tourPackageName,
        tourPackageQueryType: "Associate Partner Query",
        customerName: data.customerName,
        customerNumber: data.customerNumber,
        numDaysNight: selectedTourPackage.numDaysNight,
        locationId: selectedTourPackage.locationId,
        period: selectedTourPackage.period || "",
        tour_highlights: selectedTourPackage.tour_highlights || "",
        tourStartsFrom: selectedTourPackage.tourStartsFrom || "",
        tourEndsOn: selectedTourPackage.tourEndsOn || "",
        transport: selectedTourPackage.transport || "",
        pickup_location: selectedTourPackage.pickup_location || "",
        drop_location: selectedTourPackage.drop_location || "",
        numAdults: data.numAdults,
        numChild5to12: data.numChild5to12 || "",
        numChild0to5: data.numChild0to5 || "",
        totalPrice: data.totalPrice,
        remarks: data.remarks,
        associatePartnerId: inquiry?.associatePartnerId,
        
        // Copy tour package content
        inclusions: selectedTourPackage.inclusions || "",
        exclusions: selectedTourPackage.exclusions || "",
        importantNotes: selectedTourPackage.importantNotes || "",
        paymentPolicy: selectedTourPackage.paymentPolicy || "",
        usefulTip: selectedTourPackage.usefulTip || "",
        cancellationPolicy: selectedTourPackage.cancellationPolicy || "",
        airlineCancellationPolicy: selectedTourPackage.airlineCancellationPolicy || "",
        termsconditions: selectedTourPackage.termsconditions || "",
        kitchenGroupPolicy: selectedTourPackage.kitchenGroupPolicy || "",
        
        // Copy images and flight details
        images: selectedTourPackage.images || [],
        flightDetails: selectedTourPackage.flightDetails || [],
        itineraries: selectedTourPackage.itineraries || [],
        
        isArchived: false,
        isFeatured: false,
      };

      await axios.post(`/api/tourPackageQuery`, formattedData);
      router.refresh();
      router.push(`/inquiries`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />

      {/* Inquiry Information Card */}
      {inquiry && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inquiry Details</CardTitle>
            <CardDescription>
              Creating tour package query for inquiry from {inquiry.customerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Customer:</span>
                <p>{inquiry.customerName}</p>
              </div>
              <div>
                <span className="font-medium">Mobile:</span>
                <p>{inquiry.customerMobileNumber}</p>
              </div>              <div>
                <span className="font-medium">Destination:</span>
                <p>{locations.find(loc => loc.id === inquiry.locationId)?.label || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium">Travel Date:</span>
                <p>{inquiry.journeyDate ? new Date(inquiry.journeyDate).toLocaleDateString() : 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium">Adults:</span>
                <p>{inquiry.numAdults}</p>
              </div>
              <div>
                <span className="font-medium">Children (5-11):</span>
                <p>{inquiry.numChildren5to11 || '0'}</p>
              </div>              <div>
                <span className="font-medium">Children (0-5):</span>
                <p>{inquiry.numChildrenBelow5 || '0'}</p>
              </div>
            </div>
            {inquiry.remarks && (
              <div className="mt-4">
                <span className="font-medium">Special Requests:</span>
                <p className="text-sm text-muted-foreground mt-1">{inquiry.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          {/* Tour Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Tour Package</CardTitle>
              <CardDescription>
                Choose a tour package that matches the inquiry requirements. Pricing will be calculated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="tourPackageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Tour Packages</FormLabel>
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
                              ? tourPackages?.find((pkg) => pkg.id === field.value)?.tourPackageName
                              : "Select tour package..."}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search tour package..." />
                          <CommandEmpty>No tour package found.</CommandEmpty>
                          <CommandGroup>
                            {tourPackages?.map((pkg) => (                              <CommandItem
                                value={pkg.tourPackageName || ""}
                                key={pkg.id}
                                onSelect={() => {
                                  form.setValue("tourPackageId", pkg.id);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    pkg.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />                                <div className="flex flex-col">
                                  <span className="font-medium">{pkg.tourPackageName || ""}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {pkg.numDaysNight} | {pkg.price}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select the tour package that best matches the inquiry requirements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show selected tour package preview */}
              {selectedTourPackage && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Selected Tour Package Preview</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Package:</span>
                      <p>{selectedTourPackage.tourPackageName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p>{selectedTourPackage.numDaysNight}</p>
                    </div>
                    <div>
                      <span className="font-medium">Base Price:</span>
                      <p>{selectedTourPackage.price}</p>
                    </div>                    <div>
                      <span className="font-medium">Location:</span>
                      <p>{locations.find(loc => loc.id === selectedTourPackage.locationId)?.label || 'Unknown'}</p>
                    </div>
                  </div>
                  {selectedTourPackage.tour_highlights && (
                    <div className="mt-2">
                      <span className="font-medium">Highlights:</span>
                      <p className="text-sm text-muted-foreground mt-1">{selectedTourPackage.tour_highlights}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Verify and update customer details for the tour package query
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input disabled={loading} placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Mobile Number</FormLabel>
                      <FormControl>
                        <Input disabled={loading} placeholder="Customer mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Passenger Details and Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Passenger Details & Pricing</CardTitle>
              <CardDescription>
                Update passenger count and view automatic pricing calculation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="numAdults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Adults</FormLabel>
                      <FormControl>
                        <Input 
                          disabled={loading} 
                          placeholder="Number of adults" 
                          type="number"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numChild5to12"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Children (5-12 years)</FormLabel>
                      <FormControl>
                        <Input 
                          disabled={loading} 
                          placeholder="Number of children" 
                          type="number"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numChild0to5"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Children (0-5 years)</FormLabel>
                      <FormControl>
                        <Input 
                          disabled={loading} 
                          placeholder="Number of infants" 
                          type="number"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Display */}
              <div className="mt-4 p-4 border rounded-lg bg-primary/5">
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculated Total Price</FormLabel>
                      <FormControl>
                        <Input 
                          disabled={true} 
                          placeholder="Price will be calculated automatically" 
                          {...field} 
                          className="font-medium text-lg"
                        />
                      </FormControl>
                      <FormDescription>
                        Price is automatically calculated based on selected tour package and passenger count
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Add any special remarks or requests for this tour package query
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea 
                        disabled={loading} 
                        placeholder="Any special remarks or requests..." 
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Add any special instructions, modifications, or notes for this tour package query
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button disabled={loading} className="ml-auto" type="submit">
              {action}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/inquiries')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
