"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { format } from "date-fns"
import { formatLocalDate, createDatePickerValue, normalizeApiDate, utcToLocal } from "@/lib/timezone-utils"
import { toast } from "react-hot-toast"
import { 
  CalendarIcon, 
  Check, 
  ChevronsUpDown, 
  Edit, 
  Plus, 
  Trash,
  X,
  MapPin,
  Sparkles,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  getSeasonColor, 
  formatSeasonalPeriod, 
  generateDateRangesForYear,
  type SeasonalPeriod 
} from "@/lib/seasonal-periods"

import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Badge } from "@/components/ui/badge"

// Define a schema for pricing components using the new model structure
const pricingComponentSchema = z.object({
  pricingAttributeId: z.string({
    required_error: "Pricing attribute is required",
  }),
  price: z.coerce.number().min(0, {
    message: "Sales price must be at least 0",
  }),
  purchasePrice: z.coerce.number().min(0, {
    message: "Purchase price must be at least 0",
  }).optional(),
  transportation: z.string().optional(),
  description: z.string().optional(),
});

const pricingFormSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  mealPlanId: z.string({
    required_error: "Meal plan is required",
  }),
  numberOfRooms: z.coerce.number({
    required_error: "Number of rooms is required",
    invalid_type_error: "Number of rooms must be a number",
  }).min(1, {
    message: "Number of rooms must be at least 1",
  }),
  locationSeasonalPeriodId: z.string().optional(),
  pricingComponents: z.array(pricingComponentSchema),
  description: z.string().optional(),
  isGroupPricing: z.boolean().default(false),
}).refine(
  (values) => {
    // Simple check that end date is after start date
    return values.endDate >= values.startDate;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
)

type PricingFormValues = z.infer<typeof pricingFormSchema>

export default function TourPackagePricingPage() {
  const params = useParams()
  const router = useRouter()
  const tourPackageId = params.tourPackageId as string
  
  const [tourPackage, setTourPackage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pricingPeriods, setPricingPeriods] = useState<any[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
    // Configuration items
  const [mealPlans, setMealPlans] = useState<any[]>([])
  const [pricingAttributes, setPricingAttributes] = useState<any[]>([])
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriod[]>([])
  const [selectedSeasonalPeriods, setSelectedSeasonalPeriods] = useState<SeasonalPeriod[]>([])
  const [selectedSeasonType, setSelectedSeasonType] = useState<string | null>(null)
    const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      mealPlanId: "",
      numberOfRooms: 1,
      locationSeasonalPeriodId: "",
      description: "",
      pricingComponents: [],
      isGroupPricing: false,
    }
  })
  
  // Setup field array for pricing components
  const { fields, append, remove } = useFieldArray({
    name: "pricingComponents",
    control: form.control
  });

  useEffect(() => {
    const fetchTourPackage = async () => {
      try {
        const response = await axios.get(`/api/tourPackages/${tourPackageId}`)
        setTourPackage(response.data)
        
        // Fetch seasonal periods for this tour package's location
        if (response.data.locationId) {
          await fetchSeasonalPeriods(response.data.locationId)
        }
      } catch (error) {
        toast.error("Failed to fetch tour package details")
        console.error(error)
      }
    }
    
    const fetchSeasonalPeriods = async (locationId: string) => {
      try {
        const response = await axios.get(`/api/locations/${locationId}/seasonal-periods`)
        setSeasonalPeriods(response.data)
      } catch (error) {
        console.error("Failed to fetch seasonal periods:", error)
        // Not a critical error, just log it
      }
    }
    
    const fetchPricingPeriods = async () => {
      try {
        const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
        console.log('Fetched pricing periods from API:', response.data);
        
        // Debug individual periods
        response.data.forEach((period: any, index: number) => {
          console.log(`Period ${index}:`, {
            id: period.id,
            startDate: period.startDate,
            endDate: period.endDate,
            startDateConverted: utcToLocal(period.startDate),
            endDateConverted: utcToLocal(period.endDate)
          });
        });
        
        setPricingPeriods(response.data)
      } catch (error) {
        toast.error("Failed to fetch pricing periods")
        console.error(error)      }
    }
    
    const fetchMealPlans = async () => {
      try {
        const response = await axios.get('/api/meal-plans')
        setMealPlans(response.data)
      } catch (error) {
        toast.error("Failed to fetch meal plans")
        console.error(error)
      }
    }
      const fetchPricingAttributes = async () => {
      try {
        // Only fetch active pricing attributes
        const response = await axios.get('/api/pricing-attributes?isActive=true')
        setPricingAttributes(response.data)
      } catch (error) {
        toast.error("Failed to fetch pricing attributes")
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
      fetchTourPackage()
    fetchPricingPeriods()
    fetchMealPlans()
    fetchPricingAttributes()
  }, [tourPackageId])

  const onSubmit = async (data: PricingFormValues) => {
    try {
      setLoading(true)
      
      // Debug logging
      console.log('Original form data:', data);
      console.log('Selected seasonal periods:', selectedSeasonalPeriods);
      
      if (isEditMode && editId) {
        // For edit mode, handle single period update
        const normalizedData = {
          ...data,
          startDate: normalizeApiDate(data.startDate),
          endDate: normalizeApiDate(data.endDate)
        };
        
        await axios.patch(`/api/tourPackages/${tourPackageId}/pricing/${editId}`, normalizedData)
        toast.success("Pricing period updated successfully")
      } else {
        // For create mode, check if bulk period creation is needed
        if (selectedSeasonalPeriods.length > 1) {
          // Bulk creation for multiple seasonal periods
          const currentYear = new Date().getFullYear()
          let createdCount = 0
          
          for (const period of selectedSeasonalPeriods) {
            const dateRanges = generateDateRangesForYear(period, currentYear)
            
            for (const dateRange of dateRanges) {
              const periodData = {
                ...data,
                startDate: normalizeApiDate(dateRange.start),
                endDate: normalizeApiDate(dateRange.end),
                locationSeasonalPeriodId: period.id,
                description: data.description || `${period.name} pricing`
              };
              
              await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, periodData)
              createdCount++
            }
          }
          
          toast.success(`Created ${createdCount} pricing periods for ${selectedSeasonType?.replace('_', ' ').toLowerCase()} periods`)
        } else if (selectedSeasonalPeriods.length === 1) {
          // Single period creation
          const period = selectedSeasonalPeriods[0]
          const currentYear = new Date().getFullYear()
          const dateRanges = generateDateRangesForYear(period, currentYear)
          
          if (dateRanges.length > 0) {
            const dateRange = dateRanges[0]
            const normalizedData = {
              ...data,
              startDate: normalizeApiDate(dateRange.start),
              endDate: normalizeApiDate(dateRange.end),
              locationSeasonalPeriodId: period.id
            };
            
            await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, normalizedData)
            toast.success("Pricing period created successfully")
          }
        } else {
          // Manual date entry (no seasonal period selected)
          const normalizedData = {
            ...data,
            startDate: normalizeApiDate(data.startDate),
            endDate: normalizeApiDate(data.endDate)
          };
          
          await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, normalizedData)
          toast.success("Pricing period created successfully")
        }
      }
      
      // Reset form state
      setShowForm(false)
      setIsEditMode(false)
      setEditId(null)
      setSelectedSeasonalPeriods([])
      setSelectedSeasonType(null)
      form.reset()
      
      // Refresh pricing periods
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
      setPricingPeriods(response.data)
    } catch (error: any) {
      toast.error(error.response?.data || "Failed to save pricing period")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeasonTypeSelect = (seasonType: string) => {
    const periodsOfType = seasonalPeriods.filter(p => p.seasonType === seasonType)
    setSelectedSeasonalPeriods(periodsOfType)
    setSelectedSeasonType(seasonType)
    
    // Clear individual period selection in form for bulk operation
    form.setValue('locationSeasonalPeriodId', '')
    
    toast.success(`Selected all ${seasonType.replace('_', ' ').toLowerCase()} periods (${periodsOfType.length} periods)`)
  }

  const handleIndividualPeriodSelect = (period: SeasonalPeriod) => {
    setSelectedSeasonalPeriods([period])
    setSelectedSeasonType(null)
    
    // Generate date ranges for current year
    const currentYear = new Date().getFullYear()
    const dateRanges = generateDateRangesForYear(period, currentYear)
    
    if (dateRanges.length > 0) {
      const firstRange = dateRanges[0]
      form.setValue('startDate', firstRange.start)
      form.setValue('endDate', firstRange.end)
      form.setValue('locationSeasonalPeriodId', period.id)
      
      toast.success(`Applied ${period.name} dates`)
    }
  }

  const clearSeasonalPeriodSelection = () => {
    setSelectedSeasonalPeriods([])
    setSelectedSeasonType(null)
    form.setValue('locationSeasonalPeriodId', '')
    toast.success("Cleared seasonal period selection")
  }

  const handleEdit = async (pricingPeriod: any) => {    setIsEditMode(true)
    setEditId(pricingPeriod.id)
    setShowForm(true)
    
    // Map pricing components to the form schema structure
    const formattedPricingComponents = pricingPeriod.pricingComponents.map((comp: any) => ({
      pricingAttributeId: comp.pricingAttributeId,
      price: parseFloat(comp.price),
      purchasePrice: comp.purchasePrice ? parseFloat(comp.purchasePrice) : 0,
  transportation: comp.transportation || "",
      description: comp.description || "",
    }));

    form.reset({
      startDate: createDatePickerValue(utcToLocal(pricingPeriod.startDate)),
      endDate: createDatePickerValue(utcToLocal(pricingPeriod.endDate)),
      mealPlanId: pricingPeriod.mealPlanId || "",
      numberOfRooms: pricingPeriod.numberOfRooms || 1,
      locationSeasonalPeriodId: pricingPeriod.locationSeasonalPeriodId || "",
      description: pricingPeriod.description || "",
      pricingComponents: formattedPricingComponents,
      isGroupPricing: pricingPeriod.isGroupPricing || false,
    })

    // Set selected seasonal period if available
    if (pricingPeriod.locationSeasonalPeriodId) {
      const seasonalPeriod = seasonalPeriods.find(p => p.id === pricingPeriod.locationSeasonalPeriodId)
      setSelectedSeasonalPeriods(seasonalPeriod ? [seasonalPeriod] : [])
      setSelectedSeasonType(null)
    } else {
      setSelectedSeasonalPeriods([])
      setSelectedSeasonType(null)
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      await axios.delete(`/api/tourPackages/${tourPackageId}/pricing/${id}`)
      toast.success("Pricing period deleted successfully")
      
      // Refresh pricing periods
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
      setPricingPeriods(response.data)
    } catch (error) {
      toast.error("Failed to delete pricing period")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGroupPricing = async (period: any) => {
    try {
      setLoading(true);
      const newIsGroupPricing = !period.isGroupPricing;
      await axios.patch(`/api/tourPackages/${tourPackageId}/pricing/${period.id}`, {
        isGroupPricing: newIsGroupPricing,
      });
      toast.success(`Pricing period updated.`);
      // Refresh pricing periods to reflect the change
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`);
      setPricingPeriods(response.data);
    } catch (error) {
      toast.error("Failed to update pricing period.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = () => {
    // Only add if there are pricing attributes available
    if (pricingAttributes.length > 0) {
      append({
        pricingAttributeId: pricingAttributes[0].id,
        price: 0,
        purchasePrice: 0,
        transportation: "",
        description: "",
      })
    } else {
      toast.error("No pricing attributes available. Please create pricing attributes first.")
    }
  }

  // Helper function to find pricing attribute name by ID
  const getPricingAttributeName = (id: string) => {
    const attribute = pricingAttributes.find(attr => attr.id === id)
    return attribute ? attribute.name : "Unknown Attribute"
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading
          title="Seasonal Pricing"
          description={`Manage pricing for ${tourPackage?.tourPackageName || 'this tour package'}`}
        />
        
        {!showForm && (
          <Button onClick={() => {
            setIsEditMode(false)
            setEditId(null)
            setSelectedSeasonalPeriods([])
            setSelectedSeasonType(null)
            form.reset({
              startDate: new Date(),
              endDate: new Date(),
              mealPlanId: "",
              numberOfRooms: 1,
              locationSeasonalPeriodId: "",
              description: "",
              pricingComponents: [],
              isGroupPricing: false,
            })
            setShowForm(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pricing Period
          </Button>
        )}
      </div>
      
      <Separator className="my-4" />
      
      {/* Form for adding/editing pricing periods */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Pricing Period" : "Add New Pricing Period"}</CardTitle>
            <CardDescription>
              Define pricing for a specific date range based on number of rooms and meal plan
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Location Info and Seasonal Period Selection */}
                {tourPackage && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Location: {tourPackage.location?.label}
                        </span>
                        {seasonalPeriods.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/locations/${tourPackage.locationId}/seasonal-periods`)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage Periods
                          </Button>
                        )}
                      </div>
                      
                      {seasonalPeriods.length > 0 ? (
                        <div className="space-y-4">
                          {/* Season Type Bulk Selection */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-800">
                                Bulk Selection by Season Type:
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {['PEAK_SEASON', 'OFF_SEASON', 'SHOULDER_SEASON'].map((seasonType) => {
                                const periodsOfType = seasonalPeriods.filter(p => p.seasonType === seasonType)
                                if (periodsOfType.length === 0) return null
                                
                                const colors = getSeasonColor(seasonType as any)
                                const isSelected = selectedSeasonType === seasonType
                                
                                return (
                                  <Button
                                    key={seasonType}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
                                    onClick={() => handleSeasonTypeSelect(seasonType)}
                                  >
                                    All {seasonType.replace('_', ' ').toLowerCase()} periods
                                    <span className="ml-2 text-xs opacity-70">
                                      ({periodsOfType.length} periods)
                                    </span>
                                  </Button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Individual Period Selection */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">
                                Individual Period Selection:
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {seasonalPeriods.map((period) => {
                                const colors = getSeasonColor(period.seasonType)
                                const isSelected = selectedSeasonalPeriods.length === 1 && selectedSeasonalPeriods[0]?.id === period.id
                                
                                return (
                                  <Button
                                    key={period.id}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    className={`${colors.bg} ${colors.text} ${colors.border}`}
                                    onClick={() => handleIndividualPeriodSelect(period)}
                                  >
                                    {period.name}
                                    <span className="ml-2 text-xs opacity-70">
                                      ({formatSeasonalPeriod(period)})
                                    </span>
                                  </Button>
                                )
                              })}
                              
                              {selectedSeasonalPeriods.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearSeasonalPeriodSelection}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Selection Summary */}
                          {selectedSeasonalPeriods.length > 0 && (
                            <div className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-3 rounded-lg">
                              <div className="font-semibold text-gray-800 mb-2">
                                Selection Summary:
                              </div>
                              {selectedSeasonType ? (
                                <div className="text-purple-700">
                                  <strong>Bulk Selection:</strong> All {selectedSeasonType.replace('_', ' ').toLowerCase()} periods ({selectedSeasonalPeriods.length} periods)
                                  <div className="mt-2 text-xs text-purple-600">
                                    When you submit, pricing will be created for all these periods automatically.
                                  </div>
                                </div>
                              ) : (
                                <div className="text-blue-700">
                                  <strong>Individual Selection:</strong> {selectedSeasonalPeriods[0]?.name}
                                  {selectedSeasonalPeriods[0]?.description && (
                                    <span> - {selectedSeasonalPeriods[0].description}</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Period Date Details */}
                              <div className="mt-3 border-t border-gray-200 pt-2">
                                <div className="font-medium text-gray-700 mb-2">
                                  Selected Periods & Date Ranges:
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {selectedSeasonalPeriods.map((period, index) => {
                                    const currentYear = new Date().getFullYear()
                                    const startDate = new Date(currentYear, period.startMonth - 1, period.startDay)
                                    const endDate = new Date(currentYear, period.endMonth - 1, period.endDay)
                                    
                                    return (
                                      <div key={period.id} className="flex items-center justify-between text-xs bg-white/70 rounded px-2 py-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="w-4 h-4 text-center bg-gray-100 rounded text-[10px] font-medium">
                                            {index + 1}
                                          </span>
                                          <span className="font-medium text-gray-800">
                                            {period.name}
                                          </span>
                                        </div>
                                        <div className="text-gray-600 font-mono">
                                          {formatLocalDate(startDate, "MMM dd")} - {formatLocalDate(endDate, "MMM dd, yyyy")}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {selectedSeasonalPeriods.length > 3 && (
                                  <div className="text-[10px] text-gray-500 mt-1 text-center">
                                    Scroll to view all {selectedSeasonalPeriods.length} selected periods
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-blue-600">
                          <span>No seasonal periods defined for this location. </span>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-blue-600"
                            onClick={() => router.push(`/locations/${tourPackage.locationId}/seasonal-periods`)}
                          >
                            Create seasonal periods
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => {
                      const isDisabled = selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className={isDisabled ? "text-gray-400" : ""}>
                            Start Date
                            {isDisabled && (
                              <span className="text-xs text-gray-500 ml-2">(Auto-set from selected periods)</span>
                            )}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  disabled={isDisabled}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                    isDisabled && "cursor-not-allowed opacity-50"
                                  )}
                                >
                                  {field.value ? (
                                    formatLocalDate(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            {!isDisabled && (
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={createDatePickerValue(field.value)}
                                  onSelect={(date) => {
                                    console.log('Date selected in calendar:', date);
                                    console.log('Date type:', typeof date);
                                    console.log('Date toString:', date?.toString());
                                    if (date) field.onChange(date);
                                  }}
                                  // Removed date restriction to allow selecting past dates
                                  initialFocus
                                />
                              </PopoverContent>
                            )}
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                    {/* End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => {
                      const isDisabled = selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel className={isDisabled ? "text-gray-400" : ""}>
                            End Date
                            {isDisabled && (
                              <span className="text-xs text-gray-500 ml-2">(Auto-set from selected periods)</span>
                            )}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  disabled={isDisabled}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                    isDisabled && "cursor-not-allowed opacity-50"
                                  )}
                                >
                                  {field.value ? (
                                    formatLocalDate(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            {!isDisabled && (
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={createDatePickerValue(field.value)}
                                  onSelect={(date) => {
                                    console.log('End date selected in calendar:', date);
                                    console.log('End date type:', typeof date);
                                    console.log('End date toString:', date?.toString());
                                    if (date) field.onChange(date);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            )}
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                    {/* Number of Rooms */}
                  <FormField
                    control={form.control}
                    name="numberOfRooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Rooms</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Total number of rooms required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                  <div className="grid grid-cols-1 gap-4">
                  {/* Meal Plan */}
                  <FormField
                    control={form.control}
                    name="mealPlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Plan</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select meal plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mealPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* isGroupPricing Checkbox */}
                <FormField
                  control={form.control}
                  name="isGroupPricing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Group Pricing
                        </FormLabel>
                        <FormDescription>
                          Mark this pricing as applicable for group bookings.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Pricing Components Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Pricing Components</h3>
                    <Button 
                      type="button" 
                      onClick={handleAddComponent}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Component
                    </Button>
                  </div>
                    {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 border rounded">
                      No pricing components added. Click &quot;Add Component&quot; to add pricing components.
                    </p>
                  ) : (
                    <div className="border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pricing Attribute</TableHead>
                            <TableHead>Purchase Price</TableHead>
                            <TableHead>Sales Price</TableHead>
                            <TableHead>Transportation</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`pricingComponents.${index}.pricingAttributeId`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Select
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                          value={field.value}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select pricing attribute" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {pricingAttributes.map((attr) => (
                                              <SelectItem key={attr.id} value={attr.id}>
                                                {attr.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`pricingComponents.${index}.purchasePrice`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="Purchase Price"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`pricingComponents.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="Sales Price"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`pricingComponents.${index}.transportation`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input
                                          placeholder="Transportation"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`pricingComponents.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input
                                          placeholder="Enter description..."
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  onClick={() => remove(index)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setIsEditMode(false)
                      setEditId(null)
                      setSelectedSeasonalPeriods([])
                      setSelectedSeasonType(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {isEditMode ? "Update" : selectedSeasonalPeriods.length > 1 ? `Create ${selectedSeasonalPeriods.length} Pricing Periods` : "Create"} Pricing Period{selectedSeasonalPeriods.length > 1 ? 's' : ''}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {/* List of existing pricing periods (table layout) */}
      <div>
        <h2 className="text-xl font-bold mb-4">Pricing Periods</h2>

        {pricingPeriods.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground mb-4">No pricing periods defined yet.</p>
              <Button onClick={() => setShowForm(true)}>Add First Pricing Period</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Rooms</TableHead>
                  <TableHead>Meal Plan</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatLocalDate(utcToLocal(period.startDate) || new Date(), 'MMM dd, yyyy')} to {formatLocalDate(utcToLocal(period.endDate) || new Date(), 'MMM dd, yyyy')}
                        </div>
                        {period.isGroupPricing && (
                          <Badge variant="secondary" className="mt-1">Group Pricing</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {period.numberOfRooms || 1}
                    </TableCell>
                    <TableCell>
                      {period.mealPlan?.name || 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[700px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Purchase Price</TableHead>
                              <TableHead>Sales Price</TableHead>
                              <TableHead>Transportation</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {period.pricingComponents.map((comp: any) => (
                              <TableRow key={comp.id}>
                                <TableCell>{comp.pricingAttribute?.name || 'Unknown Component'}</TableCell>
                                <TableCell>
                                  {comp.purchasePrice ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(comp.purchasePrice)) : '-'}
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(comp.price))}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-700 max-w-[200px] truncate" title={comp.transportation || ''}>
                                    {comp.transportation || '-'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-600 max-w-[300px] truncate" title={comp.description || ''}>
                                    {comp.description || '-'}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {period.description && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Notes:</strong> {period.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(period)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant={period.isGroupPricing ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleToggleGroupPricing(period)}
                          disabled={loading}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {period.isGroupPricing ? "Unmark Group" : "Mark Group"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(period.id)}>
                          <Trash className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Back to Tour Package Button */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/tourPackages/${tourPackageId}`)}
        >
          Back to Tour Package
        </Button>
      </div>
    </div>
  )
}
