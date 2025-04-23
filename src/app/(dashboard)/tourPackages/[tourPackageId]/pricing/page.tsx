"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { format } from "date-fns"
import { toast } from "react-hot-toast"
import { 
  CalendarIcon, 
  Check, 
  ChevronsUpDown, 
  Edit, 
  Plus, 
  Trash,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

// Define a schema for pricing components
const pricingComponentSchema = z.object({
  name: z.string(),
  price: z.string().optional(),
  description: z.string().optional(),
});

const pricingFormSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  occupancyTypeId: z.string({
    required_error: "Occupancy type is required",
  }),
  mealPlanId: z.string().optional(),
  numPax: z.coerce.number({
    required_error: "Number of PAX is required",
    invalid_type_error: "Number of PAX must be a number",
  }).min(1, {
    message: "Number of PAX must be at least 1",
  }),
  pricingComponents: z.array(pricingComponentSchema).optional(),
  tourPackagePrice: z.coerce.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }).min(0, {
    message: "Price must be at least 0",
  }),
  isPromotional: z.boolean().default(false),
  promotionName: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (values) => {
    // Simple check that end date is after start date
    return values.endDate >= values.startDate;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"], // This indicates which field has the error
  }
)

// We'll dynamically fetch pricing components from the API
// No hardcoded fallbacks - strictly using model values

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
  // Add state variables for configuration items
  const [occupancyTypes, setOccupancyTypes] = useState<any[]>([])
  const [mealPlans, setMealPlans] = useState<any[]>([])
  const [availablePricingComponents, setAvailablePricingComponents] = useState<any[]>([])
  
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      occupancyTypeId: "",
      mealPlanId: "",
      numPax: 1,
      tourPackagePrice: 0, // Always set to 0 since we're not using this field
      isPromotional: false,
      promotionName: "",
      description: "",
      pricingComponents: [], // Empty array - will be populated from API
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
      } catch (error) {
        toast.error("Failed to fetch tour package details")
        console.error(error)
      }
    }

    const fetchPricingPeriods = async () => {
      try {
        const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
        setPricingPeriods(response.data)
      } catch (error) {
        toast.error("Failed to fetch pricing periods")
        console.error(error)
      }
    }

    const fetchOccupancyTypes = async () => {
      try {
        const response = await axios.get('/api/occupancy-types')
        setOccupancyTypes(response.data)
      } catch (error) {
        toast.error("Failed to fetch occupancy types")
        console.error(error)
      }
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
    
    const fetchPricingComponents = async () => {
      try {
        const response = await axios.get('/api/pricing-components')
        const components = response.data
        
        if (components.length > 0) {
          setAvailablePricingComponents(components)
          
          // Update the form with the fetched components
          form.setValue('pricingComponents', components.map((comp: { name: string, price?: string, description?: string }) => ({
            name: comp.name,
            price: comp.price || '',
            description: comp.description || ''
          })))
        }
      } catch (error) {
        toast.error("Failed to fetch pricing components")
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchTourPackage()
    fetchPricingPeriods()
    fetchOccupancyTypes()
    fetchMealPlans()
    fetchPricingComponents()
  }, [tourPackageId, form])

  const onSubmit = async (data: PricingFormValues) => {
    try {
      setLoading(true)
      
      // Always set tourPackagePrice to 0 since we're focusing only on components
      data.tourPackagePrice = 0;
      
      if (isEditMode && editId) {
        // Update existing pricing period
        await axios.patch(`/api/tourPackages/${tourPackageId}/pricing/${editId}`, data)
        toast.success("Pricing period updated")
      } else {
        // Create new pricing period
        await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, data)
        toast.success("Pricing period created")
      }
      
      // Refresh the pricing periods
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
      setPricingPeriods(response.data)
      
      // Reset the form and UI state
      form.reset({
        startDate: new Date(),
        endDate: new Date(),
        occupancyTypeId: "",
        mealPlanId: "",
        numPax: 1,
        tourPackagePrice: 0,
        isPromotional: false,
        promotionName: "",
        description: "",
        pricingComponents: availablePricingComponents.map(comp => ({
          name: comp.name,
          price: comp.price || '',
          description: comp.description || ''
        })),
      })
      
      setIsEditMode(false)
      setEditId(null)
      setShowForm(false)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      setLoading(true)
      await axios.delete(`/api/tourPackages/${tourPackageId}/pricing/${id}`)
      toast.success("Pricing period deleted")
      
      // Refresh the pricing periods
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`)
      setPricingPeriods(response.data)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const onEdit = async (id: string) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing/${id}`)
      const pricingPeriod = response.data
      
      form.reset({
        startDate: new Date(pricingPeriod.startDate),
        endDate: new Date(pricingPeriod.endDate),
        occupancyTypeId: pricingPeriod.occupancyTypeId,
        mealPlanId: pricingPeriod.mealPlanId || "",
        numPax: pricingPeriod.numPax,
        tourPackagePrice: 0, // Always set to 0 since we're focusing only on components
        isPromotional: pricingPeriod.isPromotional,
        promotionName: pricingPeriod.promotionName || "",
        description: pricingPeriod.description || "",
        pricingComponents: pricingPeriod.pricingComponents?.length > 0 
          ? pricingPeriod.pricingComponents 
          : availablePricingComponents.map(comp => ({
              name: comp.name,
              price: comp.price || '',
              description: comp.description || ''
            })),
      })
      
      setIsEditMode(true)
      setEditId(id)
      setShowForm(true)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const addComponent = () => {
    append({ name: "", price: "", description: "" });
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Pricing Components"
            description={`Manage component-based pricing for ${tourPackage?.tourPackageName || 'this tour package'}`}
          />
          {!showForm && (
            <Button onClick={() => {
              setIsEditMode(false)
              setEditId(null)
              form.reset({
                startDate: new Date(),
                endDate: new Date(),
                occupancyTypeId: "",
                mealPlanId: "",
                numPax: 1,
                tourPackagePrice: 0,
                isPromotional: false,
                promotionName: "",
                description: "",
                pricingComponents: availablePricingComponents.map(comp => ({
                  name: comp.name,
                  price: comp.price || '',
                  description: comp.description || ''
                })),
              })
              setShowForm(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Pricing
            </Button>
          )}
        </div>
        <Separator />
        
        {/* Pricing Form - Only shown when adding/editing */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{isEditMode ? "Edit Pricing Components" : "Add New Pricing Components"}</CardTitle>
              <CardDescription>
                Define a set of pricing components for this tour package for a specific period and occupancy type.
              </CardDescription>
            </CardHeader>
            <CardContent>              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Hidden tourPackagePrice field - required by schema but not shown */}
                  <FormField
                    control={form.control}
                    name="tourPackagePrice"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="number" {...field} value={0} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Basic Details - First Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Period & Occupancy</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
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
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
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
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="occupancyTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Occupancy Type</FormLabel>
                              <Select 
                                disabled={loading} 
                                onValueChange={field.onChange} 
                                value={field.value}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an occupancy type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {occupancyTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="numPax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of PAX</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} {...field} />
                              </FormControl>
                              <FormDescription>
                                The number of passengers for this pricing.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Additional Details</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="mealPlanId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meal Plan (Optional)</FormLabel>
                              <Select 
                                disabled={loading} 
                                onValueChange={field.onChange} 
                                value={field.value}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a meal plan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {mealPlans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      {plan.name} ({plan.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isPromotional"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => field.onChange(checked === "indeterminate" ? false : checked)}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Promotional Price
                                </FormLabel>
                                <FormDescription>
                                  Mark this as a promotional or special offer price.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("isPromotional") && (
                          <FormField
                            control={form.control}
                            name="promotionName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Promotion Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Summer Special" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Additional notes about these pricing components..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>                  </div>
                  
                  {/* Pricing Components Section - Now below basic details */}
                  <div className="mb-6">
                    <h3 className="text-xl font-medium mb-2">Pricing Components</h3>
                    <p className="text-muted-foreground mb-4">
                      Define the pricing components for this tour package. Each component represents a specific pricing element.
                    </p>
                    <div className="border rounded-md p-4 space-y-4">
                      {fields.map((component, index) => (
                        <div key={component.id} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-5">
                            <FormField
                              control={form.control}
                              name={`pricingComponents.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Component Name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name={`pricingComponents.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Price" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-3">
                            <FormField
                              control={form.control}
                              name={`pricingComponents.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="icon" 
                              onClick={() => remove(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addComponent}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Component
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setIsEditMode(false)
                        setEditId(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {isEditMode ? "Update Pricing Components" : "Create Pricing Components"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {/* Table of existing pricing periods */}
        <div>
          {pricingPeriods.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500">No pricing components found. Add one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Occupancy Type</TableHead>
                  <TableHead>Meal Plan</TableHead>
                  <TableHead>PAX</TableHead>
                  <TableHead>Pricing Components</TableHead>
                  <TableHead>Promotion</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      {format(new Date(period.startDate), "d MMM yyyy")} - {format(new Date(period.endDate), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>{period.occupancyType?.name || "Unknown"}</TableCell>
                    <TableCell>{period.mealPlan ? `${period.mealPlan.name} (${period.mealPlan.code})` : "-"}</TableCell>
                    <TableCell>{period.numPax}</TableCell>
                    <TableCell>
                      {period.pricingComponents?.length ? (
                        <div className="flex flex-wrap gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEdit(period.id)}
                          >
                            {period.pricingComponents.length} components
                          </Button>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {period.isPromotional ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {period.promotionName || "Promo"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => onEdit(period.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => onDelete(period.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
