"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, CalendarIcon, CheckIcon, Calculator, Plus, Loader2, FileText, Users, MapPin, ListPlus, Plane, Tag, FileCheck } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import tab components


const formSchema = z.object({
    tourPackageId: z.string().min(1, "Please select a tour package from the dropdown"),
    // Basic Info fields
    associatePartnerId: z.string().optional(),
    tourPackageQueryNumber: z.string().optional(),
    tourPackageQueryName: z.string().optional(),
    confirmed: z.boolean().optional(),

    // Customer/Guest Info fields
    customerName: z.string().min(2, "Customer name must be at least 2 characters").max(100, "Customer name cannot exceed 100 characters"),
    customerNumber: z.string().min(10, "Customer number must be at least 10 digits").max(15, "Customer number cannot exceed 15 digits").regex(/^[0-9+\-\s()]+$/, "Customer number must contain only numbers, spaces, +, -, and parentheses"),
    numAdults: z.string().min(1, "Number of adults is required").refine((val) => {
        const num = parseInt(val);
        return !isNaN(num) && num > 0 && num <= 50;
    }, "Number of adults must be between 1 and 50"),
    numChild5to12: z.string().optional().refine((val) => {
        if (!val || val === "") return true;
        const num = parseInt(val);
        return !isNaN(num) && num >= 0 && num <= 20;
    }, "Number of children (5-12) must be between 0 and 20"),
    numChild0to5: z.string().optional().refine((val) => {
        if (!val || val === "") return true;
        const num = parseInt(val);
        return !isNaN(num) && num >= 0 && num <= 10;
    }, "Number of children (0-5) must be between 0 and 10"),

    // Location fields
    locationId: z.string().optional(),

    // Date fields
    tourStartsFrom: z.string().optional(),
    tourEndsOn: z.string().optional(),
    numDaysNight: z.string().optional(),
    period: z.string().optional(),

    // Transport fields
    transport: z.string().optional(),
    pickup_location: z.string().optional(),
    drop_location: z.string().optional(),

    // Pricing fields
    totalPrice: z.string().optional(),
    pricePerAdult: z.string().optional(),
    price: z.string().optional(),
    remarks: z.string().max(1000, "Remarks cannot exceed 1000 characters").optional(),
    pricingMethod: z.string().optional(),
    pricingBreakdown: z.string().optional(),
    allPricingComponents: z.string().optional(),

    // Additional fields that may be needed
    disclaimer: z.string().optional(),
    selectedTemplateId: z.string().optional(),
    selectedTemplateType: z.string().optional(),
    tourPackageTemplate: z.string().optional(),
    tourPackageQueryTemplate: z.string().optional(),
    itineraries: z.array(z.any()).optional(),
    flightDetails: z.array(z.any()).optional(),
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
    const router = useRouter(); const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
    const action = "Create Query"; const form = useForm<TourPackageQueryFormValues>({
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
            allPricingComponents: "",
        }
    });// Watch for tour package selection changes
    const watchTourPackageId = form.watch("tourPackageId");

    // Watch all form values to detect changes
    const watchedValues = form.watch();
    // Track form changes
    useEffect(() => {
        const hasChanges =
            watchedValues.customerName !== (inquiry?.customerName || "") ||
            watchedValues.customerNumber !== (inquiry?.customerMobileNumber || "") ||
            watchedValues.numAdults !== (inquiry?.numAdults?.toString() || "") ||
            watchedValues.numChild5to12 !== (inquiry?.numChildren5to11?.toString() || "") ||
            watchedValues.numChild0to5 !== (inquiry?.numChildrenBelow5?.toString() || "") ||
            watchedValues.tourPackageId !== "" ||
            watchedValues.totalPrice !== "" ||
            watchedValues.remarks !== "";

        setHasUnsavedChanges(hasChanges);

        // Clear form error when user starts making changes
        if (hasChanges && formError) {
            setFormError(null);
        }
    }, [watchedValues, inquiry, formError]);

    // Navigation confirmation handler
    const handleBackNavigation = () => {
        if (hasUnsavedChanges && !loading) {
            const confirmLeave = window.confirm(
                "You have unsaved changes. Are you sure you want to leave? Your progress will be lost."
            );
            if (confirmLeave) {
                router.push('/inquiries');
            }
        } else {
            router.push('/inquiries');
        }
    };
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
    }, [numAdults, numChild5to12, numChild0to5, selectedTourPackage, calculateAdvancedPricing]); const onSubmit = async (data: TourPackageQueryFormValues) => {
        try {
            setLoading(true);
            setFormError(null); // Clear any previous errors

            // Client-side validation with user-friendly messages
            if (!selectedTourPackage) {
                const errorMsg = "Please select a tour package from the dropdown first";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            if (!data.customerName.trim()) {
                const errorMsg = "Customer name is required and cannot be empty";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            if (!data.customerNumber.trim()) {
                const errorMsg = "Customer mobile number is required";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            const numAdults = parseInt(data.numAdults);
            if (isNaN(numAdults) || numAdults <= 0) {
                const errorMsg = "Please enter a valid number of adults (minimum 1)";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            const numChild5to12 = data.numChild5to12 ? parseInt(data.numChild5to12) : 0;
            const numChild0to5 = data.numChild0to5 ? parseInt(data.numChild0to5) : 0;

            if (numChild5to12 < 0 || numChild0to5 < 0) {
                const errorMsg = "Number of children cannot be negative";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            const totalTravelers = numAdults + numChild5to12 + numChild0to5;
            if (totalTravelers > 100) {
                const errorMsg = "Total number of travelers cannot exceed 100";
                setFormError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            // Show loading message
            toast.loading("Creating tour package query...");

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
                numChild0to5: data.numChild0to5 || "", totalPrice: data.totalPrice,
                remarks: data.remarks,
                associatePartnerId: inquiry?.associatePartnerId || null,

                // Copy tour package content
                inclusions: selectedTourPackage.inclusions || "",
                exclusions: selectedTourPackage.exclusions || "",
                importantNotes: selectedTourPackage.importantNotes || "",
                paymentPolicy: selectedTourPackage.paymentPolicy || "",
                usefulTip: selectedTourPackage.usefulTip || "",
                cancellationPolicy: selectedTourPackage.cancellationPolicy || "",
                airlineCancellationPolicy: selectedTourPackage.airlineCancellationPolicy || "",
                termsconditions: selectedTourPackage.termsconditions || "",
                kitchenGroupPolicy: selectedTourPackage.kitchenGroupPolicy || "",                // Copy images and flight details
                images: selectedTourPackage.images || [],
                flightDetails: selectedTourPackage.flightDetails || [],
                itineraries: selectedTourPackage.itineraries || [],

                // Add missing fields that might be required
                price: selectedTourPackage.price || "",
                pricePerAdult: selectedTourPackage.pricePerAdult || "",
                pricePerChildOrExtraBed: selectedTourPackage.pricePerChildOrExtraBed || "",
                pricePerChild5to12YearsNoBed: selectedTourPackage.pricePerChild5to12YearsNoBed || "",
                pricePerChildwithSeatBelow5Years: selectedTourPackage.pricePerChildwithSeatBelow5Years || "",
                pricingSection: selectedTourPackage.pricingSection || [],

                // Add default values for potentially missing fields
                selectedTemplateId: selectedTourPackage.selectedTemplateId || "",
                selectedTemplateType: selectedTourPackage.selectedTemplateType || "",
                tourPackageTemplateName: selectedTourPackage.tourPackageTemplateName || "",
                selectedMealPlanId: selectedTourPackage.selectedMealPlanId || "",
                occupancySelections: selectedTourPackage.occupancySelections || [],
                assignedTo: selectedTourPackage.assignedTo || "",
                assignedToMobileNumber: selectedTourPackage.assignedToMobileNumber || "",
                assignedToEmail: selectedTourPackage.assignedToEmail || "",

                isArchived: false,
                isFeatured: false,
            };

            // Add comprehensive logging before API call
            console.log('[FORM_SUBMIT] About to submit data:', {
                keys: Object.keys(formattedData),
                requiredFields: {
                    tourPackageQueryName: formattedData.tourPackageQueryName,
                    locationId: formattedData.locationId,
                    associatePartnerId: formattedData.associatePartnerId,
                    customerName: formattedData.customerName,
                    customerNumber: formattedData.customerNumber,
                },
                imagesCount: formattedData.images?.length || 0,
                flightDetailsCount: formattedData.flightDetails?.length || 0,
                itinerariesCount: formattedData.itineraries?.length || 0,
            });

            await axios.post(`/api/tourPackageQuery`, formattedData);

            // Clear loading toast and show success
            toast.dismiss();
            toast.success(`Tour Package Query created successfully for ${data.customerName}!`);

            // Navigate back to inquiries
            router.refresh();
            router.push(`/inquiries`);

        } catch (error: any) {
            // Dismiss loading toast
            toast.dismiss();
            console.error('Form submission error:', error);

            // Provide specific error messages based on error type and status
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data;
                switch (status) {
                    case 400:
                        if (typeof errorData === 'string') {
                            setFormError(`Validation Error: ${errorData}`);
                            toast.error(`Validation Error: ${errorData}`);
                        } else if (errorData?.message) {
                            setFormError(`Validation Error: ${errorData.message}`);
                            toast.error(`Validation Error: ${errorData.message}`);
                        } else {
                            setFormError('Invalid form data. Please check all required fields.');
                            toast.error('Invalid form data. Please check all required fields.');
                        }
                        break;
                    case 401:
                        setFormError('Authentication failed. Please sign in again.');
                        toast.error('Authentication failed. Please sign in again.');
                        break;
                    case 403:
                        setFormError('You do not have permission to perform this action.');
                        toast.error('You do not have permission to perform this action.');
                        break;
                    case 404:
                        setFormError('Tour package or inquiry not found. Please refresh the page.');
                        toast.error('Tour package or inquiry not found. Please refresh the page.');
                        break;
                    case 409:
                        setFormError('A tour package query already exists for this inquiry.');
                        toast.error('A tour package query already exists for this inquiry.');
                        break;
                    case 422:
                        if (errorData?.errors) {
                            // Handle validation errors from the server
                            const errorMessages = Object.entries(errorData.errors)
                                .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                                .join('\n');
                            setFormError(`Validation Errors:\n${errorMessages}`);
                            toast.error(`Validation Errors:\n${errorMessages}`);
                        } else {
                            setFormError('Invalid data provided. Please check your inputs.');
                            toast.error('Invalid data provided. Please check your inputs.');
                        }
                        break;
                    case 500:
                        setFormError('Server error occurred. Please try again later or contact support.');
                        toast.error('Server error occurred. Please try again later or contact support.');
                        break;
                    case 503:
                        setFormError('Service temporarily unavailable. Please try again later.');
                        toast.error('Service temporarily unavailable. Please try again later.');
                        break;
                    default:
                        if (typeof errorData === 'string') {
                            setFormError(`Error: ${errorData}`);
                            toast.error(`Error: ${errorData}`);
                        } else if (errorData?.message) {
                            setFormError(`Error: ${errorData.message}`);
                            toast.error(`Error: ${errorData.message}`);
                        } else {
                            setFormError(`Request failed with status ${status}. Please try again.`);
                            toast.error(`Request failed with status ${status}. Please try again.`);
                        }
                }
            } else if (error.message) {
                setFormError(`Network Error: ${error.message}`);
                toast.error(`Network Error: ${error.message}`);
            } else {
                setFormError('An unexpected error occurred. Please check your connection and try again.');
                toast.error('An unexpected error occurred. Please check your connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };    // Load meal plans and occupancy types on component mount
    useEffect(() => {
        const fetchLookupData = async () => {
            try {
                const [mealPlansRes, occupancyTypesRes] = await Promise.all([
                    axios.get('/api/meal-plans'),
                    axios.get('/api/occupancy-types')
                ]);

                // Validate the response data
                if (!Array.isArray(mealPlansRes.data)) {
                    console.error('Invalid meal plans response:', mealPlansRes.data);
                    toast.error('Invalid meal plans data received from server.');
                    return;
                }

                if (!Array.isArray(occupancyTypesRes.data)) {
                    console.error('Invalid occupancy types response:', occupancyTypesRes.data);
                    toast.error('Invalid occupancy types data received from server.');
                    return;
                }

                setMealPlans(mealPlansRes.data);
                setOccupancyTypes(occupancyTypesRes.data);

            } catch (error) {
                console.error('Error fetching lookup data:', error);

                // Provide specific error messages
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    const errorData = error.response?.data;

                    switch (status) {
                        case 403:
                            toast.error('Authentication failed. Please sign in again to load meal plans and occupancy types.');
                            break;
                        case 500:
                            toast.error('Server error loading meal plans and occupancy types. Please refresh the page.');
                            break;
                        case 503:
                            toast.error('Service temporarily unavailable. Please try again later.');
                            break;
                        default:
                            if (typeof errorData === 'string') {
                                toast.error(`Failed to load meal plans and occupancy types: ${errorData}`);
                            } else {
                                toast.error(`Failed to load meal plans and occupancy types. Status: ${status}`);
                            }
                    }
                } else {
                    toast.error('Network error loading meal plans and occupancy types. Please check your connection.');
                }
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
        } toast.loading("Fetching and matching tour package pricing...");
        try {
            console.log("Making API request to:", `/api/tourPackages/${selectedTourPackage.id}/pricing`);
            const response = await axios.get(`/api/tourPackages/${selectedTourPackage.id}/pricing`);
            console.log("Raw response:", response);
            console.log("Response data:", response.data);
            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);

            const tourPackagePricings = response.data;
            toast.dismiss();

            // Check if the response is valid and is an array
            if (!Array.isArray(tourPackagePricings)) {
                console.error("Invalid response format - not an array:", tourPackagePricings);
                console.error("Type of response:", typeof tourPackagePricings);
                console.error("Response string preview:", String(tourPackagePricings).substring(0, 500));
                toast.error("Invalid response format from pricing API.");
                return;
            }

            if (tourPackagePricings.length === 0) {
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
            );            // Calculate total price based on occupancy selections
            let totalPrice = 0;
            const pricingBreakdown: Array<{
                category: string;
                count: number;
                rate: number;
                amount: number;
            }> = [];

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
                    const coupleAmount = perCouplePrice * doubleCoupleCount;
                    totalPrice += coupleAmount;

                    pricingBreakdown.push({
                        category: perCoupleComponent.pricingAttribute?.name || 'Per Couple Cost',
                        count: doubleCoupleCount,
                        rate: perCouplePrice,
                        amount: coupleAmount
                    });
                } else if (perPersonComponent) {
                    const perPersonPrice = parseFloat(perPersonComponent.price || '0');
                    const doublePersonCount = doubleOccupancySelections.reduce((total, selection) => {
                        return total + (selection.count * 2);
                    }, 0);
                    const personAmount = perPersonPrice * doublePersonCount;
                    totalPrice += personAmount;

                    pricingBreakdown.push({
                        category: `${perPersonComponent.pricingAttribute?.name || 'Per Person Cost'} (Double Rooms)`,
                        count: doublePersonCount,
                        rate: perPersonPrice,
                        amount: personAmount
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
                    const componentAmount = unitPrice * selection.count;
                    totalPrice += componentAmount;

                    pricingBreakdown.push({
                        category: matchedComp.pricingAttribute?.name || occupancyType.name || 'Other Cost',
                        count: selection.count,
                        rate: unitPrice,
                        amount: componentAmount
                    });
                }
            });

            // Set the calculated price
            form.setValue("totalPrice", totalPrice.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }));            // Store pricing breakdown for display
            form.setValue("pricingBreakdown", JSON.stringify(pricingBreakdown));
            form.setValue("pricingMethod", "advanced");

            // Store all available pricing components with usage status
            const allPricingComponents = selectedPricing.pricingComponents.map((comp: any) => {
                // Check if this component was used in the pricing breakdown
                const wasUsed = pricingBreakdown.some((breakdownItem: any) =>
                    breakdownItem.category === (comp.pricingAttribute?.name || 'Unknown')
                );

                return {
                    id: comp.id,
                    name: comp.pricingAttribute?.name || 'Unknown Component',
                    price: parseFloat(comp.price || '0'),
                    isUsed: wasUsed,
                    pricingAttributeId: comp.pricingAttributeId
                };
            });

            form.setValue("allPricingComponents", JSON.stringify(allPricingComponents));

            toast.success("Tour package pricing applied successfully!");
        } catch (error: any) {
            toast.dismiss();
            console.error("Error fetching/applying tour package pricing:", error);

            // Provide more specific error messages based on error type
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data;

                switch (status) {
                    case 400:
                        toast.error("Invalid pricing request. Please check your tour package selection and try again.");
                        break;
                    case 401:
                    case 403:
                        toast.error("Authentication failed. Please sign in again to access pricing information.");
                        break;
                    case 404:
                        toast.error("Pricing information not found for this tour package. Please contact support.");
                        break;
                    case 500:
                        toast.error("Server error loading pricing. Please try again later or contact support.");
                        break;
                    case 503:
                        toast.error("Pricing service temporarily unavailable. Please try again later.");
                        break;
                    default:
                        if (typeof errorData === 'string') {
                            toast.error(`Pricing Error: ${errorData}`);
                        } else if (errorData?.message) {
                            toast.error(`Pricing Error: ${errorData.message}`);
                        } else {
                            toast.error(`Failed to fetch tour package pricing (Status: ${status}). Please try again.`);
                        }
                }
            } else if (error?.message?.includes('Network Error')) {
                toast.error("Network error loading pricing. Please check your internet connection and try again.");
            } else if (error?.message) {
                toast.error(`Pricing Error: ${error.message}`);
            } else {
                toast.error("Failed to fetch or apply tour package pricing. Please try again or contact support.");
            }
        }
    }; return (
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
                </Card>)}

            {/* Form Error Display */}
            {formError && (
                <Card className="mb-6 border-destructive bg-destructive/10">
                    <CardContent className="pt-6">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-destructive"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-destructive">
                                    Form Submission Error
                                </h3>
                                <div className="mt-2 text-sm text-destructive/80 whitespace-pre-line">
                                    {formError}
                                </div>
                                <div className="mt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFormError(null)}
                                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </div>
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

                    {/* Tabbed Structure */}
                    <Tabs defaultValue="basic-info" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                            <TabsTrigger value="basic-info" className="flex items-center gap-1 px-2">
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">Basic Info</span>
                            </TabsTrigger>
                            <TabsTrigger value="guests" className="flex items-center gap-1 px-2">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Guests</span>
                            </TabsTrigger>
                            <TabsTrigger value="location" className="flex items-center gap-1 px-2">
                                <MapPin className="h-4 w-4" />
                                <span className="hidden sm:inline">Location</span>
                            </TabsTrigger>
                            <TabsTrigger value="dates" className="flex items-center gap-1 px-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Dates</span>
                            </TabsTrigger>
                            <TabsTrigger value="itinerary" className="flex items-center gap-1 px-2">
                                <ListPlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Itinerary</span>
                            </TabsTrigger>
                            <TabsTrigger value="flights" className="flex items-center gap-1 px-2">
                                <Plane className="h-4 w-4" />
                                <span className="hidden sm:inline">Flights</span>
                            </TabsTrigger>
                            <TabsTrigger value="pricing" className="flex items-center gap-1 px-2">
                                <Calculator className="h-4 w-4" />
                                <span className="hidden sm:inline">Pricing</span>
                            </TabsTrigger>
                            <TabsTrigger value="policies" className="flex items-center gap-1 px-2">
                                <FileCheck className="h-4 w-4" />
                                <span className="hidden sm:inline">Policies</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic-info">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                    <CardDescription>
                                        Basic details about the tour package query
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="tourPackageQueryName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Query Name</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Tour package query name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tourPackageQueryNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Query Number</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Auto-generated" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>                                    <FormField
                                        control={form.control}
                                        name="confirmed"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                                        disabled={loading}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Confirmed Query
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Mark this query as confirmed by the customer
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="guests">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Guest Information</CardTitle>
                                    <CardDescription>
                                        Number of guests and their details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
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
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="numAdults"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Number of Adults</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="0" {...field} />
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
                                                        <Input disabled={loading} placeholder="0" {...field} />
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
                                                        <Input disabled={loading} placeholder="0" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="location">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Location & Transport</CardTitle>
                                    <CardDescription>
                                        Destination and transportation details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="locationId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Location</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select location" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {locations.map((location) => (
                                                            <SelectItem key={location.id} value={location.id}>
                                                                {location.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="transport"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Transport Mode</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Transport mode" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="pickup_location"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Pickup Location</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Pickup location" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="drop_location"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Drop Location</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Drop location" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="dates">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Travel Dates</CardTitle>
                                    <CardDescription>
                                        Travel dates and duration information
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="tourStartsFrom"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tour Starts From</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="tourEndsOn"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tour Ends On</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="numDaysNight"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Duration (Days/Nights)</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="e.g., 7 Days 6 Nights" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="period"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Travel Period</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Season/Period" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>                        <TabsContent value="itinerary">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Itinerary Details</CardTitle>
                                    <CardDescription>
                                        Tour itinerary will be populated from the selected tour package
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedTourPackage && selectedTourPackage.itineraries ? (
                                        <div className="space-y-4">
                                            {selectedTourPackage.itineraries.map((itinerary: any, index: number) => (
                                                <div key={index} className="border rounded-lg p-4">
                                                    <h4 className="font-medium">Day {itinerary.dayNumber || index + 1}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {itinerary.title || 'No title'}
                                                    </p>
                                                    {itinerary.description && (
                                                        <p className="text-sm mt-2">{itinerary.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select a tour package to view itinerary details</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>                        <TabsContent value="flights">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Flight Details</CardTitle>
                                    <CardDescription>
                                        Flight information will be populated from the selected tour package
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedTourPackage && selectedTourPackage.flightDetails ? (
                                        <div className="space-y-4">
                                            {selectedTourPackage.flightDetails.map((flight: any, index: number) => (
                                                <div key={index} className="border rounded-lg p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="font-medium">Flight:</span>
                                                            <p className="text-sm">{flight.flightName || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Route:</span>
                                                            <p className="text-sm">{flight.fromLocation || 'N/A'} → {flight.toLocation || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Departure:</span>
                                                            <p className="text-sm">{flight.departureTime || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Arrival:</span>
                                                            <p className="text-sm">{flight.arrivalTime || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select a tour package to view flight details</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>                        <TabsContent value="pricing">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pricing Information</CardTitle>
                                    <CardDescription>
                                        Pricing details and calculation
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="totalPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Total Price</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Total price" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="pricePerAdult"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Price Per Adult</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={loading} placeholder="Price per adult" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="remarks"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pricing Remarks</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        disabled={loading}
                                                        placeholder="Additional pricing remarks or notes"
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Auto-pricing section */}
                                    <div className="border rounded-lg p-4 bg-muted/50">
                                        <h4 className="font-medium mb-3">Auto-Pricing Options</h4>
                                        <div className="space-y-4">                                            <div className="flex items-center space-x-3">
                                            <Checkbox
                                                checked={showAutoPricing}
                                                onCheckedChange={(checked) => setShowAutoPricing(checked === true)}
                                                disabled={loading}
                                            />
                                            <label className="text-sm font-medium">
                                                Enable Advanced Auto-Pricing
                                            </label>
                                        </div>

                                            {showAutoPricing && (
                                                <div className="space-y-4 mt-4">
                                                    {/* Meal Plan Selection */}
                                                    <div>
                                                        <label className="text-sm font-medium">Meal Plan</label>
                                                        <Select
                                                            value={selectedMealPlanId || ""}
                                                            onValueChange={setSelectedMealPlanId}
                                                            disabled={loading}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue placeholder="Select meal plan" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {mealPlans.map((plan) => (
                                                                    <SelectItem key={plan.id} value={plan.id}>
                                                                        {plan.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Occupancy Selection */}
                                                    <div>
                                                        <label className="text-sm font-medium">Occupancy Types</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                                            <Select value={newOccupancyTypeId} onValueChange={setNewOccupancyTypeId}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select occupancy" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {occupancyTypes.map((type) => (
                                                                        <SelectItem key={type.id} value={type.id}>
                                                                            {type.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="number"
                                                                value={newOccupancyCount}
                                                                onChange={(e) => setNewOccupancyCount(parseInt(e.target.value) || 1)}
                                                                placeholder="Count"
                                                                min="1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                onClick={handleAddOccupancySelection}
                                                                disabled={loading || !newOccupancyTypeId}
                                                                size="sm"
                                                            >
                                                                Add
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Selected Occupancies */}
                                                    {occupancySelections.length > 0 && (
                                                        <div>
                                                            <label className="text-sm font-medium">Selected Occupancies</label>
                                                            <div className="space-y-2 mt-2">
                                                                {occupancySelections.map((selection, index) => {
                                                                    const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                                                                    return (
                                                                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                                                                            <span className="text-sm">
                                                                                {occupancyType?.name} × {selection.count} ({selection.paxPerUnit * selection.count} pax)
                                                                            </span>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleRemoveOccupancySelection(index)}
                                                                            >
                                                                                Remove
                                                                            </Button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Fetch Pricing Button */}
                                                    <Button
                                                        type="button"
                                                        onClick={handleFetchTourPackagePricing}
                                                        disabled={loading || !selectedTourPackage || !selectedMealPlanId || occupancySelections.length === 0}
                                                        className="w-full"
                                                    >
                                                        <Calculator className="h-4 w-4 mr-2" />
                                                        Calculate Advanced Pricing
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>                        <TabsContent value="policies">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Terms & Policies</CardTitle>
                                    <CardDescription>
                                        Terms and conditions, policies, and disclaimers
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {selectedTourPackage ? (
                                        <div className="space-y-6">
                                            {selectedTourPackage.inclusions && (
                                                <div>
                                                    <h4 className="font-medium text-green-600">Inclusions</h4>
                                                    <div className="text-sm mt-2 p-3 bg-green-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.inclusions }} />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTourPackage.exclusions && (
                                                <div>
                                                    <h4 className="font-medium text-red-600">Exclusions</h4>
                                                    <div className="text-sm mt-2 p-3 bg-red-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.exclusions }} />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTourPackage.importantNotes && (
                                                <div>
                                                    <h4 className="font-medium text-amber-600">Important Notes</h4>
                                                    <div className="text-sm mt-2 p-3 bg-amber-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.importantNotes }} />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTourPackage.paymentPolicy && (
                                                <div>
                                                    <h4 className="font-medium text-blue-600">Payment Policy</h4>
                                                    <div className="text-sm mt-2 p-3 bg-blue-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.paymentPolicy }} />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTourPackage.cancellationPolicy && (
                                                <div>
                                                    <h4 className="font-medium text-orange-600">Cancellation Policy</h4>
                                                    <div className="text-sm mt-2 p-3 bg-orange-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.cancellationPolicy }} />
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTourPackage.termsconditions && (
                                                <div>
                                                    <h4 className="font-medium text-gray-600">Terms & Conditions</h4>
                                                    <div className="text-sm mt-2 p-3 bg-gray-50 rounded border">
                                                        <div dangerouslySetInnerHTML={{ __html: selectedTourPackage.termsconditions }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground">Select a tour package to view policies and terms</p>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="disclaimer"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Additional Disclaimer</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        disabled={loading}
                                                        placeholder="Any additional disclaimers or notes"
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent></Tabs>

                    {/* Form Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                        <Button
                            disabled={loading}
                            className="flex-1 sm:flex-none sm:ml-auto h-12 text-base font-medium px-8"
                            type="submit"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating Query...
                                </>
                            ) : (
                                action
                            )}
                        </Button>                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackNavigation}
                            disabled={loading}
                            className="flex-1 sm:flex-none h-12 text-base font-medium px-8"
                        >
                            {hasUnsavedChanges ? "Cancel (Unsaved Changes)" : "Cancel"}
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
};
