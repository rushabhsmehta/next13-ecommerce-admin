"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, CalendarIcon, CheckIcon, Calculator, Plus } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
    tourPackageId: z.string().min(1, "Tour Package selection is required"),
    customerName: z.string().min(1, "Customer name is required"),
    customerNumber: z.string().min(1, "Customer number is required"),
    numAdults: z.string().min(1, "Number of adults is required"),
    numChild5to12: z.string().optional(),
    numChild0to5: z.string().optional(),
    totalPrice: z.string().optional(),
    remarks: z.string().optional(),
    pricingMethod: z.string().optional(),
    pricingBreakdown: z.string().optional(),
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

// Define interface for occupancy selection
interface OccupancySelection {
    occupancyTypeId: string;
    count: number;
    paxPerUnit: number;
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
    
    // State for auto-pricing functionality
    const [mealPlans, setMealPlans] = useState<any[]>([]);
    const [occupancyTypes, setOccupancyTypes] = useState<any[]>([]);
    const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);
    const [occupancySelections, setOccupancySelections] = useState<OccupancySelection[]>([]);
    const [newOccupancyTypeId, setNewOccupancyTypeId] = useState<string>("");
    const [newOccupancyCount, setNewOccupancyCount] = useState<number>(1);
    const [showAutoPricing, setShowAutoPricing] = useState(false);

    const title = "Create Tour Package Query";
    const description = "Create a tour package query from inquiry (Associate Partner)";
    const toastMessage = "Tour Package Query created successfully.";
    const action = "Create Query";
    const form = useForm<TourPackageQueryFormValues>({
        resolver: zodResolver(formSchema), defaultValues: {
            tourPackageId: "",
            customerName: inquiry?.customerName || "",
            customerNumber: inquiry?.customerMobileNumber || "",
            numAdults: inquiry?.numAdults?.toString() || "",
            numChild5to12: inquiry?.numChildren5to11?.toString() || "",
            numChild0to5: inquiry?.numChildrenBelow5?.toString() || "",
            totalPrice: "",
            remarks: "",
            pricingMethod: "",
            pricingBreakdown: "",
        }
    });
    // Watch for tour package selection changes
    const watchTourPackageId = form.watch("tourPackageId");
    // Enhanced pricing calculation function with Tour Package API integration
    const calculateAdvancedPricing = useCallback(async (packageId: string) => {
        if (!packageId) return;

        try {
            const numAdults = parseInt(form.getValues("numAdults") || "0") || 0;
            const numChild5to12 = parseInt(form.getValues("numChild5to12") || "0") || 0;
            const numChild0to5 = parseInt(form.getValues("numChild0to5") || "0") || 0;

            if (numAdults === 0 && numChild5to12 === 0 && numChild0to5 === 0) {
                form.setValue("totalPrice", "₹0");
                return;
            }

            // Try to fetch tour package pricing from the pricing API
            const response = await axios.get(`/api/tourPackages/${packageId}/pricing`);
            const pricingPeriods = response.data;

            if (pricingPeriods && pricingPeriods.length > 0) {
                // Use advanced pricing if available
                const currentDate = new Date();

                // Find matching pricing period for current date
                const matchingPricing = pricingPeriods.find((pricing: any) => {
                    const startDate = new Date(pricing.startDate);
                    const endDate = new Date(pricing.endDate);
                    return currentDate >= startDate && currentDate <= endDate;
                });

                if (matchingPricing && matchingPricing.pricingComponents) {
                    let totalPrice = 0;
                    const pricingBreakdown = [];

                    // Find pricing components
                    const perPersonComp = matchingPricing.pricingComponents.find((comp: any) =>
                        comp.pricingAttribute?.name?.toLowerCase().includes('per person')
                    );
                    const childComp = matchingPricing.pricingComponents.find((comp: any) =>
                        comp.pricingAttribute?.name?.toLowerCase().includes('child')
                    );
                    const infantComp = matchingPricing.pricingComponents.find((comp: any) =>
                        comp.pricingAttribute?.name?.toLowerCase().includes('infant')
                    );

                    // Calculate adult pricing
                    if (perPersonComp && numAdults > 0) {
                        const adultPrice = parseFloat(perPersonComp.price || '0') * numAdults;
                        totalPrice += adultPrice;
                        pricingBreakdown.push({
                            category: 'Adults',
                            count: numAdults,
                            rate: parseFloat(perPersonComp.price || '0'),
                            amount: adultPrice
                        });
                    }

                    // Calculate child pricing (5-12 years)
                    if (childComp && numChild5to12 > 0) {
                        const childPrice = parseFloat(childComp.price || '0') * numChild5to12;
                        totalPrice += childPrice;
                        pricingBreakdown.push({
                            category: 'Children (5-12 yrs)',
                            count: numChild5to12,
                            rate: parseFloat(childComp.price || '0'),
                            amount: childPrice
                        });
                    } else if (perPersonComp && numChild5to12 > 0) {
                        // Fallback: 70% of adult price for children
                        const childRate = parseFloat(perPersonComp.price || '0') * 0.7;
                        const childPrice = childRate * numChild5to12;
                        totalPrice += childPrice;
                        pricingBreakdown.push({
                            category: 'Children (5-12 yrs)',
                            count: numChild5to12,
                            rate: childRate,
                            amount: childPrice
                        });
                    }

                    // Calculate infant pricing (0-5 years)
                    if (infantComp && numChild0to5 > 0) {
                        const infantPrice = parseFloat(infantComp.price || '0') * numChild0to5;
                        totalPrice += infantPrice;
                        pricingBreakdown.push({
                            category: 'Infants (0-5 yrs)',
                            count: numChild0to5,
                            rate: parseFloat(infantComp.price || '0'),
                            amount: infantPrice
                        });
                    } else if (perPersonComp && numChild0to5 > 0) {
                        // Fallback: 30% of adult price for infants
                        const infantRate = parseFloat(perPersonComp.price || '0') * 0.3;
                        const infantPrice = infantRate * numChild0to5;
                        totalPrice += infantPrice;
                        pricingBreakdown.push({
                            category: 'Infants (0-5 yrs)',
                            count: numChild0to5,
                            rate: infantRate,
                            amount: infantPrice
                        });
                    }

                    // Set the calculated price
                    form.setValue("totalPrice", totalPrice.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    }));          // Store pricing breakdown for display (optional)
                    form.setValue("pricingBreakdown", JSON.stringify(pricingBreakdown));
                    form.setValue("pricingMethod", "advanced");

                    return;
                }
            }

            // Fallback to basic pricing if advanced pricing is not available
            const selectedPackage = tourPackages?.find(pkg => pkg.id === packageId);
            if (selectedPackage) {
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
                form.setValue("pricingMethod", "basic");
            }

        } catch (error) {
            console.log("Advanced pricing not available, using basic calculation");

            // Fallback to basic pricing
            const selectedPackage = tourPackages?.find(pkg => pkg.id === packageId);
            if (selectedPackage) {
                const numAdults = parseInt(form.getValues("numAdults") || "0") || 0;
                const numChild5to12 = parseInt(form.getValues("numChild5to12") || "0") || 0;
                const numChild0to5 = parseInt(form.getValues("numChild0to5") || "0") || 0;

                const basePrice = parseFloat(selectedPackage.price?.replace(/[^\d.-]/g, '') || "0") || 0;
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
                form.setValue("pricingMethod", "basic");
            }
        }
    }, [form, tourPackages]); // Add dependencies to useCallback
    useEffect(() => {
        if (watchTourPackageId && tourPackages) {
            const selectedPackage = tourPackages.find(pkg => pkg.id === watchTourPackageId);
            setSelectedTourPackage(selectedPackage);

            // Use enhanced pricing calculation
            calculateAdvancedPricing(watchTourPackageId);
        }
    }, [watchTourPackageId, tourPackages, calculateAdvancedPricing]);
    // Recalculate pricing when passenger numbers change
    const numAdults = form.watch("numAdults");
    const numChild5to12 = form.watch("numChild5to12");
    const numChild0to5 = form.watch("numChild0to5");

    useEffect(() => {
        if (selectedTourPackage?.id) {
            calculateAdvancedPricing(selectedTourPackage.id);
        }
    }, [numAdults, numChild5to12, numChild0to5, selectedTourPackage, calculateAdvancedPricing]);

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

    // Load meal plans and occupancy types on component mount
    useEffect(() => {
        const fetchLookupData = async () => {
            try {
                const [mealPlansRes, occupancyTypesRes] = await Promise.all([
                    axios.get('/api/meal-plans'),
                    axios.get('/api/occupancy-types')
                ]);
                setMealPlans(mealPlansRes.data);
                setOccupancyTypes(occupancyTypesRes.data);
            } catch (error) {
                console.error('Error fetching lookup data:', error);
                toast.error('Failed to load meal plans and occupancy types');
            }
        };

        fetchLookupData();
    }, []);

    // Function to calculate total PAX based on occupancy selections
    const calculateTotalPax = useCallback((): number => {
        return occupancySelections.reduce((total, selection) => {
            const count = typeof selection.count === 'number' ? selection.count : 1;
            const paxPerUnit = typeof selection.paxPerUnit === 'number' ? selection.paxPerUnit : 1;
            return total + (count * paxPerUnit);
        }, 0);
    }, [occupancySelections]);

    // Function to calculate PAX for pricing matches (only counting Double occupancy)
    const calculatePricingPax = (): number => {
        return occupancySelections.reduce((total, selection) => {
            const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
            const count = typeof selection.count === 'number' ? selection.count : 1;
            const paxPerUnit = typeof selection.paxPerUnit === 'number' ? selection.paxPerUnit : 1;
            
            // Only count Double occupancy for pricing match
            if (occupancyType && occupancyType.name?.toLowerCase().includes('double')) {
                return total + (count * paxPerUnit);
            }
            return total;
        }, 0);
    };

    // Function to add a new occupancy selection
    const handleAddOccupancySelection = () => {
        if (!newOccupancyTypeId) {
            toast.error("Please select an occupancy type");
            return;
        }

        const occupancyType = occupancyTypes.find(ot => ot.id === newOccupancyTypeId);
        if (!occupancyType) {
            toast.error("Invalid occupancy type selected");
            return;
        }

        // Determine pax per unit based on occupancy type name
        let paxPerUnit = 1; // Default
        if (occupancyType.name?.toLowerCase().includes('double')) {
            paxPerUnit = 2;
        } else if (occupancyType.name?.toLowerCase().includes('triple')) {
            paxPerUnit = 3;
        } else if (occupancyType.name?.toLowerCase().includes('quad')) {
            paxPerUnit = 4;
        }

        // Add to selections
        setOccupancySelections([
            ...occupancySelections,
            {
                occupancyTypeId: newOccupancyTypeId,
                count: newOccupancyCount,
                paxPerUnit
            }
        ]);

        // Reset form fields
        setNewOccupancyTypeId("");
        setNewOccupancyCount(1);
    };

    // Function to remove an occupancy selection
    const handleRemoveOccupancySelection = (index: number) => {
        setOccupancySelections(occupancySelections.filter((_, i) => i !== index));
    };

    // Enhanced Tour Package auto-pricing function with sophisticated API integration
    const handleFetchTourPackagePricing = async () => {
        if (!selectedTourPackage?.id) {
            toast.error("Please select a Tour Package first.");
            return;
        }

        if (!selectedMealPlanId) {
            toast.error("Please select a Meal Plan for Tour Package Pricing.");
            return;
        }

        if (occupancySelections.length === 0) {
            toast.error("Please add at least one occupancy selection.");
            return;
        }

        const pricingQueryPax = calculatePricingPax();
        const totalQueryPax = calculateTotalPax();

        if (totalQueryPax <= 0) {
            toast.error("Total number of guests must be greater than 0.");
            return;
        }

        if (pricingQueryPax <= 0) {
            toast.error("You need at least one Double occupancy selection for tour package pricing.");
            return;
        }

        toast.loading("Fetching and matching tour package pricing...");
        try {
            const response = await axios.get(`/api/tourPackages/${selectedTourPackage.id}/pricing`);
            const tourPackagePricings = response.data;
            toast.dismiss();

            if (!tourPackagePricings || tourPackagePricings.length === 0) {
                toast.error("No pricing periods found for the selected tour package.");
                return;
            }

            // Find matching pricing period for current date, meal plan, and pax count
            const currentDate = new Date();
            const matchedPricings = tourPackagePricings.filter((p: any) => {
                const periodStart = new Date(p.startDate);
                const periodEnd = new Date(p.endDate);
                const isDateMatch = currentDate >= periodStart && currentDate <= periodEnd;
                const isMealPlanMatch = p.mealPlanId === selectedMealPlanId;
                const isPaxMatch = p.numPax === pricingQueryPax;

                return isDateMatch && isMealPlanMatch && isPaxMatch;
            });

            if (matchedPricings.length === 0) {
                toast.error(`No matching pricing period found for the selected criteria (Date, Meal Plan, ${pricingQueryPax} Double PAX).`);
                return;
            }

            if (matchedPricings.length > 1) {
                console.warn("Multiple matching pricing periods found:", matchedPricings);
                toast.error("Multiple pricing periods match the criteria. Cannot automatically apply price. Please refine Tour Package pricing definitions.");
                return;
            }

            // Apply the uniquely matched pricing
            const selectedPricing = matchedPricings[0];

            // Extract pricing components
            const perPersonComponent = selectedPricing.pricingComponents.find((comp: any) =>
                comp.pricingAttribute?.name?.toLowerCase().includes('per person')
            );

            const perCoupleComponent = selectedPricing.pricingComponents.find((comp: any) =>
                comp.pricingAttribute?.name?.toLowerCase().includes('per couple')
            );

            // Calculate total price based on occupancy selections
            let totalPrice = 0;
            const finalPricingComponents = [];

            // Apply Double occupancy pricing
            const doubleOccupancySelections = occupancySelections.filter(selection => {
                const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                return occupancyType && occupancyType.name?.toLowerCase().includes('double');
            });

            if (doubleOccupancySelections.length > 0) {
                if (perCoupleComponent) {
                    const perCouplePrice = parseFloat(perCoupleComponent.price || '0');
                    const doubleCoupleCount = doubleOccupancySelections.reduce((total, selection) => {
                        return total + selection.count;
                    }, 0);
                    totalPrice += perCouplePrice * doubleCoupleCount;
                    
                    finalPricingComponents.push({
                        name: perCoupleComponent.pricingAttribute?.name || 'Per Couple Cost',
                        price: perCoupleComponent.price || '0',
                        description: 'Cost per couple'
                    });
                } else if (perPersonComponent) {
                    const perPersonPrice = parseFloat(perPersonComponent.price || '0');
                    const doublePersonCount = doubleOccupancySelections.reduce((total, selection) => {
                        return total + (selection.count * 2);
                    }, 0);
                    totalPrice += perPersonPrice * doublePersonCount;
                    
                    finalPricingComponents.push({
                        name: perPersonComponent.pricingAttribute?.name || 'Per Person Cost',
                        price: perPersonComponent.price || '0',
                        description: 'Cost per person'
                    });
                }
            }

            // Apply other occupancy pricing
            occupancySelections.forEach(selection => {
                const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                if (!occupancyType || occupancyType.name?.toLowerCase().includes('double')) return;

                const occupancyName = occupancyType.name?.toLowerCase() || '';
                let matchedComp;

                // Find the matching price component based on occupancy type
                if (occupancyName.includes('cnb') || (occupancyName.includes('child') && occupancyName.includes('no bed'))) {
                    matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
                        const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
                        return compName.includes('cnb') || (compName.includes('child') && compName.includes('no bed'));
                    });
                } else if (occupancyName.includes('extra bed') || occupancyName.includes('extra mattress')) {
                    matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
                        const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
                        return compName.includes('extra bed') || compName.includes('extrabed') || compName.includes('mattress');
                    });
                } else if (occupancyName.includes('child') && occupancyName.includes('with bed')) {
                    matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
                        const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
                        return compName.includes('child') && compName.includes('with bed');
                    });
                } else if (occupancyName.includes('infant')) {
                    matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
                        const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
                        return compName.includes('infant');
                    });
                } else {
                    // Fallback: try to find component that includes occupancy name
                    matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
                        const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
                        return compName.includes(occupancyName);
                    });
                }

                // Apply the price if a matching component is found
                if (matchedComp) {
                    const unitPrice = parseFloat(matchedComp.price || '0');
                    totalPrice += unitPrice * selection.count;
                    
                    finalPricingComponents.push({
                        name: matchedComp.pricingAttribute?.name || 'Other Cost',
                        price: matchedComp.price || '0',
                        description: ''
                    });
                }
            });

            // Set the calculated price
            form.setValue("totalPrice", totalPrice.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }));

            // Store pricing breakdown for display
            form.setValue("pricingBreakdown", JSON.stringify(finalPricingComponents));
            form.setValue("pricingMethod", "advanced");

            toast.success("Tour package pricing applied successfully!");

        } catch (error) {
            toast.dismiss();
            console.error("Error fetching/applying tour package pricing:", error);
            toast.error("Failed to fetch or apply tour package pricing.");
        }
    };    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
                    </CardHeader>                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Customer:</span>
                                <p className="mt-1 break-words">{inquiry.customerName}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Mobile:</span>
                                <p className="mt-1 break-all">{inquiry.customerMobileNumber}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Destination:</span>
                                <p className="mt-1 break-words">{locations.find(loc => loc.id === inquiry.locationId)?.label || 'Unknown'}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Travel Date:</span>
                                <p className="mt-1">{inquiry.journeyDate ? new Date(inquiry.journeyDate).toLocaleDateString() : 'Not specified'}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Adults:</span>
                                <p className="mt-1 text-lg font-semibold">{inquiry.numAdults}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Children (5-11):</span>
                                <p className="mt-1 text-lg font-semibold">{inquiry.numChildren5to11 || '0'}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium text-primary">Children (0-5):</span>
                                <p className="mt-1 text-lg font-semibold">{inquiry.numChildrenBelow5 || '0'}</p>
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
                                            </PopoverTrigger>                                            <PopoverContent className="w-[90vw] max-w-lg p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search tour package..." className="h-9" />
                                                    <CommandEmpty>No tour package found.</CommandEmpty>
                                                    <CommandGroup className="max-h-60 overflow-auto">
                                                        {tourPackages?.map((pkg) => (
                                                            <CommandItem
                                                                value={pkg.tourPackageName || ""}
                                                                key={pkg.id}
                                                                onSelect={() => {
                                                                    form.setValue("tourPackageId", pkg.id);
                                                                }}
                                                                className="flex items-start space-x-2 p-3"
                                                            >
                                                                <CheckIcon
                                                                    className={cn(
                                                                        "mt-1 h-4 w-4 flex-shrink-0",
                                                                        pkg.id === field.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <span className="font-medium text-sm leading-tight">
                                                                        {pkg.tourPackageName || ""}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground mt-1">
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
                            />                            {/* Show selected tour package preview */}
                            {selectedTourPackage && (
                                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                                    <h4 className="font-medium mb-3">Selected Tour Package Preview</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-primary">Package:</span>
                                            <p className="break-words">{selectedTourPackage.tourPackageName}</p>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-primary">Duration:</span>
                                            <p>{selectedTourPackage.numDaysNight}</p>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-primary">Base Price:</span>
                                            <p className="text-lg font-semibold text-green-600">{selectedTourPackage.price}</p>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-primary">Location:</span>
                                            <p className="break-words">{locations.find(loc => loc.id === selectedTourPackage.locationId)?.label || 'Unknown'}</p>
                                        </div>
                                    </div>
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
                        </CardHeader>                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="customerName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer Name</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    disabled={loading} 
                                                    placeholder="Customer name" 
                                                    {...field} 
                                                    className="h-11"
                                                />
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
                                                <Input 
                                                    disabled={loading} 
                                                    placeholder="Customer mobile number" 
                                                    {...field} 
                                                    className="h-11"
                                                />
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
                        </CardHeader>                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                <FormField
                                    control={form.control}
                                    name="numAdults"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-medium">Number of Adults</FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="Number of adults"
                                                    type="number"
                                                    min="0"
                                                    className="h-12 text-lg text-center"
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
                                            <FormLabel className="text-base font-medium">Children (5-12 years)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="Number of children"
                                                    type="number"
                                                    min="0"
                                                    className="h-12 text-lg text-center"
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
                                            <FormLabel className="text-base font-medium">Children (0-5 years)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={loading}
                                                    placeholder="Number of infants"
                                                    type="number"
                                                    min="0"
                                                    className="h-12 text-lg text-center"
                                                    {...field}                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Pricing Display */}
                            <div className="mt-6 p-4 border-2 rounded-lg bg-primary/5">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                    <FormLabel className="text-lg font-semibold">Calculated Total Price</FormLabel>
                                    {form.watch("pricingMethod") && (
                                        <span className={`text-xs px-3 py-1 rounded-full w-fit ${form.watch("pricingMethod") === "advanced"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-blue-100 text-blue-700"
                                            }`}>
                                            {form.watch("pricingMethod") === "advanced" ? "Advanced Pricing" : "Basic Pricing"}
                                        </span>
                                    )}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="totalPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    disabled={true}
                                                    placeholder="Price will be calculated automatically"
                                                    {...field}
                                                    className="font-bold text-xl h-12 text-center bg-white"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-center mt-2">
                                                Price is automatically calculated based on selected tour package and passenger count
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>                            {/* Pricing Breakdown Display */}
                            {form.watch("pricingBreakdown") && (
                                <div className="mt-6 p-4 border rounded-lg bg-green-50">
                                    <h4 className="font-medium text-base mb-4 text-green-800">Pricing Breakdown</h4>
                                    <div className="space-y-3">
                                        {(() => {
                                            try {
                                                const breakdown = JSON.parse(form.watch("pricingBreakdown") || "[]");
                                                return breakdown.map((item: any, index: number) => (
                                                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between gap-2 p-3 bg-white rounded-lg border border-green-200">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-800">{item.category}</span>
                                                            <span className="text-sm text-gray-600">
                                                                {item.count} × ₹{item.rate.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-green-700 text-lg self-end sm:self-center">
                                                            ₹{item.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ));
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                    <div className="mt-4 pt-4 border-t-2 border-green-300">
                                        <div className="flex justify-between items-center font-bold text-green-800 text-lg">
                                            <span>Total Amount</span>
                                            <span className="text-xl">{form.watch("totalPrice")}</span>
                                        </div>
                                    </div>
                                </div>
                            )}                            {/* Auto-Pricing Section */}
                            {selectedTourPackage && (
                                <div className="mt-6 p-4 border-2 border-dashed border-purple-200 rounded-lg bg-purple-50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                        <h4 className="font-bold text-purple-800 text-lg">Advanced Auto-Pricing</h4>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAutoPricing(!showAutoPricing)}
                                            className="text-purple-600 hover:text-purple-800 w-fit"
                                        >
                                            {showAutoPricing ? "Hide" : "Show"} Auto-Pricing
                                        </Button>
                                    </div>
                                    
                                    {showAutoPricing && (
                                        <div className="space-y-6">
                                            {/* Meal Plan Selection */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-3 block">
                                                    Select Meal Plan *
                                                </label>
                                                <Select
                                                    value={selectedMealPlanId || ""}
                                                    onValueChange={setSelectedMealPlanId}
                                                >
                                                    <SelectTrigger className="w-full h-12">
                                                        <SelectValue placeholder="Choose a meal plan..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {mealPlans.map((mealPlan) => (
                                                            <SelectItem key={mealPlan.id} value={mealPlan.id}>
                                                                {mealPlan.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Occupancy Selection */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-3 block">
                                                    Occupancy Types *
                                                </label>
                                                
                                                {/* Add Occupancy Selection */}
                                                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                                    <Select
                                                        value={newOccupancyTypeId}
                                                        onValueChange={setNewOccupancyTypeId}
                                                    >
                                                        <SelectTrigger className="flex-1 h-12">
                                                            <SelectValue placeholder="Select occupancy type..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {occupancyTypes.map((occupancyType) => (
                                                                <SelectItem key={occupancyType.id} value={occupancyType.id}>
                                                                    {occupancyType.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="number"
                                                            value={newOccupancyCount}
                                                            onChange={(e) => setNewOccupancyCount(parseInt(e.target.value) || 1)}
                                                            min="1"
                                                            className="w-24 h-12 text-center"
                                                            placeholder="Count"
                                                        />
                                                        <Button
                                                            type="button"
                                                            onClick={handleAddOccupancySelection}
                                                            size="sm"
                                                            className="h-12 px-4"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Display Selected Occupancies */}
                                                {occupancySelections.length > 0 && (
                                                    <div className="space-y-3">
                                                        {occupancySelections.map((selection, index) => {
                                                            const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                                                            return (
                                                                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                                                                    <div className="flex-1">
                                                                        <span className="font-medium text-base">{occupancyType?.name}</span>
                                                                        <div className="text-sm text-gray-500 mt-1">
                                                                            {selection.count} × {selection.paxPerUnit} pax = {selection.count * selection.paxPerUnit} total
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveOccupancySelection(index)}
                                                                        className="text-red-600 hover:text-red-800 w-fit"
                                                                    >
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                        
                                                        {/* Display PAX Summary */}
                                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                                                                <span className="font-medium text-blue-800">Total PAX: {calculateTotalPax()}</span>
                                                                <span className="text-blue-600">
                                                                    Pricing PAX (Double): {calculatePricingPax()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Auto-Pricing Button */}
                                            <div className="flex justify-center pt-2">
                                                <Button
                                                    type="button"
                                                    onClick={handleFetchTourPackagePricing}
                                                    disabled={loading || !selectedMealPlanId || occupancySelections.length === 0}
                                                    className="bg-purple-600 hover:bg-purple-700 h-12 px-6 text-base font-medium"
                                                >
                                                    <Calculator className="h-5 w-5 mr-2" />
                                                    Calculate Auto-Pricing
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}                            {/* Manual Recalculate Button */}
                            {selectedTourPackage && (
                                <div className="mt-6 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="default"
                                        onClick={() => calculateAdvancedPricing(selectedTourPackage.id)}
                                        disabled={loading}
                                        className="h-11 px-6 text-sm font-medium"
                                    >
                                        🔄 Recalculate Pricing
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Additional Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Information</CardTitle>
                            <CardDescription>
                                Add any special remarks or requests for this tour package query
                            </CardDescription>
                        </CardHeader>                        <CardContent>
                            <FormField
                                control={form.control}
                                name="remarks"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-base font-medium">Remarks</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                disabled={loading}
                                                placeholder="Any special remarks or requests..."
                                                {...field}
                                                rows={4}
                                                className="resize-none text-base leading-relaxed"
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
                    </Card>                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                        <Button 
                            disabled={loading} 
                            className="flex-1 sm:flex-none sm:ml-auto h-12 text-base font-medium px-8" 
                            type="submit"
                        >
                            {action}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/inquiries')}
                            disabled={loading}
                            className="flex-1 sm:flex-none h-12 text-base font-medium px-8"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
};
