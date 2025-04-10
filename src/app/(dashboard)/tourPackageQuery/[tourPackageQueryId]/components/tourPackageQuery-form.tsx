"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown, ChevronUp, Trash, ListPlus, Plus, ListChecks, AlertCircle, ScrollText, Calculator, Download, BedDouble, UtensilsCrossed, Car, PlusCircle, Printer } from "lucide-react"
import { Activity, AssociatePartner, Customer, ExpenseDetail, Images, ItineraryMaster, PaymentDetail, PurchaseDetail, ReceiptDetail, SaleDetail, Supplier } from "@prisma/client"
import { Location, Hotel, TourPackage, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
// Import DevTool for better debugging (optional in production)
import { DevTool } from "@hookform/devtools"
import { useAutoCalculatePrice } from "@/hooks/use-auto-calculate-price"
import { ROOM_TYPES, OCCUPANCY_TYPES, MEAL_PLANS } from '@/lib/constants';

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
import { AIRLINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, DISCLAIMER_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_HIGHLIGHTS_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, USEFUL_TIPS_DEFAULT, DEFAULT_PRICING_SECTION } from "./defaultValues"
import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"
import JoditEditor from "jodit-react";
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"

// Add these imports at the top
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, MapPin, Plane, Tag, FileCheck } from "lucide-react"

// Add PolicyField import
import { PolicyField } from "./policy-fields";
import RoomAllocationComponent from "./room-allocation"

// Interface for transport detail inputs
interface TransportDetailInput {
  vehicleType: string;
  quantity: number;
  capacity?: string;
  description?: string;
}



// Add interfaces for calculation results
interface AccommodationDetail {
  hotelName: string;
  roomType: string;
  roomCount: number;
}

interface CalculationDayBreakdown {
  dayNumber: number;
  date?: string;
  hotelName: string;
  roomCost: number;
  mealCost: number;
  transportCost?: number;
  total: number;
  roomsBreakdown?: string;
  accommodations?: AccommodationDetail[];
  mealPlan?: string; // Added missing mealPlan property
}

interface DatePeriodBreakdown {
  startDate: string;
  endDate: string;
  days: number;
  totalCost: number;
}

interface RoomDetail {
  roomType: string;
  occupancyType: string;
  mealPlan?: string;
  quantity: number;
  pricePerRoom?: number;
  totalCost?: number;
  guestNames?: string;
  warning?: string;
}

interface RoomAllocationBreakdown {
  dayNumber: number;
  date: string;
  hotelName: string;
  totalCost: number;
  rooms: RoomDetail[];
}

interface CalculationResult {
  totalPrice: number;
  roomCost: number;
  mealCost: number;
  transportCost: number;
  totalRooms: number;
  breakdown: CalculationDayBreakdown[];
  datePeriodBreakdown?: DatePeriodBreakdown[];
  roomAllocations?: RoomAllocationBreakdown[]; 
  transportDetails?: Array<{
    vehicleType: string;
    quantity: number;
    capacity?: string;
    cost: number;
    description?: string;
    dayRange?: string;
    dayNumber?: number;
    perDayOrTrip?: string;
  }>;
  pricingSection: Array<{ name: string, price: string, description?: string }>;
}

// Auto Calculate Price Button component with proper types
const AutoCalculatePriceButton = ({
  form,
  hotels
}: {
  form: UseFormReturn<TourPackageQueryFormValues>;
  hotels: Hotel[];
}) => {
  const { calculatePackagePrice, isCalculating, error } = useAutoCalculatePrice(); 
  const [showError, setShowError] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [calculationDetails, setCalculationDetails] = useState<CalculationResult | null>(null);
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>('percentage');
  const [markupValue, setMarkupValue] = useState<number>(0);
  const [markupedPrice, setMarkupedPrice] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);  const handleAutoCalculate = async () => {
    try {
      setShowError(false);
      setShowResults(false);
      setMarkupedPrice(null);

      // Get required data from form
      const tourStartsFrom = form.getValues('tourStartsFrom');
      const tourEndsOn = form.getValues('tourEndsOn');
      const itineraries = form.getValues('itineraries');
      
      // We'll extract guest counts from room allocations rather than using 
      // separate form fields, avoiding potential inconsistencies
      
      // Validate required data
      if (!tourStartsFrom || !tourEndsOn) {
        toast.error('Please select tour start and end dates first');
        return;
      }

      // Check if we have valid itineraries with hotels
      const validItineraries = itineraries.filter(itinerary =>
        itinerary.hotelId && hotels.some(hotel => hotel.id === itinerary.hotelId)
      );

      if (validItineraries.length === 0) {
        toast.error('Please select at least one hotel in your itinerary');
        return;
      }
        // Import constants (At the top of your file)      // Process itineraries and ensure all room allocations use standardized values with proper meal plans
      const processedItineraries = itineraries.map(itinerary => {
        // Debug output to help diagnose issues
        console.log(`Processing itinerary with hotelId: ${itinerary.hotelId}, roomAllocations:`, itinerary.roomAllocations);
        
        // Get mealsIncluded array for this itinerary and convert to meal plan if present
        const mealsArray = itinerary.mealsIncluded || [];
        const derivedMealPlan = 
          mealsArray.includes('breakfast') && mealsArray.includes('lunch') && mealsArray.includes('dinner') ? MEAL_PLANS.AP :
          mealsArray.includes('breakfast') && mealsArray.includes('dinner') ? MEAL_PLANS.MAP :
          mealsArray.includes('breakfast') ? MEAL_PLANS.CP : MEAL_PLANS.EP;
        
        console.log(`Derived meal plan from mealsIncluded: ${derivedMealPlan}`);
        
        return {
          ...itinerary,
          roomAllocations: itinerary.roomAllocations && itinerary.roomAllocations.length > 0 ? 
            itinerary.roomAllocations.map(room => {
              // Extract the meal plan explicitly or use derived value
              const effectiveMealPlan = room.mealPlan || itinerary.mealPlan || derivedMealPlan;
              console.log(`Room allocation: using meal plan: ${effectiveMealPlan}`);
              
              return {
                ...room,
                roomType: room.roomType || itinerary.roomType || ROOM_TYPES.DELUXE,
                occupancyType: room.occupancyType || itinerary.occupancyType || OCCUPANCY_TYPES.DOUBLE,
                mealPlan: effectiveMealPlan,
                // Ensure quantity is a number
                quantity: typeof room.quantity === 'string' ? parseInt(room.quantity) || 1 : (room.quantity || 1)
              };
            })
            : [{ 
              // Add default room allocation if none exists - with standardized values
              roomType: itinerary.roomType || ROOM_TYPES.DELUXE,
              occupancyType: itinerary.occupancyType || OCCUPANCY_TYPES.DOUBLE,
              quantity: parseInt(itinerary.numberofRooms || '1'),
              guestNames: '',
              mealPlan: itinerary.mealPlan || derivedMealPlan
            }]
        };
      });

      const result = await calculatePackagePrice({
        tourStartsFrom,
        tourEndsOn,
        itineraries: processedItineraries,
      });

      if (result) {
        // Store detailed calculation results
        setCalculationDetails(result);
        setShowResults(true);

        // Calculate markup if any
        let finalPrice = result.totalPrice;
        if (markupValue > 0) {
          if (markupType === 'percentage') {
            finalPrice = finalPrice * (1 + markupValue / 100);
          } else { // fixed amount
            finalPrice = finalPrice + markupValue;
          }
          setMarkupedPrice(finalPrice);
        }

        // Update form with calculated results
        const updatedPricingSection = [...result.pricingSection];

        // Add markup to pricing section if applied
        if (markupValue > 0) {
          updatedPricingSection.push({
            name: markupType === 'percentage' ? `Markup (${markupValue}%)` : 'Markup (Fixed)',
            price: markupType === 'percentage'
              ? `₹${Math.round((result.totalPrice * markupValue / 100)).toLocaleString()}`
              : `₹${Math.round(markupValue).toLocaleString()}`,
            description: 'Additional charges'
          });
        }

        form.setValue('pricingSection', updatedPricingSection);
        form.setValue('totalPrice', `₹${Math.round(finalPrice).toLocaleString()}`);

        // Show a success toast
        toast.success('Package price calculated successfully!');
      }
    } catch (err) {
      console.error('Error calculating price:', err);
      setShowError(true);
    }
  };
  // Function to apply markup
  const applyMarkup = () => {
    if (!calculationDetails) return;

    let finalPrice = calculationDetails.totalPrice;
    if (markupValue > 0) {
      if (markupType === 'percentage') {
        finalPrice = finalPrice * (1 + markupValue / 100);
      } else { // fixed amount
        finalPrice = finalPrice + markupValue;
      }
      setMarkupedPrice(finalPrice);

      // Update form with marked up price
      const updatedPricingSection = [...calculationDetails.pricingSection];

      // Remove existing markup entry if any
      const markupIndex = updatedPricingSection.findIndex(p => p.name.includes('Markup'));
      if (markupIndex !== -1) {
        updatedPricingSection.splice(markupIndex, 1);
      }

      // Add new markup entry
      updatedPricingSection.push({
        name: markupType === 'percentage' ? `Markup (${markupValue}%)` : 'Markup (Fixed)',
        price: markupType === 'percentage'
          ? `₹${Math.round((calculationDetails.totalPrice * markupValue / 100)).toLocaleString()}`
          : `₹${Math.round(markupValue).toLocaleString()}`,
        description: 'Additional charges'
      });

      form.setValue('pricingSection', updatedPricingSection);
      form.setValue('totalPrice', `₹${Math.round(finalPrice).toLocaleString()}`);
    }
  };  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-2">
        <div className="flex flex-col space-y-2 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Markup Type:</label>
            <Select
              value={markupType}
              onValueChange={(value) => setMarkupType(value as 'percentage' | 'fixed')}
              disabled={isCalculating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select markup type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              className="w-24"
              placeholder={markupType === 'percentage' ? "%" : "₹"}
              value={markupValue || ''}
              onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
              disabled={isCalculating}
            />

            <Button
              type="button"
              onClick={applyMarkup}
              variant="outline"
              size="sm"
              disabled={isCalculating || !calculationDetails}
            >
              Apply Markup
            </Button>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAutoCalculate}
          disabled={isCalculating}
          variant="secondary"
          className="mb-2 whitespace-nowrap"
        >
          {isCalculating ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Auto Calculate Price
            </>
          )}
        </Button>
      </div>

      {showError && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mt-2 mb-4">
          <p className="text-sm font-medium flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </p>
        </div>
      )}        {showResults && calculationDetails && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mt-2 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blue-800 font-medium flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Price Calculation Details
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1 h-7 bg-white"
                onClick={() => {
                  // Toggle all sections open/closed
                  const allSections = document.querySelectorAll('[data-price-section]');
                  const allClosed = Array.from(allSections).every(
                    el => el.getAttribute('data-state') === 'closed'
                  );

                  allSections.forEach(section => {
                    if (allClosed) {
                      section.setAttribute('data-state', 'open');
                    } else {
                      section.setAttribute('data-state', 'closed');
                    }
                  });
                  setExpanded(!expanded);
                }}
              >
                {expanded ? 'Collapse All' : 'Expand All'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-1 h-7 text-blue-600 hover:text-blue-800"
                onClick={() => {
                  // Print or export to PDF logic could be added here
                  toast.success("Preparing print view...");
                  // For now, we'll just open the browser print dialog
                  window.print();
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
            </div>
          </div>

          {/* Main Summary Card - Always Visible */}
          <div className="bg-white rounded-lg p-4 shadow border border-blue-200 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-700 text-base">Package Pricing Summary</h4>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 font-medium">
                {calculationDetails.breakdown.length} Days / {calculationDetails.totalRooms} Rooms
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">TOUR DATES</div>
                  <div className="font-medium text-sm flex items-center">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    {calculationDetails.breakdown.length > 0 && (
                      <>
                        {calculationDetails.breakdown[0].date} - {calculationDetails.breakdown[calculationDetails.breakdown.length - 1].date}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">GUEST COMPOSITION</div>
                  <div className="font-medium text-sm flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    {form.getValues('numAdults') || 2} Adults, {form.getValues('numChild5to12') || 0} Children (5-12), {form.getValues('numChild0to5') || 0} Infants
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-blue-50/50 p-3">
                <h5 className="text-xs font-medium text-blue-800 mb-1.5">COST BREAKDOWN</h5>
                <div className="grid grid-cols-1 gap-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center">
                      <BedDouble className="h-3.5 w-3.5 mr-1.5" />
                      Accommodation
                    </span>
                    <span className="font-medium">₹{Math.round(calculationDetails.roomCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center">
                      <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                      Meals
                    </span>
                    <span className="font-medium">₹{Math.round(calculationDetails.mealCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center">
                      <Car className="h-3.5 w-3.5 mr-1.5" />
                      Transport
                    </span>
                    <span className="font-medium">₹{Math.round(calculationDetails.transportCost || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-md p-3 shadow-sm">
                  <h5 className="text-sm font-medium text-blue-700 mb-1">TOTAL PACKAGE PRICE</h5>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Base Price:</span>
                    <span className="font-semibold text-lg">₹{Math.round(calculationDetails.totalPrice).toLocaleString()}</span>
                  </div>

                  {markupedPrice && (
                    <>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-600 text-sm flex items-center">
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Markup ({markupType === 'percentage' ? `${markupValue}%` : `₹${markupValue.toLocaleString()}`}):
                        </span>
                        <span className="font-medium text-sm text-green-700">
                          ₹{Math.round(markupedPrice - calculationDetails.totalPrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-blue-200 mt-2 pt-2 flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Final Price:</span>
                        <span className="font-bold text-blue-800 text-lg">₹{Math.round(markupedPrice).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50/50 rounded-md p-2 text-xs text-center text-blue-600">
                  {calculationDetails.totalRooms > 0 && (
                    <div className="flex items-center justify-center">
                      <BedDouble className="h-3 w-3 mr-1" />
                      {calculationDetails.breakdown.length > 0 && calculationDetails.breakdown[0].roomsBreakdown}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Per person price section */}
            {calculationDetails.pricingSection && calculationDetails.pricingSection.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 pt-3 border-t border-blue-100">
                {calculationDetails.pricingSection
                  .filter(item => item.name.includes("Per Person") || item.name.includes("Per Couple") || item.name.includes("Child"))
                  .slice(0, 6)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded-sm bg-blue-50/30">
                      <span className="text-gray-600">{item.name}:</span>
                      <span className="font-medium">{item.price}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Room Configuration Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded p-3 shadow-sm border border-blue-100">
              <h4 className="text-sm font-medium text-blue-700 mb-1 flex items-center justify-between">
                <span className="flex items-center">
                  <BedDouble className="h-4 w-4 mr-2" />
                  Room Configuration
                </span>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 text-xs">
                  {calculationDetails.totalRooms || 0} Rooms
                </Badge>
              </h4>
              <p className="text-sm text-blue-600">
                {calculationDetails.breakdown.length > 0 && calculationDetails.breakdown[0].roomsBreakdown || 'Room details not available'}
              </p>
            </div>

            <div className="bg-white rounded p-3 shadow-sm border border-blue-100">
              <h4 className="text-sm font-medium text-blue-700 mb-1 flex items-center">
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Meal Plan Details
              </h4>              <div className="text-sm text-blue-600">
                {calculationDetails.breakdown.some(day => day.mealPlan && day.mealPlan !== "N/A") ? (
                  <div className="flex flex-col gap-1 text-xs">
                    {/* Filter out undefined values first, then create a Set to deduplicate */}
                    {Array.from(
                      new Set(
                        calculationDetails.breakdown
                          .map(day => day.mealPlan)
                          .filter((plan): plan is string => !!plan && plan !== "N/A")
                      )
                    ).map((plan, i) => (
                      <div key={i} className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-blue-400 mr-2"></div>
                        <span>{plan}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>No meal plan specified</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded p-3 shadow-sm border border-blue-100">
              <h4 className="text-sm font-medium text-blue-700 mb-1 flex items-center">
                <Car className="h-4 w-4 mr-2" />
                Transport Information
              </h4>
              <div className="text-sm text-blue-600">
                {calculationDetails.transportDetails && calculationDetails.transportDetails.length > 0 ? (
                  <div className="flex flex-col gap-1 text-xs">
                    {calculationDetails.transportDetails.slice(0, 2).map((transport, i) => (
                      <div key={i} className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-blue-400 mr-2"></div>
                        <span>{transport.quantity}x {transport.vehicleType} {transport.perDayOrTrip || 'Per Trip'}</span>
                      </div>
                    ))}
                    {calculationDetails.transportDetails.length > 2 && (
                      <div className="text-xs text-blue-500">+{calculationDetails.transportDetails.length - 2} more vehicles</div>
                    )}
                  </div>
                ) : (
                  <span>No transport details available</span>
                )}
              </div>
            </div>
          </div>
          {/* Collapsible Sections */}
          <Accordion type="multiple" className="mt-4 space-y-2">
            {/* Day-by-Day Breakdown Section */}
            {calculationDetails.breakdown.length > 0 && (
              <AccordionItem value="day-breakdown" className="border rounded-md overflow-hidden" data-price-section>
                <AccordionTrigger className="px-4 py-2 hover:no-underline bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">Day-by-Day Breakdown</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100/30">
                      {calculationDetails.breakdown.length} Days
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-white">
                  <div className="overflow-x-auto">
                    <div className="max-h-60 overflow-y-auto text-xs px-4 py-2">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-blue-100 sticky top-0 z-10">
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Day</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Date</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Accommodations</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Meal Plan</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Room Cost</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Meal Cost</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Transport</th>
                            <th className="py-2 px-2 text-left font-medium text-blue-800">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculationDetails.breakdown.map((day, index) => (
                            <tr
                              key={index}
                              className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'} border-b border-blue-100/30 hover:bg-blue-50/70 transition-colors`}
                            >
                              <td className="py-2 px-2 font-medium">{day.dayNumber}</td>
                              <td className="py-2 px-2">{day.date || 'N/A'}</td>
                              <td className="py-2 px-2">
                                {day.accommodations && day.accommodations.length > 0 ? (
                                  <div className="space-y-1">
                                    {day.accommodations.map((acc, i) => (
                                      <div key={i} className="flex items-start gap-1 text-xs">
                                        <BedDouble className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                                        <div>
                                          <span className="font-medium">{acc.hotelName}</span>
                                          <span className="text-gray-500"> ({acc.roomType} x{acc.roomCount})</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <BedDouble className="h-3 w-3 mr-1 text-blue-500" />
                                    {day.hotelName || 'No accommodation'}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className={
                                  day.mealPlan?.includes('AP') ? 'bg-green-50 text-green-700 border-green-200' :
                                    day.mealPlan?.includes('MAP') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      day.mealPlan?.includes('CP') ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                }>
                                  {day.mealPlan || 'None'}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 font-medium">₹{Math.round(day.roomCost || 0).toLocaleString()}</td>
                              <td className="py-2 px-2 font-medium">₹{Math.round(day.mealCost || 0).toLocaleString()}</td>
                              <td className="py-2 px-2 font-medium">
                                {(day.transportCost && day.transportCost > 0) ? (
                                  <div className="flex items-center">
                                    <Car className="h-3 w-3 mr-1 text-blue-500" />
                                    ₹{Math.round(day.transportCost).toLocaleString()}
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="py-2 px-2 font-medium text-blue-800">₹{Math.round(day.total || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="bg-blue-100/50 font-medium">
                            <td colSpan={4} className="py-2 px-2 text-blue-800">Total</td>
                            <td className="py-2 px-2">₹{Math.round(calculationDetails.roomCost).toLocaleString()}</td>
                            <td className="py-2 px-2">₹{Math.round(calculationDetails.mealCost).toLocaleString()}</td>
                            <td className="py-2 px-2">₹{Math.round(calculationDetails.transportCost).toLocaleString()}</td>
                            <td className="py-2 px-2 font-medium text-blue-800">₹{Math.round(calculationDetails.totalPrice).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Room Allocation Details Section */}
            {calculationDetails.roomAllocations && calculationDetails.roomAllocations.length > 0 && (
              <AccordionItem value="room-allocation" className="border rounded-md overflow-hidden" data-price-section>
                <AccordionTrigger className="px-4 py-2 hover:no-underline bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Room Allocation Details</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-white">
                  <div className="max-h-36 overflow-y-auto text-xs px-4 py-2">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="py-1 px-2 text-left">Day</th>
                          <th className="py-1 px-2 text-left">Date</th>
                          <th className="py-1 px-2 text-left">Hotel</th>
                          <th className="py-1 px-2 text-left">Room Type</th>
                          <th className="py-1 px-2 text-left">Occupancy</th>
                          <th className="py-1 px-2 text-left">Quantity</th>
                          <th className="py-1 px-2 text-left">Price/Room</th>
                          <th className="py-1 px-2 text-left">Total Cost</th>
                          <th className="py-1 px-2 text-left">Guests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationDetails.roomAllocations.flatMap((day) =>
                          day.rooms.map((room, roomIndex) => (
                            <tr key={`${day.dayNumber}-${roomIndex}`} className={
                              day.dayNumber % 2 === 0 ?
                                (roomIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50') :
                                (roomIndex % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100/30')
                            }>
                              <td className="py-1 px-2">{day.dayNumber}</td>
                              <td className="py-1 px-2">{day.date || 'N/A'}</td>
                              <td className="py-1 px-2">{day.hotelName}</td>
                              <td className="py-1 px-2">{room.roomType}</td>
                              <td className="py-1 px-2">{room.occupancyType}</td>
                              <td className="py-1 px-2">{room.quantity}</td>
                              <td className="py-1 px-2">{room.pricePerRoom ? `₹${Math.round(room.pricePerRoom).toLocaleString()}` : 'N/A'}</td>
                              <td className="py-1 px-2">{room.pricePerRoom ? `₹${Math.round(room.totalCost || 0).toLocaleString()}` : room.warning}</td>
                              <td className="py-1 px-2">{room.guestNames || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Transport Details Section */}
            {calculationDetails.transportDetails && calculationDetails.transportDetails.length > 0 && (
              <AccordionItem value="transport-details" className="border rounded-md overflow-hidden" data-price-section>
                <AccordionTrigger className="px-4 py-2 hover:no-underline bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center">
                    <Plane className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Transport Details</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-white">
                  <div className="max-h-32 overflow-y-auto text-xs px-4 py-2">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="py-1 px-2 text-left">Vehicle Type</th>
                          <th className="py-1 px-2 text-left">Quantity</th>
                          <th className="py-1 px-2 text-left">Capacity</th>
                          <th className="py-1 px-2 text-left">Days</th>
                          <th className="py-1 px-2 text-left">Type</th>
                          <th className="py-1 px-2 text-left">Description</th>
                          <th className="py-1 px-2 text-left">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationDetails.transportDetails.map((transport, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                            <td className="py-1 px-2">{transport.vehicleType}</td>
                            <td className="py-1 px-2">{transport.quantity}</td>
                            <td className="py-1 px-2">{transport.capacity || 'N/A'}</td>
                            <td className="py-1 px-2">{transport.dayRange || (transport.dayNumber ? `Day ${transport.dayNumber}` : 'All days')}</td>
                            <td className="py-1 px-2">{transport.perDayOrTrip || 'Per Trip'}</td>
                            <td className="py-1 px-2">{transport.description || '-'}</td>
                            <td className="py-1 px-2">₹{Math.round(transport.cost || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Seasonal Pricing Section */}
            {calculationDetails.datePeriodBreakdown && calculationDetails.datePeriodBreakdown.length > 0 && (
              <AccordionItem value="seasonal-pricing" className="border rounded-md overflow-hidden" data-price-section>
                <AccordionTrigger className="px-4 py-2 hover:no-underline bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">Seasonal Pricing</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-white">
                  <div className="max-h-32 overflow-y-auto text-xs px-4 py-2">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="py-1 px-2 text-left">Period</th>
                          <th className="py-1 px-2 text-left">Days</th>
                          <th className="py-1 px-2 text-left">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationDetails.datePeriodBreakdown.map((period, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                            <td className="py-1 px-2">{period.startDate} to {period.endDate}</td>
                            <td className="py-1 px-2">{period.days}</td>
                            <td className="py-1 px-2">₹{Math.round(period.totalCost || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <div className="mt-6 text-right flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs mr-2"
              onClick={() => {
                // Save to PDF logic could be implemented here
                toast.success("Price calculation details saved!");
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <p className="text-sm text-blue-800 font-medium">
              Total Package Price: <span className="text-lg">₹{Math.round(calculationDetails.totalPrice).toLocaleString()}</span>
              {markupedPrice && (
                <span className="ml-1 text-green-700">
                  → ₹{Math.round(markupedPrice).toLocaleString()} (with markup)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 max-w-md text-right">
        Automatically calculate package pricing based on selected hotels and dates
      </p>
    </div>
  );
};

// Define a pricing item schema
const pricingItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().optional(), // Changed from required to optional
  description: z.string().optional(),
});

const activitySchema = z.object({
  activityTitle: z.string().optional(),
  activityDescription: z.string().optional(),
  activityImages: z.object({ url: z.string() }).array(),
});

// Define room allocation schema for mixed occupancy
const roomAllocationSchema = z.object({
  roomType: z.string().optional(),
  occupancyType: z.string(), // Make occupancyType required
  quantity: z.number().or(z.string().transform(val => parseInt(val) || 1)),
  guestNames: z.string().optional(),
  mealPlan: z.string().optional() // Add meal plan field
});

const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().optional(),
  dayNumber: z.coerce.number().optional(),
  days: z.string().optional(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string(), // Hotel ID
  numberofRooms: z.string().optional(),
  roomCategory: z.string().optional(),
  roomType: z.string().optional(), // Default roomType field for pricing
  mealPlan: z.string().optional(), // Added mealPlan field for pricing
  occupancyType: z.string().optional(), // Default occupancyType for pricing
  locationId: z.string(), // Location ID
  vehicleType: z.string().optional(), // Added vehicleType field for transport pricing
  // Add support for mixed occupancy rooms
  roomAllocations: z.array(roomAllocationSchema).optional(),
});


const flightDetailsSchema = z.object({
  date: z.string().optional(),
  flightName: z.string().optional(),
  flightNumber: z.string().optional(), // Added flightNumber
  from: z.string().optional(), // Added from
  to: z.string().optional(), // Added to
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  flightDuration: z.string().optional(),
}); // Assuming an array of flight details

const formSchema = z.object({
  inquiryId: z.string().nullable().optional(),
  tourPackageTemplate: z.string().optional(),
  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1, "Tour Package Query Name is required"),
  tourPackageQueryType: z.string().optional(),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
  tourStartsFrom: z.date().optional(),
  tourEndsOn: z.date().optional(),
  transport: z.string().optional().nullable().transform(val => val || ''),
  pickup_location: z.string().optional().nullable().transform(val => val || ''),
  drop_location: z.string().optional().nullable().transform(val => val || ''),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  totalPrice: z.string().optional().nullable().transform(val => val || ''),
  pricingSection: z.array(pricingItemSchema).optional().default([]), // Add this line
  remarks: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  flightDetails: flightDetailsSchema.array(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  importantNotes: z.array(z.string()),
  paymentPolicy: z.array(z.string()),
  usefulTip: z.array(z.string()),
  cancellationPolicy: z.array(z.string()),
  airlineCancellationPolicy: z.array(z.string()),
  termsconditions: z.array(z.string()),
  disclaimer: z.string().optional().nullable().transform(val => val || ''),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  associatePartnerId: z.string().optional(), // Add associatePartnerId to the schema
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  associatePartners: AssociatePartner[]; // Add this line
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
};

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  associatePartners, // Add this
  tourPackages,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);
  const editor = useRef(null)

  const [useLocationDefaults, setUseLocationDefaults] = useState({
    inclusions: false,
    exclusions: false,
    importantNotes: false,
    paymentPolicy: false,
    usefulTip: false,
    cancellationPolicy: false,
    airlineCancellationPolicy: false,
    termsconditions: false,
  });

  const parsePricingSection = (data: any): Array<{ name: string, price: string, description?: string }> => {
    if (!data) return [];

    // If it's already an array, return it
    if (Array.isArray(data)) return data;

    // If it's a string, try to parse it
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Error parsing pricingSection:", e);
        return [];
      }
    }

    // If it's neither an array nor a string, return empty array
    return [];
  };

  const parseJsonField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field as string);
      return Array.isArray(parsed) ? parsed : [field as string];
    } catch (e) {
      return [field as string];
    }
  };
  const handleUseLocationDefaultsChange = (field: string, checked: boolean): void => {
    setUseLocationDefaults(prevState => ({ ...prevState, [field]: checked }));
    if (checked) {
      const selectedLocation = locations.find(location => location.id === form.getValues('locationId'));
      if (selectedLocation) {
        switch (field) {
          case 'inclusions':
            form.setValue('inclusions', parseJsonField(selectedLocation.inclusions) || INCLUSIONS_DEFAULT);
            break;
          case 'exclusions':
            form.setValue('exclusions', parseJsonField(selectedLocation.exclusions) || EXCLUSIONS_DEFAULT);
            break;
          case 'importantNotes':
            form.setValue('importantNotes', parseJsonField(selectedLocation.importantNotes) || IMPORTANT_NOTES_DEFAULT);
            break;
          case 'paymentPolicy':
            form.setValue('paymentPolicy', parseJsonField(selectedLocation.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
            break;
          case 'usefulTip':
            form.setValue('usefulTip', parseJsonField(selectedLocation.usefulTip) || USEFUL_TIPS_DEFAULT);
            break;
          case 'cancellationPolicy':
            form.setValue('cancellationPolicy', parseJsonField(selectedLocation.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
            break;
          case 'airlineCancellationPolicy':
            form.setValue('airlineCancellationPolicy', parseJsonField(selectedLocation.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
            break;
          case 'termsconditions':
            form.setValue('termsconditions', parseJsonField(selectedLocation.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
            break;
        }
      }
    }
  };

  //console.log(initialData);
  const title = initialData ? 'Edit Tour  Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get("/api/suppliers");
        setSuppliers(res.data);
      } catch (error) {
        console.error("Error fetching suppliers", error);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get("/api/customers");
        setCustomers(res.data);
      } catch (error) {
        console.error("Error fetching customers", error);
      }
    };
    fetchCustomers();
  }, []);


  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';
  console.log("Initial Data : ", initialData?.itineraries)

  const transformInitialData = (data: any) => {
    return {
      ...data,
      inquiryId: data.inquiryId ?? '',  // Handle null/undefined inquiryId by using empty string as fallback
      tourPackageQueryNumber: data.tourPackageQueryNumber ?? getCurrentDateTimeString(), // Set the current date and time
      //  assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      //  assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      //  assignedToEmail: data.assignedToEmail ?? '',

      flightDetails: data.flightDetails.map((flightDetail: any) => ({
        date: flightDetail.date ?? '',
        flightName: flightDetail.flightName ?? '',
        flightNumber: flightDetail.flightNumber ?? '',
        from: flightDetail.from ?? '',
        to: flightDetail.to ?? '',
        departureTime: flightDetail.departureTime ?? '',
        arrivalTime: flightDetail.arrivalTime ?? '',
        flightDuration: flightDetail.flightDuration ?? '',
      })),
      itineraries: data.itineraries.map((itinerary: any) => ({
        dayNumber: itinerary.dayNumber ?? 0,
        days: itinerary.days ?? '',
        itineraryImages: itinerary.itineraryImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
        itineraryTitle: itinerary.itineraryTitle ?? '',
        itineraryDescription: itinerary.itineraryDescription ?? '',
        hotelId: itinerary.hotelId ?? '',
        numberofRooms: itinerary.numberofRooms ?? '',
        roomCategory: itinerary.roomCategory ?? '',
        locationId: itinerary.locationId ?? '',
        roomType: itinerary.roomType ?? '', // Added roomType field for pricing
        mealPlan: itinerary.mealPlan ?? '', // Added mealPlan field for pricing
        occupancyType: itinerary.occupancyType ?? '', // Added occupancyType for precise pricing
        vehicleType: itinerary.vehicleType ?? '', // Added vehicleType field for transport pricing
        //hotel : hotels.find(hotel => hotel.id === hotelId)?.name ?? '',
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.split('-') : [],
        activities: itinerary.activities?.map((activity: any) => ({
          locationId: activity.locationId ?? '',
          activityImages: activity.activityImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
          activityTitle: activity.activityTitle ?? '',
          activityDescription: activity.activityDescription ?? '',
        }))
      })),
      transport: data.transport || '',
      pickup_location: data.pickup_location || '',
      drop_location: data.drop_location || '',
      totalPrice: data.totalPrice || '',
      disclaimer: data.disclaimer || '',
      inclusions: parseJsonField(data.inclusions) || INCLUSIONS_DEFAULT,
      exclusions: parseJsonField(data.exclusions) || EXCLUSIONS_DEFAULT,
      importantNotes: parseJsonField(data.importantNotes) || IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: parseJsonField(data.paymentPolicy) || PAYMENT_TERMS_DEFAULT,
      usefulTip: parseJsonField(data.usefulTip) || USEFUL_TIPS_DEFAULT,
      cancellationPolicy: parseJsonField(data.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: parseJsonField(data.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: parseJsonField(data.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT,
      pricingSection: parsePricingSection(data.pricingSection) || DEFAULT_PRICING_SECTION,
    };
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Format: YYYYMMDDHHMMSS
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {
    inquiryId: '',
    tourPackageTemplate: '',
    tourPackageQueryNumber: getCurrentDateTimeString(), // Set the current date and time
    tourPackageQueryName: '',
    associatePartnerId: '',
    tourPackageQueryType: '',
    customerName: '',
    customerNumber: '',
    numDaysNight: '',
    period: '',
    tour_highlights: TOUR_HIGHLIGHTS_DEFAULT,
    tourStartsFrom: '',
    tourEndsOn: '',
    transport: '',
    pickup_location: '',
    drop_location: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    totalPrice: '',
    remarks: '',
    //  assignedTo: '',
    //  assignedToMobileNumber: '',
    //  assignedToEmail: '',

    flightDetails: [],

    // hotelDetails: '',
    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    importantNotes: IMPORTANT_NOTES_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
    disclaimer: DISCLAIMER_DEFAULT,
    images: [],
    itineraries: [],
    /* itineraries: [{
      days: '',
      activities: [],
      mealsIncluded: [],
      hotelId: '',
    }],
     */
    locationId: '',
    //location : '',
    // hotelId: '',
    isFeatured: false,
    isArchived: false,
    pricingSection: DEFAULT_PRICING_SECTION, // Update this line to use the default pricing section
  };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Add this right after the form declaration
  // This gives us specialized methods to handle the pricing section array
  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
    insert: insertPricing
  } = useFieldArray({
    control: form.control,
    name: "pricingSection"
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

  const handleTourPackageSelection = (selectedTourPackageId: string) => {
    const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
    if (selectedTourPackage) {
      // Add this line to update the tourPackageTemplate field
      form.setValue('tourPackageTemplate', selectedTourPackageId);
      // Rest of your existing setValue calls
      form.setValue('tourPackageQueryType', selectedTourPackage.tourPackageType || '');
      form.setValue('locationId', selectedTourPackage.locationId);
      form.setValue('numDaysNight', selectedTourPackage.numDaysNight || '');
      form.setValue('transport', selectedTourPackage.transport || '');
      form.setValue('pickup_location', selectedTourPackage.pickup_location || '');
      form.setValue('drop_location', selectedTourPackage.drop_location || '');
      form.setValue('tour_highlights', selectedTourPackage.tour_highlights || '');
      form.setValue('totalPrice', selectedTourPackage.totalPrice || '');
      form.setValue('inclusions', parseJsonField(selectedTourPackage.inclusions) || INCLUSIONS_DEFAULT);
      form.setValue('exclusions', parseJsonField(selectedTourPackage.exclusions) || EXCLUSIONS_DEFAULT);
      form.setValue('importantNotes', parseJsonField(selectedTourPackage.importantNotes) || IMPORTANT_NOTES_DEFAULT);
      form.setValue('paymentPolicy', parseJsonField(selectedTourPackage.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
      form.setValue('usefulTip', parseJsonField(selectedTourPackage.usefulTip) || USEFUL_TIPS_DEFAULT);
      form.setValue('cancellationPolicy', parseJsonField(selectedTourPackage.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
      form.setValue('airlineCancellationPolicy', parseJsonField(selectedTourPackage.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
      form.setValue('termsconditions', parseJsonField(selectedTourPackage.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
      form.setValue('images', selectedTourPackage.images || []);
      const transformedItineraries = selectedTourPackage.itineraries?.map(itinerary => ({
        locationId: itinerary.locationId,
        itineraryImages: itinerary.itineraryImages?.map(img => ({ url: img.url })) || [],
        itineraryTitle: itinerary.itineraryTitle || '',
        itineraryDescription: itinerary.itineraryDescription || '',
        dayNumber: itinerary.dayNumber || 0,
        days: itinerary.days || '',
        activities: itinerary.activities?.map(activity => ({
          activityImages: activity.activityImages?.map(img => ({ url: img.url })) || [],
          activityTitle: activity.activityTitle || '',
          activityDescription: activity.activityDescription || ''
        })) || [],
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.split('-') : [],
        hotelId: itinerary.hotelId || '', numberofRooms: itinerary.numberofRooms ?? '',
        roomCategory: itinerary.roomCategory ?? '',
        roomType: itinerary.roomType ?? '', // Added roomType field for pricing
        mealPlan: itinerary.mealPlan ?? '', // Added mealPlan field for pricing
        occupancyType: itinerary.occupancyType ?? '', // Added occupancyType for precise pricing
        vehicleType: itinerary.vehicleType ?? '', // Added vehicleType field for transport pricing
      })) || [];
      form.setValue('itineraries', transformedItineraries);
      form.setValue('flightDetails', (selectedTourPackage.flightDetails || []).map(flight => ({
        date: flight.date || undefined,
        flightName: flight.flightName || undefined,
        flightNumber: flight.flightNumber || undefined,
        from: flight.from || undefined,
        to: flight.to || undefined,
        departureTime: flight.departureTime || undefined,
        arrivalTime: flight.arrivalTime || undefined,
        flightDuration: flight.flightDuration || undefined
      })));
      form.setValue('pricingSection', parsePricingSection(selectedTourPackage.pricingSection) || DEFAULT_PRICING_SECTION);
    }
  };

  // Fix the handleAddPricingItem function using splice for direct array manipulation
  const handleAddPricingItem = (insertAtIndex?: number) => {
    const newItem = { name: '', price: '', description: '' };

    if (insertAtIndex !== undefined) {
      // Insert after the specified index
      insertPricing(insertAtIndex + 1, newItem);
      console.log("Inserted item after index", insertAtIndex);
    } else {
      // Add to the end
      appendPricing(newItem);
      console.log("Added item at the end");
    }
  };

  const handleRemovePricingItem = (indexToRemove: number) => {
    removePricing(indexToRemove);
    console.log("Removed item at index", indexToRemove);
  };

  const onSubmit = async (data: TourPackageQueryFormValues) => {
    try {
      setLoading(true);
      // Log the form data being submitted
      console.log("Submitting data:", data);
      console.log("TourPackageQueryId:", params.tourPackageQueryId);

      // Check form validation state
      const isValid = await form.trigger();
      console.log("Form validation state:", form.formState);

      if (!isValid) {
        console.log("Validation errors:", form.formState.errors);
        toast.error("Please check the form for errors");
        setLoading(false);
        return;
      }

      const formattedData = {
        ...data,
        itineraries: data.itineraries.map(itinerary => ({
          ...itinerary,
          locationId: data.locationId,
          mealsIncluded: itinerary.mealsIncluded && itinerary.mealsIncluded.length > 0
            ? itinerary.mealsIncluded.join('-')
            : '',
          activities: itinerary.activities?.map((activity) => ({
            ...activity,
            locationId: data.locationId,
          }))
        })),
        transport: data.transport || '',
        pickup_location: data.pickup_location || '',
        drop_location: data.drop_location || '',
        totalPrice: data.totalPrice || '',
        disclaimer: data.disclaimer || '',
      };

      if (initialData) {
        console.log("Updating existing query...");
        const response = await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}`, formattedData);
        console.log("Update response:", response.data);
      } else {
        console.log("Creating new query...");
        const response = await axios.post(`/api/tourPackageQuery`, formattedData);
        console.log("Create response:", response.data);
      }

      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${params.tourPackageQueryId}`);
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success('Tour Package Query deleted.');
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }


  const handleActivitySelection = (selectedActivityId: string, itineraryIndex: number, activityIndex: number) => {
    const selectedActivityMaster = activitiesMaster?.find(activity => activity.id === selectedActivityId);

    if (selectedActivityMaster) {
      const updatedItineraries = [...form.getValues('itineraries')];
      updatedItineraries[itineraryIndex].activities[activityIndex] = {
        ...updatedItineraries[itineraryIndex].activities[activityIndex],

        activityTitle: selectedActivityMaster.activityMasterTitle || '',
        activityDescription: selectedActivityMaster.activityMasterDescription || '',
        activityImages: selectedActivityMaster.activityMasterImages?.map((image: { url: any }) => ({ url: image.url }))
      };
      form.setValue('itineraries', updatedItineraries);
    }
  };

  const handleSaveToMasterItinerary = async (itinerary: any) => {
    try {
      setLoading(true);

      // Prepare the data for saving to master itinerary
      const masterItineraryData = {
        itineraryMasterTitle: itinerary.itineraryTitle,
        itineraryMasterDescription: itinerary.itineraryDescription,
        locationId: itinerary.locationId,
        itineraryMasterImages: itinerary.itineraryImages,
        activities: itinerary.activities.map((activity: any) => ({
          activityTitle: activity.activityTitle,
          activityDescription: activity.activityDescription,
          activityImages: activity.activityImages,
          locationId: itinerary.locationId
        })),
        // Include any additional fields required by the API
        dayNumber: itinerary.dayNumber,
        days: itinerary.days,
        hotelId: itinerary.hotelId,
        numberofRooms: itinerary.numberofRooms,
        roomCategory: itinerary.roomCategory,
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.join('-') : ''
      };

      // Send to existing API endpoint
      const response = await axios.post('/api/itinerariesMaster', masterItineraryData);

      toast.success('Saved to Master Itinerary successfully!');
      console.log('Saved to master itinerary:', response.data);

    } catch (error: any) {
      console.error('Error saving to master itinerary:', error);
      toast.error(error.response?.data?.message || 'Failed to save to Master Itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <Heading title={title} description={description} />
          {initialData?.isFeatured && (
            <Badge variant="secondary" className="bg-green-500 text-white">Confirmed</Badge>
          )}
        </div>
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      <Separator className="mb-8" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {Object.keys(form.formState.errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 text-sm font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Please fix the following errors:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field} className="text-sm text-red-700">
                      {field}: {error?.message as string}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-8 w-full"> {/* Changed from grid-cols-7 to grid-cols-8 */}
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guests
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Dates
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex items-center gap-2">
                <ListPlus className="h-4 w-4" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="flights" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flights
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Policies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tourPackageTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Load from Tour Package</FormLabel>
                        <Popover open={openTemplate} onOpenChange={setOpenTemplate}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={!form.getValues('locationId')} // Disable if no location selected
                              >
                                {!form.getValues('locationId')
                                  ? "Select a location first"
                                  : tourPackages?.find((tourPackage) => tourPackage.id === field.value)?.tourPackageName || "Select Tour Package Template"
                                }
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search tour package..." />
                              <CommandEmpty>No tour package found.</CommandEmpty>
                              <CommandGroup>
                                {tourPackages
                                  ?.filter(tp => tp.locationId === form.getValues('locationId'))
                                  .map((tourPackage) => (
                                    <CommandItem
                                      value={tourPackage.tourPackageName ?? ''}
                                      key={tourPackage.id}
                                      onSelect={() => {
                                        handleTourPackageSelection(tourPackage.id);
                                        setOpenTemplate(false); // Close the popover after selection
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          tourPackage.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {tourPackage.tourPackageName}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          {!form.getValues('locationId')
                            ? "Please select a location first to view available tour packages"
                            : "Select an existing tour package to use as a template"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="associatePartnerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associate Partner</FormLabel>
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
                                    ? associatePartners.find((partner) => partner.id === field.value)?.name
                                    : "Select Associate Partner..."}
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search associate partner..." />
                                <CommandEmpty>No associate partner found.</CommandEmpty>
                                <CommandGroup>
                                  {associatePartners.map((partner) => (
                                    <CommandItem
                                      value={partner.name}
                                      key={partner.id}
                                      onSelect={() => {
                                        form.setValue("associatePartnerId", partner.id);
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          partner.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {partner.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Associate partner details will be automatically linked to this query
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <div className="text-sm">
                        {form.watch("associatePartnerId") ? (
                          <>
                            <div className="flex flex-col space-y-1">
                              <p className="text-muted-foreground">
                                Mobile: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.mobileNumber}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">
                            Select an associate partner to view contact details
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        {form.watch("associatePartnerId") ? (
                          <>
                            <div className="flex flex-col space-y-1">
                              <p className="text-muted-foreground">
                                Email: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.email || 'Not provided'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

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
                            Confirmed
                          </FormLabel>
                          <FormDescription>
                            Please Select Whether Query is confirmed or not ?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="tourPackageQueryNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Number</FormLabel>
                          <FormControl>
                            <Input
                              disabled={loading}
                              placeholder="Tour Package Query Number"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* add formfield for TourPackageQueryName */}
                    <FormField
                      control={form.control}
                      name="tourPackageQueryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Name<span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input
                              disabled={loading}
                              placeholder="Tour Package Query Name"
                              value={field.value}
                              onChange={field.onChange}
                              className={form.formState.errors.tourPackageQueryName ? "border-red-500" : ""}
                            />
                          </FormControl>
                          <FormMessage>
                            {form.formState.errors.tourPackageQueryName?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourPackageQueryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Type</FormLabel>
                          <FormControl>
                            <Select
                              disabled={loading}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                {field.value || 'Select Tour Package Query Type'}
                              </SelectTrigger>
                              <SelectContent>
                                {TOUR_PACKAGE_QUERY_TYPE_DEFAULT.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <FormField
                      control={form.control}
                      name="numDaysNight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Days/Night</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Number of Days/Night" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                  </div>
                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="transport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Transport" {...field} />
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
                            <Input disabled={loading} placeholder="Pickup Location" {...field} />
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
                            <Input disabled={loading} placeholder="Drop Location" {...field} />
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
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Additional remarks for the tour package"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Add any special notes or requirements for this tour package
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disclaimer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disclaimer</FormLabel>
                        <FormControl>
                          <JoditEditor
                            ref={editor}
                            value={field.value || DISCLAIMER_DEFAULT}
                            config={{
                              readonly: loading,
                            }}
                            onChange={(e) => field.onChange(e)}
                          />
                        </FormControl>
                        <FormDescription>
                          Legal disclaimers and important information for the client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add similar TabsContent sections for other tabs */}
            <TabsContent value="guests" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Guests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move guests form fields here */}
                  {/* //add formfield for numAdults */}
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Customer Name" {...field} />
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
                        <FormLabel>Customer Number</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Customer Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="numAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Adults</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Adults" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* //add formfield for numChildren */}
                  <FormField
                    control={form.control}
                    name="numChild5to12"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Children 5 to 12</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Children 5 to 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* //add formfield for numChildren */}
                  <FormField
                    control={form.control}
                    name="numChild0to5"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Children 0 to 5</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Children 0 to 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move location form fields here */}
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location<span className="text-red-500">*</span></FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground",
                                  form.formState.errors.locationId ? "border-red-500" : ""
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
                                      // Update location-dependent fields if needed
                                      if (useLocationDefaults.inclusions) {
                                        form.setValue('inclusions', parseJsonField(location.inclusions) || INCLUSIONS_DEFAULT);
                                      }
                                      if (useLocationDefaults.exclusions) {
                                        form.setValue('exclusions', parseJsonField(location.exclusions) || EXCLUSIONS_DEFAULT);
                                      }
                                      if (useLocationDefaults.importantNotes) {
                                        form.setValue('importantNotes', parseJsonField(location.importantNotes) || IMPORTANT_NOTES_DEFAULT);
                                      }
                                      if (useLocationDefaults.paymentPolicy) {
                                        form.setValue('paymentPolicy', parseJsonField(location.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
                                      }
                                      if (useLocationDefaults.usefulTip) {
                                        form.setValue('usefulTip', parseJsonField(location.usefulTip) || USEFUL_TIPS_DEFAULT);
                                      }
                                      if (useLocationDefaults.cancellationPolicy) {
                                        form.setValue('cancellationPolicy', parseJsonField(location.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
                                      }
                                      if (useLocationDefaults.airlineCancellationPolicy) {
                                        form.setValue('airlineCancellationPolicy', parseJsonField(location.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
                                      }
                                      if (useLocationDefaults.termsconditions) {
                                        form.setValue('termsconditions', parseJsonField(location.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
                                      }
                                      const currentItineraries = form.getValues('itineraries');
                                      const updatedItineraries = currentItineraries.map(itinerary => ({
                                        ...itinerary,
                                        locationId: location.id
                                      }));
                                      form.setValue('itineraries', updatedItineraries);

                                      // Update activities locationId within itineraries
                                      const updatedItinerariesWithActivities = updatedItineraries.map(itinerary => ({
                                        ...itinerary,
                                        activities: itinerary.activities?.map(activity => ({
                                          ...activity,
                                          locationId: location.id
                                        })) || []
                                      }));
                                      form.setValue('itineraries', updatedItinerariesWithActivities);
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
                        <FormMessage>
                          {form.formState.errors.locationId?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move dates form fields here */}
                  <FormField
                    control={form.control}
                    name="tourStartsFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tour Starts From</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tourEndsOn"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tour Ends On</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListPlus className="h-5 w-5" />
                    Itinerary Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="itineraries"
                    render={({ field: { value = [], onChange } }) => (
                      <FormItem>
                        <div className="space-y-4">
                          {/* Move existing itinerary form fields here */}
                          {value.map((itinerary, index) => (
                            <Accordion key={index} type="single" collapsible className="w-full border rounded-lg">
                              <AccordionItem value={`item-${index}`}>
                                <AccordionTrigger>
                                  <div className="font-bold mb-2" dangerouslySetInnerHTML={{
                                    __html: `Day ${index + 1}: ${itinerary.itineraryTitle || ''}`,
                                  }}></div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="md:grid md:grid-cols-2 gap-8">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "w-[200px] justify-between",
                                              !itinerary.itineraryTitle && "text-muted-foreground"
                                            )}
                                            disabled={loading}
                                          >
                                            {itinerary.itineraryTitle
                                              ? (itinerariesMaster && itinerariesMaster.find(
                                                (itineraryMaster) => itinerary.itineraryTitle === itineraryMaster.itineraryMasterTitle
                                              )?.itineraryMasterTitle)
                                              : "Select an Itinerary Master"}
                                            <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[200px] p-0 max-h-[10rem] overflow-auto">
                                        <Command>
                                          <CommandInput
                                            placeholder="Search itinerary master..."
                                            className="h-9"
                                          />
                                          <CommandEmpty>No itinerary master found.</CommandEmpty>
                                          <CommandGroup>
                                            {itinerariesMaster && itinerariesMaster.map((itineraryMaster) => (
                                              <CommandItem
                                                value={itineraryMaster.itineraryMasterTitle ?? ''}
                                                key={itineraryMaster.id}
                                                onSelect={() => {
                                                  const updatedItineraries = [...value];
                                                  updatedItineraries[index] = {
                                                    ...updatedItineraries[index],
                                                    itineraryTitle: itineraryMaster.itineraryMasterTitle || '',
                                                    itineraryDescription: itineraryMaster.itineraryMasterDescription || '',
                                                    itineraryImages: itineraryMaster.itineraryMasterImages?.map((image) => ({ url: image.url })) || [],
                                                    activities: itineraryMaster.activities?.map(activity => ({
                                                      activityTitle: activity.activityTitle || '',
                                                      activityDescription: activity.activityDescription || '',
                                                      activityImages: activity.activityImages?.map(image => ({ url: image.url })) || [],
                                                    })) || [],
                                                  };
                                                  onChange(updatedItineraries); // Update the state with the new itineraries
                                                }}
                                              >
                                                {itineraryMaster.itineraryMasterTitle}
                                                <CheckIcon
                                                  className={cn(
                                                    "ml-auto h-4 w-4",
                                                    itineraryMaster.locationId === itinerary.locationId
                                                      ? "opacity-100"
                                                      : "opacity-0"
                                                  )}
                                                />
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>

                                    <FormItem>
                                      <FormLabel>Day {index + 1}</FormLabel>
                                      <FormControl>
                                        <Input
                                          disabled={loading}
                                          type="number"
                                          value={itinerary.dayNumber}
                                          onChange={(e) => {
                                            const dayNumber = Number(e.target.value);
                                            const newItineraries = [...value];
                                            newItineraries[index] = { ...itinerary, dayNumber: dayNumber };
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>

                                    <FormItem>
                                      <FormLabel>Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Day"
                                          disabled={loading}

                                          value={itinerary.days}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index] = { ...itinerary, days: e.target.value };
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>

                                    <ImageUpload
                                      value={itinerary.itineraryImages?.map((image) => image.url) || []}
                                      disabled={loading}
                                      onChange={(newItineraryUrl) => {
                                        const updatedImages = [...itinerary.itineraryImages, { url: newItineraryUrl }];
                                        // Update the itinerary with the new images array
                                        const updatedItineraries = [...value];
                                        updatedItineraries[index] = { ...itinerary, itineraryImages: updatedImages };
                                        onChange(updatedItineraries);
                                      }}
                                      onRemove={(itineraryURLToRemove) => {
                                        // Filter out the image to remove
                                        const updatedImages = itinerary.itineraryImages.filter((image) => image.url !== itineraryURLToRemove);
                                        // Update the itinerary with the new images array
                                        const updatedItineraries = [...value];
                                        updatedItineraries[index] = { ...itinerary, itineraryImages: updatedImages };
                                        onChange(updatedItineraries);
                                      }}
                                    />



                                    <FormItem>
                                      <FormLabel>Title</FormLabel>
                                      <FormControl>
                                        <JoditEditor
                                          ref={editor}
                                          value={itinerary.itineraryTitle || ''}
                                          onChange={(e) => {
                                            const newItineraries = [...value]
                                            newItineraries[index] = { ...itinerary, itineraryTitle: e }
                                            onChange(newItineraries)
                                          }} />
                                      </FormControl>
                                    </FormItem>

                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <JoditEditor
                                          ref={editor}
                                          value={itinerary.itineraryDescription || ''}
                                          onChange={(e) => {
                                            const newItineraries = [...value]
                                            newItineraries[index] = { ...itinerary, itineraryDescription: e }
                                            onChange(newItineraries)
                                          }} />
                                      </FormControl>
                                    </FormItem>

                                    <FormItem className="flex flex-col">
                                      <FormLabel>Hotel</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              className={cn(
                                                "w-[200px] justify-between",
                                                !itinerary.hotelId && "text-muted-foreground"
                                              )}
                                              disabled={loading}
                                            >
                                              {itinerary.hotelId
                                                ? hotels.find(
                                                  (hotel) => hotel.id === itinerary.hotelId
                                                )?.name
                                                : "Select a Hotel"}
                                              <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0 max-h-[10rem] overflow-auto">
                                          <Command>
                                            <CommandInput
                                              placeholder="Search hotel..."
                                              className="h-9"
                                            />
                                            <CommandEmpty>No hotel found.</CommandEmpty>
                                            <CommandGroup>
                                              {[...hotels.filter(hotel => hotel.locationId === itinerary.locationId || hotel.id === 'cdd32e64-4fc4-4784-9f46-507611eb0168')
                                              ].map((hotel) => (
                                                <CommandItem
                                                  value={hotel.name}
                                                  key={hotel.id}
                                                  onSelect={() => {
                                                    const newItineraries = [...value];
                                                    newItineraries[index] = {
                                                      ...itinerary,
                                                      hotelId: hotel.id
                                                    };
                                                    onChange(newItineraries); // Update the state with the new itineraries
                                                  }}
                                                >
                                                  {hotel.name}
                                                  <CheckIcon
                                                    className={cn(
                                                      "ml-auto h-4 w-4",
                                                      hotel.id === itinerary.hotelId
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                    )}
                                                  />
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                    <FormItem>
                                      <FormLabel>Number of Rooms</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Number of Rooms"
                                          disabled={loading}

                                          value={itinerary.numberofRooms}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index] = { ...itinerary, numberofRooms: e.target.value };
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>                                    {/* Room Type, Room Category, Meal Plan, and Occupancy Type fields removed - now handled by Room Allocation component */}                                    {/* Meal plan checkboxes removed - now handled by Room Allocation component */}
                                    
                                    {/* Vehicle Type field removed - now handled by Transport Details component */}

                                    <RoomAllocationComponent
                                      itinerary={itinerary}
                                      index={index}
                                      value={value}
                                      onChange={onChange}
                                      loading={loading}
                                    />

                                    <TransportDetailsComponent
                                      itinerary={itinerary}
                                      index={index}
                                      value={value}
                                      onChange={onChange}
                                      loading={loading}
                                    />

                                    {itinerary.activities.map((activity, activityIndex) => (
                                      <div key={activityIndex} className="space-y-2">
                                        <Select
                                          disabled={loading}
                                          onValueChange={(selectedActivityId) =>
                                            handleActivitySelection(selectedActivityId, index, activityIndex)
                                          }
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select an Activity" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {activitiesMaster?.map((activityMaster: { id: string; activityMasterTitle: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined }) => (
                                              <SelectItem key={activityMaster.id}
                                                value={activityMaster.id}>
                                                {activityMaster.activityMasterTitle}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormItem>
                                          <FormLabel>Activity Title</FormLabel>
                                          <FormControl>
                                            <JoditEditor
                                              ref={editor}
                                              value={activity.activityTitle || ''}
                                              onChange={(e) => {
                                                const newItineraries = [...value]
                                                newItineraries[index].activities[activityIndex] = { ...activity, activityTitle: e }
                                                onChange(newItineraries)
                                              }} />
                                          </FormControl>
                                        </FormItem>

                                        <FormItem>
                                          <FormLabel>Activity Description</FormLabel>
                                          <FormControl>

                                            <JoditEditor
                                              ref={editor}
                                              value={activity.activityDescription || ''}
                                              onChange={(e) => {
                                                const newItineraries = [...value]
                                                newItineraries[index].activities[activityIndex] = { ...activity, activityDescription: e }
                                                onChange(newItineraries)
                                              }} />

                                          </FormControl>
                                        </FormItem>


                                        <ImageUpload
                                          value={activity.activityImages?.map((image) => image.url)}
                                          disabled={loading}
                                          onChange={(newActivityURL) => {
                                            // Add new image URL to the activity's images
                                            const updatedImages = [...activity.activityImages, { url: newActivityURL }];
                                            // Update the specific activity in the itinerary
                                            const updatedActivities = [...itinerary.activities];
                                            updatedActivities[activityIndex] = { ...activity, activityImages: updatedImages };

                                            // Update the specific itinerary in the itineraries array
                                            const updatedItineraries = [...value];
                                            updatedItineraries[index] = { ...itinerary, activities: updatedActivities };
                                            onChange(updatedItineraries);
                                          }}
                                          onRemove={(activityURLToRemove) => {
                                            // Filter out the image to remove
                                            const updatedImages = activity.activityImages.filter((image) => image.url !== activityURLToRemove);
                                            // Update the specific activity in the itinerary
                                            const updatedActivities = [...itinerary.activities];
                                            updatedActivities[activityIndex] = { ...activity, activityImages: updatedImages };

                                            // Update the specific itinerary in the itineraries array
                                            const updatedItineraries = [...value];
                                            updatedItineraries[index] = { ...itinerary, activities: updatedActivities };
                                            onChange(updatedItineraries);
                                          }}
                                        />


                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            const newItineraries = [...value];
                                            newItineraries[index].activities = newItineraries[index].activities.filter((_, idx) => idx !== activityIndex);
                                            onChange(newItineraries);
                                          }}
                                        >
                                          Remove Activity
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const newItineraries = [...value];
                                        newItineraries[index].activities = [...newItineraries[index].activities, { activityImages: [], activityTitle: '', activityDescription: '' }];
                                        onChange(newItineraries);
                                      }}
                                    >
                                      Add Activity
                                    </Button>



                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        const newItineraries = value.filter((_, i) => i !== index);
                                        onChange(newItineraries);
                                      }}
                                    >
                                      Remove Itinerary for Day {index + 1}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="ml-2"
                                      onClick={() => handleSaveToMasterItinerary(itinerary)}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Save to Master Itinerary
                                    </Button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            className="mt-4"
                            onClick={() => onChange([...value, {
                              dayNumber: 0,
                              days: '',
                              itineraryImages: [],
                              itineraryTitle: '',
                              itineraryDescription: '',
                              activities: [],
                              mealsIncluded: [],
                              hotelId: '',
                              numberofRooms: '',
                              roomCategory: '',
                              locationId: form.getValues('locationId') || ''
                            }])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Day
                          </Button>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flights" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Flights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move flights form fields here */}
                  <FormField
                    control={form.control}
                    name="flightDetails"
                    render={({ field: { value = [], onChange } }) => (
                      <FormItem>
                        <FormLabel>Create Flight Plan</FormLabel>
                        {
                          value.map((flight, index) => (

                            <div key={index} className="grid grid-cols-3 gap-8">
                              <FormControl>
                                <Input
                                  placeholder="Date"
                                  disabled={loading}
                                  value={flight.date}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, date: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Name"
                                  disabled={loading}
                                  value={flight.flightName}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightName: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Number"
                                  disabled={loading}
                                  value={flight.flightNumber}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightNumber: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="From"
                                  disabled={loading}
                                  value={flight.from}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, from: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>

                                <Input
                                  placeholder="To"
                                  disabled={loading}
                                  value={flight.to}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, to: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>

                                <Input
                                  placeholder="Departure Time"
                                  disabled={loading}
                                  value={flight.departureTime}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value]; // Ensure this is your state array
                                    newFlightDetails[index] = { ...flight, departureTime: e.target.value };
                                    onChange(newFlightDetails);
                                  }}

                                />

                              </FormControl>
                              <FormControl>

                                <Input
                                  placeholder="Arrival Time"
                                  disabled={loading}
                                  value={flight.arrivalTime}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, arrivalTime: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Duration"
                                  disabled={loading}
                                  value={flight.flightDuration}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightDuration: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>


                              <FormControl>
                                <Button

                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => {
                                    const newFlightDetails = value.filter((_, i) => i != index);
                                    onChange(newFlightDetails);
                                  }}>
                                  Remove Flight
                                </Button>
                              </FormControl>
                            </div>
                          ))}
                        <FormControl>
                          <Button type="button" size="sm"
                            disabled={loading}
                            onClick={() => onChange([...value, { date: '', flightName: '', flightNumber: '', from: '', to: '', departureTime: '', arrivalTime: '', flightDuration: '' }])}
                          >
                            Add Flight
                          </Button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto-calculate pricing section */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Package Pricing</h3>
                    <AutoCalculatePriceButton form={form} hotels={hotels} />
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <FormField
                      control={form.control}
                      name="totalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Price</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Total Price" {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Dynamic Pricing Options</h3>
                    <FormField
                      control={form.control}
                      name="pricingSection"
                      render={() => (
                        <FormItem>
                          {/* Add column headers */}
                          <div className="grid grid-cols-3 gap-4 mb-2 px-1">
                            <div className="font-medium text-sm">Price Type</div>
                            <div className="font-medium text-sm">Price</div>
                            <div className="font-medium text-sm">Description (Optional)</div>
                          </div>
                          <div className="space-y-4">
                            {/* Use pricingFields from useFieldArray instead of field.value */}
                            {pricingFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-3 gap-4 items-end relative pr-20 pt-2 border-t border-gray-100 first:border-t-0">
                                <FormField
                                  control={form.control}
                                  name={`pricingSection.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g. Adult, Child, Infant"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`pricingSection.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g. 1000 (optional)"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`pricingSection.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem className="relative">
                                      <FormControl>
                                        <Input
                                          placeholder="e.g. Age 3-12, with bed"
                                          {...field}
                                        />
                                      </FormControl>
                                      <div className="absolute right-0 top-0 -mr-20 flex space-x-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAddPricingItem(index)}
                                          className="h-10 w-10"
                                          title="Insert row after this"
                                        >
                                          <Plus className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemovePricingItem(index)}
                                          className="h-10 w-10"
                                          title="Remove this row"
                                        >
                                          <Trash className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddPricingItem()}
                              className="mt-2"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Pricing Option
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Policies & Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="inclusions" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="inclusions">
                        <ListChecks className="h-4 w-4 mr-2" />
                        Inclusions
                      </TabsTrigger>
                      <TabsTrigger value="notes">
                        <FileText className="h-4 w-4 mr-2" />
                        Notes & Tips
                      </TabsTrigger>
                      <TabsTrigger value="cancellation">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Cancellation
                      </TabsTrigger>
                      <TabsTrigger value="terms">
                        <ScrollText className="h-4 w-4 mr-2" />
                        Terms
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inclusions" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="inclusions"
                          label="Inclusions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.inclusions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('inclusions', checked)}
                          description="Inclusions for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="exclusions"
                          label="Exclusions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.exclusions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('exclusions', checked)}
                          description="Exclusions for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="importantNotes"
                          label="Important Notes"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.importantNotes}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('importantNotes', checked)}
                          description="Important notes for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="usefulTip"
                          label="Useful Tips"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.usefulTip}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('usefulTip', checked)}
                          description="Useful tips for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="cancellation" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="cancellationPolicy"
                          label="General Cancellation Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.cancellationPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('cancellationPolicy', checked)}
                          description="Cancellation policy for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="airlineCancellationPolicy"
                          label="Airline Cancellation Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.airlineCancellationPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('airlineCancellationPolicy', checked)}
                          description="Airline cancellation policy for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="terms" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="paymentPolicy"
                          label="Payment Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.paymentPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('paymentPolicy', checked)}
                          description="Payment policy for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="termsconditions"
                          label="Terms and Conditions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.termsconditions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('termsconditions', checked)}
                          description="Terms and conditions for this tour package"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {action}
            </Button>
          </div>
        </form>
      </Form>

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}

// Transport Details Component for multiple vehicles
const TransportDetailsComponent = ({
  itinerary,
  index,
  value,
  onChange,
  loading
}: {
  itinerary: any;
  index: number;
  value: any[];
  onChange: (value: any[]) => void;
  loading: boolean;
}) => {
  // Initialize transportDetails array if it doesn't exist
  const transportDetails = itinerary.transportDetails || [];

  const handleAddVehicle = () => {
    const newTransportDetails = [...transportDetails, {
      vehicleType: '',
      quantity: 1,
      capacity: ''
    }];

    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    onChange(newItineraries);
  }; const handleRemoveVehicle = (vehicleIndex: number) => {
    const newTransportDetails: TransportDetailInput[] = transportDetails.filter((_: TransportDetailInput, i: number) => i !== vehicleIndex);

    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    onChange(newItineraries);
  };

  const updateVehicleDetail = (vehicleIndex: number, field: string, newValue: any) => {
    const newTransportDetails = [...transportDetails];
    newTransportDetails[vehicleIndex] = {
      ...newTransportDetails[vehicleIndex],
      [field]: field === 'quantity' ? parseInt(newValue) || 1 : newValue
    };

    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    onChange(newItineraries);
  };

  return (
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Transport Details</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddVehicle}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Vehicle
        </Button>
      </div>

      {transportDetails.length === 0 ? (
        <p className="text-sm text-gray-500">No vehicles added. Click &quot;Add Vehicle&quot; to add transport.</p>
      ) : (
        <div className="space-y-3">
          {transportDetails.map((vehicle: any, vehicleIndex: number) => (
            <div key={vehicleIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 py-2 border-b last:border-0">
              <div>
                <Select
                  disabled={loading}
                  value={vehicle.vehicleType || ''}
                  onValueChange={(newValue) => updateVehicleDetail(vehicleIndex, 'vehicleType', newValue)}
                >
                  <SelectTrigger>
                    {vehicle.vehicleType || 'Select Vehicle Type'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="Sedan">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Innova">Innova</SelectItem>
                    <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                    <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Luxury Van">Luxury Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  disabled={loading}
                  placeholder="Capacity (e.g., 4 Seater)"
                  value={vehicle.capacity || ''}
                  onChange={(e) => updateVehicleDetail(vehicleIndex, 'capacity', e.target.value)}
                />
              </div>

              <div>
                <Input
                  disabled={loading}
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={vehicle.quantity}
                  onChange={(e) => updateVehicleDetail(vehicleIndex, 'quantity', e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveVehicle(vehicleIndex)}
                  disabled={loading}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
