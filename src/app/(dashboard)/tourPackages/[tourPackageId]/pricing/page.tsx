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
  Trash 
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
  numPax: z.coerce.number({
    required_error: "Number of PAX is required",
    invalid_type_error: "Number of PAX must be a number",
  }).min(1, {
    message: "Number of PAX must be at least 1",
  }),
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

type PricingFormValues = z.infer<typeof pricingFormSchema>

export default function TourPackagePricingPage() {
  const params = useParams()
  const router = useRouter()
  const tourPackageId = params.tourPackageId as string
  
  const [tourPackage, setTourPackage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pricingPeriods, setPricingPeriods] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  // Add state variables for configuration items
  const [occupancyTypes, setOccupancyTypes] = useState<any[]>([])
  
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      occupancyTypeId: "",
      numPax: 1,
      tourPackagePrice: 0,
      isPromotional: false,
      promotionName: "",
      description: "",
    }
  })

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
      } finally {
        setLoading(false)
      }
    }

    fetchTourPackage()
    fetchPricingPeriods()
    fetchOccupancyTypes()
  }, [tourPackageId])

  const onSubmit = async (data: PricingFormValues) => {
    try {
      setLoading(true)
      
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
      
      // Reset the form
      form.reset({
        startDate: new Date(),
        endDate: new Date(),
        occupancyTypeId: "",
        numPax: 1,
        tourPackagePrice: 0,
        isPromotional: false,
        promotionName: "",
        description: "",
      })
      
      // Close the dialog
      setIsDialogOpen(false)
      setIsEditMode(false)
      setEditId(null)
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
        numPax: pricingPeriod.numPax,
        tourPackagePrice: pricingPeriod.tourPackagePrice,
        isPromotional: pricingPeriod.isPromotional,
        promotionName: pricingPeriod.promotionName || "",
        description: pricingPeriod.description || "",
      })
      
      setIsEditMode(true)
      setEditId(id)
      setIsDialogOpen(true)
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Tour Package Seasonal Pricing"
            description={`Manage pricing for ${tourPackage?.tourPackageName || 'this tour package'}`}
          />
          <Button onClick={() => {
            setIsEditMode(false)
            setEditId(null)
            form.reset({
              startDate: new Date(),
              endDate: new Date(),
              occupancyTypeId: "",
              numPax: 1,
              tourPackagePrice: 0,
              isPromotional: false,
              promotionName: "",
              description: "",
            })
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Pricing
          </Button>
        </div>
        <Separator />
        
        <div>
          {pricingPeriods.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500">No pricing periods found. Add one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Occupancy Type</TableHead>
                  <TableHead>PAX</TableHead>
                  <TableHead>Price</TableHead>
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
                    <TableCell>{period.numPax}</TableCell>
                    <TableCell>₹{period.tourPackagePrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {period.isPromotional ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          {period.promotionName || "Promo"}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="icon" onClick={() => onEdit(period.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="ml-2" onClick={() => onDelete(period.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "Edit Pricing Period" : "Add New Pricing Period"}
              </DialogTitle>
              <DialogDescription>
                Set the pricing for a specific period, occupancy type, and number of PAX.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                              disabled={(date) => date < new Date("1900-01-01")}
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
                              disabled={(date) => date < new Date("1900-01-01")}
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
                
                <FormField
                  control={form.control}
                  name="tourPackagePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormDescription>
                        The price for the tour package during this period.
                      </FormDescription>
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
                        <FormDescription>
                          A name for this promotion.
                        </FormDescription>
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
                          placeholder="Description or notes about this pricing..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {isEditMode ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
