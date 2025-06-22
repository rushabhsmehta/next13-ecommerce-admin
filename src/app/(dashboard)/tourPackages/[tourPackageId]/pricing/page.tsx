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
    message: "Price must be at least 0",
  }),
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
  pricingComponents: z.array(pricingComponentSchema),
  description: z.string().optional(),
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
    const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      mealPlanId: "",
      numberOfRooms: 1,
      description: "",
      pricingComponents: [],
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
        setTourPackage(response.data)      } catch (error) {
        toast.error("Failed to fetch tour package details")
        console.error(error)
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
      console.log('Start date:', data.startDate);
      console.log('End date:', data.endDate);
      
      // Normalize dates for API submission
      const normalizedData = {
        ...data,
        startDate: normalizeApiDate(data.startDate),
        endDate: normalizeApiDate(data.endDate)
      };
      
      console.log('Normalized data:', normalizedData);
      console.log('Normalized start date:', normalizedData.startDate);
      console.log('Normalized end date:', normalizedData.endDate);
      
      if (isEditMode && editId) {
        await axios.patch(`/api/tourPackages/${tourPackageId}/pricing/${editId}`, normalizedData)
        toast.success("Pricing period updated successfully")
      } else {
        await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, normalizedData)
        toast.success("Pricing period created successfully")
      }
      
      // Reset form state
      setShowForm(false)
      setIsEditMode(false)
      setEditId(null)
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

  const handleEdit = async (pricingPeriod: any) => {    setIsEditMode(true)
    setEditId(pricingPeriod.id)
    setShowForm(true)
    
    // Map pricing components to the form schema structure
    const formattedPricingComponents = pricingPeriod.pricingComponents.map((comp: any) => ({
      pricingAttributeId: comp.pricingAttributeId,
      price: parseFloat(comp.price),
    }));

    form.reset({
      startDate: createDatePickerValue(utcToLocal(pricingPeriod.startDate)),
      endDate: createDatePickerValue(utcToLocal(pricingPeriod.endDate)),
      mealPlanId: pricingPeriod.mealPlanId || "",
      numberOfRooms: pricingPeriod.numberOfRooms || 1,
      description: pricingPeriod.description || "",
      pricingComponents: formattedPricingComponents,
    })

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

  const handleAddComponent = () => {
    // Only add if there are pricing attributes available
    if (pricingAttributes.length > 0) {
      append({
        pricingAttributeId: pricingAttributes[0].id,
        price: 0,
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
        
        {!showForm && (          <Button onClick={() => {
            setIsEditMode(false)
            setEditId(null)
            form.reset({
              startDate: new Date(),
              endDate: new Date(),
              mealPlanId: "",
              numberOfRooms: 1,
              description: "",
              pricingComponents: [],
            })
            setShowForm(true
            )
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
            <CardTitle>{isEditMode ? "Edit Pricing Period" : "Add New Pricing Period"}</CardTitle>            <CardDescription>
              Define pricing for a specific date range based on number of rooms and meal plan
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
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
                                  formatLocalDate(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">                            <Calendar
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
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    {/* End Date */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
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
                                  formatLocalDate(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">                            <Calendar
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
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
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
                  {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
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
                            <TableHead>Price</TableHead>
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
                                  name={`pricingComponents.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-0">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
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
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {isEditMode ? "Update" : "Create"} Pricing Period
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {/* List of existing pricing periods */}
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
          <div className="grid grid-cols-1 gap-4">
            {pricingPeriods.map((period) => (
              <Card key={period.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>                      <CardTitle className="text-lg">
                        {formatLocalDate(utcToLocal(period.startDate) || new Date(), 'MMM dd, yyyy')} to {formatLocalDate(utcToLocal(period.endDate) || new Date(), 'MMM dd, yyyy')}
                      </CardTitle>
                      <CardDescription>
                        <span className="font-medium">Number of Rooms:</span> {period.numberOfRooms || 1} | 
                        <span className="font-medium"> Meal Plan:</span> {period.mealPlan?.name || 'Not specified'}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(period.id)}
                      >
                        <Trash className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium mb-1">Pricing Components:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {period.pricingComponents.map((comp: any) => (
                            <TableRow key={comp.id}>
                              <TableCell>
                                {comp.pricingAttribute?.name || "Unknown Component"}
                              </TableCell>
                              <TableCell>
                                {new Intl.NumberFormat('en-IN', { 
                                  style: 'currency',
                                  currency: 'INR' 
                                }).format(parseFloat(comp.price))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {period.description && (
                      <div>
                        <h4 className="font-medium">Notes:</h4>
                        <p className="text-muted-foreground">{period.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
