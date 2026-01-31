"use client"

import { useState, useEffect, useCallback } from "react"
import axios, { AxiosError } from "axios"
import { format } from "date-fns"
import { formatLocalDate } from "@/lib/timezone-utils"
import { toast } from "react-hot-toast"
import { 
  CalendarIcon, 
  Edit, 
  Plus, 
  Trash,
  Hotel as HotelIcon
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

// TypeScript interfaces
interface Hotel {
  id: string;
  name: string;
  locationId: string;
  destinationId: string | null;
  location: {
    id: string;
    label: string;
  };
  destination?: {
    id: string;
    name: string;
  } | null;
}

interface RoomType {
  id: string;
  name: string;
  isActive: boolean;
}

interface OccupancyType {
  id: string;
  name: string;
  maxPersons: number;
  isActive: boolean;
}

interface MealPlan {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface PricingPeriod {
  id: string;
  hotelId: string;
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  roomType?: RoomType;
  occupancyType?: OccupancyType;
  mealPlan?: MealPlan | null;
}

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
  }),
  price: z.coerce.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }).min(0, {
    message: "Price must be at least 0",
  }),
  mealPlanId: z.string().optional(),
}).refine(
  (values) => {
    return values.endDate >= values.startDate;
  },
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
)

type PricingFormValues = z.infer<typeof pricingFormSchema>

interface HotelPricingClientProps {
  hotels: Hotel[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
}

export const HotelPricingClient: React.FC<HotelPricingClientProps> = ({
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans
}) => {
  const [selectedHotelId, setSelectedHotelId] = useState<string>("")
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(false)
  const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Helper function to format date ranges
  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = formatLocalDate(utcToLocal(startDate) || new Date(), "PPP")
    const end = formatLocalDate(utcToLocal(endDate) || new Date(), "PPP")
    return `${start} to ${end}`
  }

  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      roomTypeId: "",
      occupancyTypeId: "",
      price: 0,
      mealPlanId: "",
    }
  })

  const fetchPricingPeriods = useCallback(async () => {
    if (!selectedHotelId) return
    
    try {
      setLoading(true)
      const response = await axios.get(`/api/hotels/${selectedHotelId}/pricing`)
      setPricingPeriods(response.data)
    } catch (error) {
      toast.error("Failed to fetch pricing periods")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [selectedHotelId])

  // Fetch pricing when hotel is selected
  useEffect(() => {
    if (selectedHotelId) {
      const hotel = hotels.find(h => h.id === selectedHotelId)
      setSelectedHotel(hotel || null)
      fetchPricingPeriods()
    } else {
      setSelectedHotel(null)
      setPricingPeriods([])
    }
  }, [selectedHotelId, hotels, fetchPricingPeriods])

  const onSubmit = async (data: PricingFormValues) => {
    if (!selectedHotelId) {
      toast.error("Please select a hotel first")
      return
    }

    try {
      setLoading(true)
      
      if (isEditMode && editId) {
        await axios.patch(`/api/hotels/${selectedHotelId}/pricing/${editId}`, data)
        toast.success("Pricing period updated")
      } else {
        await axios.post(`/api/hotels/${selectedHotelId}/pricing`, data)
        toast.success("Pricing period created")
      }
      
      // Refresh pricing periods
      await fetchPricingPeriods()
      
      // Reset form and close dialog
      setIsDialogOpen(false)
      setIsEditMode(false)
      setEditId(null)
      form.reset()
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error("Something went wrong")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (pricing: PricingPeriod) => {
    setIsEditMode(true)
    setEditId(pricing.id)
    form.setValue("startDate", utcToLocal(pricing.startDate) || new Date())
    form.setValue("endDate", utcToLocal(pricing.endDate) || new Date())
    form.setValue("roomTypeId", pricing.roomTypeId)
    form.setValue("occupancyTypeId", pricing.occupancyTypeId)
    form.setValue("price", pricing.price)
    form.setValue("mealPlanId", pricing.mealPlanId || "")
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!selectedHotelId) return
    
    try {
      setLoading(true)
      await axios.delete(`/api/hotels/${selectedHotelId}/pricing/${id}`)
      toast.success("Pricing period deleted")
      
      // Refresh pricing periods
      await fetchPricingPeriods()
    } catch (error) {
      toast.error("Failed to delete pricing period")
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    if (!selectedHotelId) {
      toast.error("Please select a hotel first")
      return
    }
    setIsEditMode(false)
    setEditId(null)
    form.reset()
    setIsDialogOpen(true)
  }

  // Create hotel options for the select dropdown
  const hotelOptions = hotels.map(hotel => ({
    value: hotel.id,
    label: `${hotel.name} - ${hotel.location.label}${hotel.destination ? ` (${hotel.destination.name})` : ''}`
  }))

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title="Hotel Pricing Dashboard"
          description="Select a hotel and manage its pricing periods"
        />
      </div>
      <Separator />

      {/* Hotel Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HotelIcon className="h-5 w-5" />
            Select Hotel
          </CardTitle>
          <CardDescription>
            Choose a hotel to view and manage its pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedHotelId}
            onValueChange={setSelectedHotelId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a hotel..." />
            </SelectTrigger>
            <SelectContent>
              {hotelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Pricing Management Section - Only shown when hotel is selected */}
      {selectedHotelId && selectedHotel && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Pricing for {selectedHotel.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedHotel.location.label}
                {selectedHotel.destination && ` • ${selectedHotel.destination.name}`}
              </p>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pricing Period
            </Button>
          </div>

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
                <div className="flex flex-col justify-center items-center h-24 gap-2">
                  <p className="text-muted-foreground">No pricing periods defined yet</p>
                  <Button onClick={handleAddNew} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Pricing Period
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableCaption>List of pricing periods for {selectedHotel.name}</TableCaption>
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
                  <TableBody>
                    {pricingPeriods.map((pricing) => (
                      <TableRow key={pricing.id}>
                        <TableCell>
                          {formatDateRange(pricing.startDate, pricing.endDate)}
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
        </>
      )}

      {/* Pricing Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
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
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
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
                              {mealPlan.code} - {mealPlan.name}
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
    </>
  )
}
