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
import { utcToLocal } from "@/lib/timezone-utils"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Room types, occupancy types, and meal plans will be fetched from the database
// instead of using hardcoded arrays

const pricingFormSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  roomTypeId: z.string({
    required_error: "Room type is required",
  }),
  occupancyTypeId: z.string({
    required_error: "Occupancy type is required",
  }),  price: z.coerce.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }).min(0, {
    message: "Price must be at least 0",
  }),
  mealPlanId: z.string().optional(),
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

export default function HotelPricingPage() {
  const params = useParams()
  const router = useRouter()
  const hotelId = params.hotelId as string
  
  const [hotel, setHotel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pricingPeriods, setPricingPeriods] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  // Add state variables for configuration items
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [occupancyTypes, setOccupancyTypes] = useState<any[]>([])
  const [mealPlans, setMealPlans] = useState<any[]>([])
  
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      roomTypeId: "", // Changed from roomType to roomTypeId
      occupancyTypeId: "", // Changed from occupancyType to occupancyTypeId
      price: 0,
      mealPlanId: "", // Changed from mealPlan to mealPlanId
    }
  })
    useEffect(() => {
    const fetchHotel = async () => {
      try {
        const response = await axios.get(`/api/hotels/${hotelId}`)
        setHotel(response.data)
      } catch (error) {
        toast.error("Failed to fetch hotel details")
        console.error(error)
      }
    }
    
    const fetchPricingPeriods = async () => {
      try {
        const response = await axios.get(`/api/hotels/${hotelId}/pricing`)
        setPricingPeriods(response.data)
      } catch (error) {
        toast.error("Failed to fetch pricing periods")
        console.error(error)
      }
    }
    
    const fetchConfigurationData = async () => {
      try {
        // Fetch room types
        const roomTypesResponse = await axios.get('/api/room-types')
        setRoomTypes(roomTypesResponse.data.filter((rt: any) => rt.isActive))
        
        // Fetch occupancy types
        const occupancyTypesResponse = await axios.get('/api/occupancy-types')
        setOccupancyTypes(occupancyTypesResponse.data.filter((ot: any) => ot.isActive))
        
        // Fetch meal plans
        const mealPlansResponse = await axios.get('/api/meal-plans')
        setMealPlans(mealPlansResponse.data.filter((mp: any) => mp.isActive))
      } catch (error) {
        toast.error("Failed to fetch configuration data")
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchHotel()
    fetchPricingPeriods()
    fetchConfigurationData()
  }, [hotelId])
  
  const onSubmit = async (data: PricingFormValues) => {
    try {
      setLoading(true)
      
      if (isEditMode && editId) {
        // Update existing pricing period
        await axios.patch(`/api/hotels/${hotelId}/pricing/${editId}`, data)
        toast.success("Pricing period updated")
      } else {
        // Create new pricing period
        await axios.post(`/api/hotels/${hotelId}/pricing`, data)
        toast.success("Pricing period created")
      }
      
      // Refresh pricing periods
      const response = await axios.get(`/api/hotels/${hotelId}/pricing`)
      setPricingPeriods(response.data)
      
      // Reset form and close dialog
      setIsDialogOpen(false)
      setIsEditMode(false)
      setEditId(null)
      form.reset()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }
    const handleEdit = (pricing: any) => {    setIsEditMode(true)
    setEditId(pricing.id)
    form.setValue("startDate", utcToLocal(pricing.startDate) || new Date())
    form.setValue("endDate", utcToLocal(pricing.endDate) || new Date())
    // Properly handle the room type ID from the relation or direct field
    form.setValue("roomTypeId", pricing.roomTypeId)
    // Properly handle the occupancy type ID from the relation or direct field
    form.setValue("occupancyTypeId", pricing.occupancyTypeId)
    form.setValue("price", pricing.price)
    // Properly handle the meal plan ID from the relation or direct field
    form.setValue("mealPlanId", pricing.mealPlanId || "")
    setIsDialogOpen(true)
  }
  
  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      await axios.delete(`/api/hotels/${hotelId}/pricing/${id}`)
      toast.success("Pricing period deleted")
      
      // Refresh pricing periods
      const response = await axios.get(`/api/hotels/${hotelId}/pricing`)
      setPricingPeriods(response.data)
    } catch (error) {
      toast.error("Failed to delete pricing period")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title={`Pricing for ${hotel?.name || 'Hotel'}`}
            description="Manage seasonal pricing periods for this hotel"
          />
          <Button onClick={() => {
            setIsEditMode(false)
            setEditId(null)
            form.reset()
            setIsDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pricing Period
          </Button>
        </div>
        <Separator />
        
        <Card>
          <CardHeader>
            <CardTitle>Pricing Periods</CardTitle>
            <CardDescription>
              Set different prices for different periods, room types, and occupancy types
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <p>Loading pricing periods...</p>
              </div>
            ) : pricingPeriods.length === 0 ? (
              <div className="flex justify-center items-center h-24">
                <p className="text-muted-foreground">No pricing periods defined yet</p>
              </div>
            ) : (
              <Table>
                <TableCaption>List of pricing periods for this hotel</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Meal Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>                  {pricingPeriods.map((pricing) => (
                    <TableRow key={pricing.id}>
                      <TableCell>
                        {format(utcToLocal(pricing.startDate) || new Date(), "PPP")} to {format(utcToLocal(pricing.endDate) || new Date(), "PPP")}
                      </TableCell>
                      <TableCell>
                        {pricing.roomType?.name || 
                         (roomTypes.find(rt => rt.id === pricing.roomTypeId)?.name) ||
                         pricing.roomTypeId}
                      </TableCell>
                      <TableCell>
                        {pricing.occupancyType?.name || 
                         (occupancyTypes.find(ot => ot.id === pricing.occupancyTypeId)?.name) ||
                         pricing.occupancyTypeId}
                      </TableCell>
                      <TableCell>
                        {pricing.mealPlan?.code 
                          ? `${pricing.mealPlan.code} - ${pricing.mealPlan.name}`
                          : pricing.mealPlanId 
                            ? (mealPlans.find(mp => mp.id === pricing.mealPlanId)?.code || pricing.mealPlanId)
                            : "-"}
                      </TableCell>
                      <TableCell>₹{pricing.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pricing)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pricing.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Pricing Period" : "Add Pricing Period"}</DialogTitle>
              <DialogDescription>
                Define pricing for a specific period, room type, and occupancy type
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
                                  "pl-3 text-left font-normal",
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
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
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
                
                <div className="grid grid-cols-2 gap-4">                  <FormField
                    control={form.control}
                    name="roomTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roomTypes.map((roomType) => (
                              <SelectItem key={roomType.id} value={roomType.id}>
                                {roomType.name}
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
                    name="occupancyTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupancy Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select occupancy type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {occupancyTypes.map((occupancyType) => (
                              <SelectItem key={occupancyType.id} value={occupancyType.id}>
                                {occupancyType.name} (Max: {occupancyType.maxPersons} persons)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Price in INR per night
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                    control={form.control}
                    name="mealPlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Plan (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select meal plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No meal plan</SelectItem>
                            {mealPlans.map((mealPlan) => (
                              <SelectItem key={mealPlan.id} value={mealPlan.id}>
                                {mealPlan.code} - {mealPlan.name} ({mealPlan.description})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
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