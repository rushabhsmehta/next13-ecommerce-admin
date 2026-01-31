"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import axios, { AxiosError } from "axios"
import { format, addDays } from "date-fns"
import { formatLocalDate, dateToUtc } from "@/lib/timezone-utils"
import { toast } from "react-hot-toast"
import { 
  CalendarIcon, 
  Edit, 
  Plus, 
  Trash,
  Hotel as HotelIcon,
  MapPin,
  Save,
  X,
  Copy,
  AlertCircle
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
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { PricingSplitDialog } from "./pricing-split-dialog"

// TypeScript interfaces
interface Location {
  id: string;
  label: string;
}

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

interface EditingRow {
  id: string | null;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  startDate: Date;
  endDate: Date;
  price: number;
}

interface HotelPricingClientProps {
  locations: Location[];
  hotels: Hotel[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
}

interface PricingSplitPreview {
  willSplit: boolean;
  affectedPeriods: Array<{
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    price: number;
    roomType: string;
    occupancy: string;
    mealPlan?: string;
  }>;
  resultingPeriods: Array<{
    startDate: Date | string;
    endDate: Date | string;
    price: number;
    isNew: boolean;
    isExisting: boolean;
  }>;
  message: string;
}

export const HotelPricingClient: React.FC<HotelPricingClientProps> = ({
  locations,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [selectedHotelId, setSelectedHotelId] = useState<string>("")
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(false)
  const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([])
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [splitPreview, setSplitPreview] = useState<PricingSplitPreview | null>(null)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<EditingRow | null>(null)

  // Filter hotels by selected location
  const filteredHotels = useMemo(() => {
    if (!selectedLocationId) return hotels
    return hotels.filter(h => h.locationId === selectedLocationId)
  }, [selectedLocationId, hotels])

  // Helper function to format date ranges
  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = formatLocalDate(utcToLocal(startDate) || new Date(), "dd MMM yyyy")
    const end = formatLocalDate(utcToLocal(endDate) || new Date(), "dd MMM yyyy")
    return `${start} - ${end}`
  }

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
    setEditingRow(null)
  }, [selectedHotelId, hotels, fetchPricingPeriods])

  // Reset hotel selection when location changes
  useEffect(() => {
    setSelectedHotelId("")
  }, [selectedLocationId])

  const checkForOverlaps = async (data: EditingRow): Promise<PricingSplitPreview | null> => {
    if (!selectedHotelId) return null
    
    try {
      const response = await axios.post(`/api/hotels/${selectedHotelId}/pricing/check-overlap`, {
        startDate: data.startDate,
        endDate: data.endDate,
        roomTypeId: data.roomTypeId,
        occupancyTypeId: data.occupancyTypeId,
        mealPlanId: data.mealPlanId || null,
        excludeId: data.id || undefined
      })
      
      return response.data
    } catch (error) {
      console.error("Error checking overlaps:", error)
      return null
    }
  }

  const handleSaveRow = async (row: EditingRow) => {
    if (!selectedHotelId) {
      toast.error("Please select a hotel first")
      return
    }

    // Validation
    if (!row.roomTypeId || !row.occupancyTypeId) {
      toast.error("Please select room type and occupancy type")
      return
    }

    if (!row.startDate || !row.endDate) {
      toast.error("Please select start and end dates")
      return
    }

    if (row.endDate < row.startDate) {
      toast.error("End date must be on or after start date")
      return
    }

    if (row.price < 0) {
      toast.error("Price must be at least 0")
      return
    }

    // Check for overlaps
    const preview = await checkForOverlaps(row)
    
    if (preview && preview.willSplit) {
      // Show confirmation dialog
      setSplitPreview(preview)
      setPendingSubmit(row)
      setShowSplitDialog(true)
    } else {
      // No overlap, proceed directly
      await submitPricing(row)
    }
  }

  const submitPricing = async (row: EditingRow) => {
    if (!selectedHotelId) return

    try {
      setLoading(true)
      
      const data = {
        startDate: row.startDate,
        endDate: row.endDate,
        roomTypeId: row.roomTypeId,
        occupancyTypeId: row.occupancyTypeId,
        price: row.price,
        mealPlanId: row.mealPlanId || null,
      }

      if (row.id) {
        // Update existing
        await axios.patch(`/api/hotels/${selectedHotelId}/pricing/${row.id}`, data)
        toast.success("Pricing period updated")
      } else {
        // Create new with splitting
        await axios.post(`/api/hotels/${selectedHotelId}/pricing`, {
          ...data,
          applySplit: true // Flag to enable automatic splitting
        })
        toast.success("Pricing period created")
      }
      
      // Refresh pricing periods
      await fetchPricingPeriods()
      
      // Reset editing state
      setEditingRow(null)
      setPendingSubmit(null)
      setSplitPreview(null)
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

  const handleConfirmSplit = async () => {
    if (pendingSubmit) {
      setShowSplitDialog(false)
      await submitPricing(pendingSubmit)
    }
  }

  const handleEdit = (pricing: PricingPeriod) => {
    setEditingRow({
      id: pricing.id,
      roomTypeId: pricing.roomTypeId,
      occupancyTypeId: pricing.occupancyTypeId,
      mealPlanId: pricing.mealPlanId || "",
      startDate: utcToLocal(pricing.startDate) || new Date(),
      endDate: utcToLocal(pricing.endDate) || new Date(),
      price: pricing.price,
    })
  }

  const handleDelete = async (id: string) => {
    if (!selectedHotelId) return
    
    if (!confirm("Are you sure you want to delete this pricing period?")) {
      return
    }
    
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
    
    setEditingRow({
      id: null,
      roomTypeId: roomTypes[0]?.id || "",
      occupancyTypeId: occupancyTypes[0]?.id || "",
      mealPlanId: "",
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      price: 0,
    })
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
  }

  const handleDuplicate = (pricing: PricingPeriod) => {
    const endDate = utcToLocal(pricing.endDate);
    const nextStart = endDate ? addDays(endDate, 1) : new Date();
    const nextEnd = endDate ? addDays(endDate, 31) : addDays(new Date(), 30);
    
    setEditingRow({
      id: null,
      roomTypeId: pricing.roomTypeId,
      occupancyTypeId: pricing.occupancyTypeId,
      mealPlanId: pricing.mealPlanId || "",
      startDate: nextStart,
      endDate: nextEnd,
      price: pricing.price,
    })
  }

  return (
    <>
      <div className="space-y-4">
        <Heading
          title="Hotel Pricing Configuration"
          description="Manage hotel pricing with location-based filtering and period splitting"
        />
        <Separator />

        {/* Selection Bar - Google Sheets Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Hotel Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <HotelIcon className="h-4 w-4" />
                Hotel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedHotelId}
                onValueChange={setSelectedHotelId}
                disabled={!selectedLocationId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedLocationId ? "Select a hotel..." : "Select location first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredHotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                      {hotel.destination && ` (${hotel.destination.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert when location is selected but no hotel */}
        {selectedLocationId && !selectedHotelId && filteredHotels.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Select a Hotel</AlertTitle>
            <AlertDescription>
              Choose a hotel from the dropdown above to view and manage its pricing.
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Grid - Only shown when hotel is selected */}
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
              <Button onClick={handleAddNew} disabled={!!editingRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add Pricing Period
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Periods</CardTitle>
                <CardDescription>
                  Click edit to modify, or add new pricing periods. Overlapping periods will be automatically split.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading && !editingRow ? (
                  <div className="flex justify-center items-center h-24">
                    <p>Loading pricing periods...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[180px]">Room Type</TableHead>
                          <TableHead className="w-[180px]">Occupancy</TableHead>
                          <TableHead className="w-[150px]">Meal Plan</TableHead>
                          <TableHead className="w-[140px]">Start Date</TableHead>
                          <TableHead className="w-[140px]">End Date</TableHead>
                          <TableHead className="w-[120px]">Price (₹)</TableHead>
                          <TableHead className="w-[140px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* New/Editing Row */}
                        {editingRow && (
                          <TableRow className="bg-blue-50 border-2 border-blue-200">
                            <TableCell>
                              <Select
                                value={editingRow.roomTypeId}
                                onValueChange={(value) => 
                                  setEditingRow({ ...editingRow, roomTypeId: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roomTypes.map((rt) => (
                                    <SelectItem key={rt.id} value={rt.id}>
                                      {rt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={editingRow.occupancyTypeId}
                                onValueChange={(value) => 
                                  setEditingRow({ ...editingRow, occupancyTypeId: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {occupancyTypes.map((ot) => (
                                    <SelectItem key={ot.id} value={ot.id}>
                                      {ot.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={editingRow.mealPlanId}
                                onValueChange={(value) => 
                                  setEditingRow({ ...editingRow, mealPlanId: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {mealPlans.map((mp) => (
                                    <SelectItem key={mp.id} value={mp.id}>
                                      {mp.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !editingRow.startDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingRow.startDate ? format(editingRow.startDate, "dd MMM yy") : "Pick"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editingRow.startDate}
                                    onSelect={(date) => date && setEditingRow({ ...editingRow, startDate: date })}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !editingRow.endDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editingRow.endDate ? format(editingRow.endDate, "dd MMM yy") : "Pick"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editingRow.endDate}
                                    onSelect={(date) => date && setEditingRow({ ...editingRow, endDate: date })}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={editingRow.price}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const numValue = value === '' ? 0 : parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    setEditingRow({ ...editingRow, price: numValue });
                                  }
                                }}
                                className="w-full"
                                min={0}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSaveRow(editingRow)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={handleCancelEdit}
                                  disabled={loading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Existing Pricing Periods */}
                        {pricingPeriods.length === 0 && !editingRow ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                              No pricing periods defined yet. Click "Add Pricing Period" to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pricingPeriods.map((pricing) => (
                            <TableRow key={pricing.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
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
                                {pricing.mealPlan?.code || 
                                  (pricing.mealPlanId ? (mealPlans.find(mp => mp.id === pricing.mealPlanId)?.code) : "-") ||
                                  "-"}
                              </TableCell>
                              <TableCell>
                                {formatLocalDate(utcToLocal(pricing.startDate) || new Date(), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell>
                                {formatLocalDate(utcToLocal(pricing.endDate) || new Date(), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {pricing.price.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEdit(pricing)}
                                    disabled={!!editingRow || loading}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDuplicate(pricing)}
                                    disabled={!!editingRow || loading}
                                    title="Duplicate"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDelete(pricing.id)}
                                    disabled={!!editingRow || loading}
                                    title="Delete"
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pricing Split Confirmation Dialog */}
      <PricingSplitDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        preview={splitPreview}
        onConfirm={handleConfirmSplit}
        loading={loading}
      />
    </>
  )
}
