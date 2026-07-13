"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import axios, { AxiosError } from "axios"
import { format, addDays } from "date-fns"
import { useRouter } from "next/navigation"
import { formatLocalDate } from "@/lib/timezone-utils"
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
  AlertCircle,
  Sparkles,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { utcToLocal } from "@/lib/timezone-utils"
import {
  generateDateRangesForYear,
  getSeasonColor,
  formatSeasonalPeriod,
  SEASON_TYPES,
  type SeasonalPeriod,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Check, ChevronsUpDown } from "lucide-react"
import { JsonImportExportDialog } from "./json-import-export-dialog"
import { PricingMatrixView } from "./pricing-matrix-view"
import { PricingSheetEditor } from "./pricing-sheet-editor"
import { HotelPricingImportDialog } from "@/app/(dashboard)/hotels/components/hotel-pricing-import-dialog"
import { HotelPricingExcelExportDialog } from "./hotel-pricing-excel-export-dialog"
import type { PricingSheet } from "@/lib/hotel-pricing-matrix"
import { sheetKey } from "@/lib/hotel-pricing-matrix"

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
  locationSeasonalPeriodId?: string | null;
  roomType?: RoomType;
  occupancyType?: OccupancyType;
  mealPlan?: MealPlan | null;
  locationSeasonalPeriod?: SeasonalPeriod | null;
}

interface EditingRow {
  id: string | null;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  startDate: Date;
  endDate: Date;
  price: number;
  locationSeasonalPeriodId: string;
}

interface SpecialDatePricing {
  id: string;
  hotelId: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  notes?: string | null;
  isActive: boolean;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  roomType?: Pick<RoomType, "id" | "name"> | null;
  occupancyType?: Pick<OccupancyType, "id" | "name"> | null;
  mealPlan?: Pick<MealPlan, "id" | "name" | "code"> | null;
}

interface EditingSpecialDatePricing {
  id: string | null;
  name: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  startDate: Date;
  endDate: Date;
  price: number;
  notes: string;
  isActive: boolean;
}

interface HotelPricingClientProps {
  locations: Location[];
  hotels: Hotel[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  initialHotelId?: string;
}

export const HotelPricingClient: React.FC<HotelPricingClientProps> = ({
  locations,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
  initialHotelId,
}) => {
  const router = useRouter()
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    if (initialHotelId) {
      const hotel = hotels.find((h) => h.id === initialHotelId)
      return hotel?.locationId ?? ""
    }
    return ""
  })
  const [selectedHotelId, setSelectedHotelId] = useState<string>(initialHotelId ?? "")
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix")
  const [pricingYear, setPricingYear] = useState<number>(new Date().getFullYear())
  const [seasonViewFilter, setSeasonViewFilter] = useState<string | null>(null)
  const [copySheetDraft, setCopySheetDraft] = useState<PricingSheet | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(false)
  const [pricingPeriods, setPricingPeriods] = useState<PricingPeriod[]>([])
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [specialDatePricings, setSpecialDatePricings] = useState<SpecialDatePricing[]>([])
  const [editingSpecialDate, setEditingSpecialDate] = useState<EditingSpecialDatePricing | null>(null)
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriod[]>([])
  const [selectedSeasonalPeriods, setSelectedSeasonalPeriods] = useState<SeasonalPeriod[]>([])
  const [selectedSeasonType, setSelectedSeasonType] = useState<string | null>(null)

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

  const toDateInputValue = (date: Date | string) => {
    const local = utcToLocal(date) || (date instanceof Date ? date : new Date(date))
    return format(local, "yyyy-MM-dd")
  }

  const parseDateInput = (value: string) => {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day, 12, 0, 0, 0)
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

  const fetchSpecialDatePricings = useCallback(async () => {
    if (!selectedHotelId) {
      setSpecialDatePricings([])
      return
    }

    try {
      const response = await axios.get(`/api/hotels/${selectedHotelId}/special-date-pricing`)
      setSpecialDatePricings(response.data)
    } catch (error) {
      toast.error("Failed to fetch special date pricing")
      console.error(error)
    }
  }, [selectedHotelId])

  // Fetch pricing when hotel is selected
  useEffect(() => {
    if (selectedHotelId) {
      const hotel = hotels.find(h => h.id === selectedHotelId)
      setSelectedHotel(hotel || null)
      fetchPricingPeriods()
      fetchSpecialDatePricings()
    } else {
      setSelectedHotel(null)
      setPricingPeriods([])
      setSpecialDatePricings([])
    }
    setEditingRow(null)
    setEditingSpecialDate(null)
  }, [selectedHotelId, hotels, fetchPricingPeriods, fetchSpecialDatePricings])

  // Reset hotel selection when location changes
  useEffect(() => {
    setSelectedHotelId("")
    setSeasonalPeriods([])
    setSelectedSeasonalPeriods([])
    setSelectedSeasonType(null)
  }, [selectedLocationId])

  const fetchSeasonalPeriods = useCallback(async () => {
    if (!selectedLocationId) {
      setSeasonalPeriods([])
      return
    }
    try {
      const response = await axios.get(`/api/locations/${selectedLocationId}/seasonal-periods`)
      setSeasonalPeriods(response.data)
    } catch (error) {
      console.error("Failed to fetch seasonal periods:", error)
      setSeasonalPeriods([])
    }
  }, [selectedLocationId])

  useEffect(() => {
    void fetchSeasonalPeriods()
  }, [fetchSeasonalPeriods])

  const applySeasonToEditingRow = (period: SeasonalPeriod) => {
    const dateRanges = generateDateRangesForYear(period, pricingYear)
    if (dateRanges.length === 0) return

    const firstRange = dateRanges[0]
    setEditingRow((prev) =>
      prev
        ? {
            ...prev,
            startDate: firstRange.start,
            endDate: firstRange.end,
            locationSeasonalPeriodId: period.id,
          }
        : prev
    )
    setSelectedSeasonalPeriods([period])
    setSelectedSeasonType(null)
    toast.success(`Applied ${period.name} dates`)
  }

  const handleSeasonTypeSelect = (seasonType: string) => {
    const periodsOfType = seasonalPeriods.filter((p) => p.seasonType === seasonType)
    setSelectedSeasonalPeriods(periodsOfType)
    setSelectedSeasonType(seasonType)
    setSeasonViewFilter(null)
    if (editingRow) {
      setEditingRow({ ...editingRow, locationSeasonalPeriodId: "" })
    }
    toast.success(
      `Selected all ${seasonType.replace(/_/g, " ").toLowerCase()} periods (${periodsOfType.length} periods)`
    )
  }

  const applyEditingRowForPeriodSelection = (
    row: EditingRow,
    selection: SeasonalPeriod[]
  ): EditingRow => {
    if (selection.length === 0) {
      return { ...row, locationSeasonalPeriodId: "" }
    }
    if (selection.length === 1) {
      const dateRanges = generateDateRangesForYear(selection[0], pricingYear)
      if (dateRanges.length > 0) {
        const firstRange = dateRanges[0]
        return {
          ...row,
          startDate: firstRange.start,
          endDate: firstRange.end,
          locationSeasonalPeriodId: selection[0].id,
        }
      }
    }
    return { ...row, locationSeasonalPeriodId: "" }
  }

  const handleIndividualPeriodSelect = (period: SeasonalPeriod) => {
    setSelectedSeasonType(null)
    setSeasonViewFilter((prev) => (prev === period.id ? null : period.id))

    if (editingRow?.id) {
      const selection = [period]
      setSelectedSeasonalPeriods(selection)
      setEditingRow(applyEditingRowForPeriodSelection(editingRow, selection))
      toast.success(`Applied ${period.name} dates`)
      return
    }

    const isAlreadySelected = selectedSeasonalPeriods.some((p) => p.id === period.id)
    const newSelection = isAlreadySelected
      ? selectedSeasonalPeriods.filter((p) => p.id !== period.id)
      : [...selectedSeasonalPeriods, period]

    setSelectedSeasonalPeriods(newSelection)

    if (editingRow) {
      setEditingRow(applyEditingRowForPeriodSelection(editingRow, newSelection))
    }

    if (isAlreadySelected) {
      toast.success(
        `Removed ${period.name}${
          newSelection.length > 0 ? ` (${newSelection.length} periods selected)` : ""
        }`
      )
    } else {
      toast.success(
        `Added ${period.name} (${newSelection.length} period${
          newSelection.length === 1 ? "" : "s"
        } selected)`
      )
    }
  }

  const clearSeasonalPeriodSelection = () => {
    setSelectedSeasonalPeriods([])
    setSelectedSeasonType(null)
    setSeasonViewFilter(null)
    if (editingRow) {
      setEditingRow({ ...editingRow, locationSeasonalPeriodId: "" })
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

    const isBulkCreate = !row.id && selectedSeasonalPeriods.length > 1

    if (!isBulkCreate) {
      if (!row.startDate || !row.endDate) {
        toast.error("Please select start and end dates")
        return
      }

      if (row.endDate < row.startDate) {
        toast.error("End date must be on or after start date")
        return
      }
    }

    if (row.price <= 0) {
      toast.error("Price must be greater than 0")
      return
    }

    // Bulk create for multiple seasonal periods (create mode only)
    if (isBulkCreate) {
      await submitBulkPricing(row)
      return
    }

    await submitPricing(row)
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
        locationSeasonalPeriodId: row.locationSeasonalPeriodId || null,
      }

      if (row.id) {
        // Update existing
        await axios.patch(`/api/hotels/${selectedHotelId}/pricing/${row.id}`, {
          ...data,
        })
        toast.success("Pricing period updated")
      } else if (selectedSeasonalPeriods.length === 1) {
        const period = selectedSeasonalPeriods[0]
        const dateRanges = generateDateRangesForYear(period, pricingYear)

        for (const dateRange of dateRanges) {
          await axios.post(`/api/hotels/${selectedHotelId}/pricing`, {
            ...data,
            startDate: dateRange.start,
            endDate: dateRange.end,
            locationSeasonalPeriodId: period.id,
          })
        }
        toast.success("Pricing period created")
      } else {
        // Create new
        await axios.post(`/api/hotels/${selectedHotelId}/pricing`, {
          ...data,
        })
        toast.success("Pricing period created")
      }
      
      // Refresh pricing periods
      await fetchPricingPeriods()
      
      // Reset editing state
      setEditingRow(null)
      setSelectedSeasonalPeriods([])
      setSelectedSeasonType(null)
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

  const submitBulkPricing = async (row: EditingRow) => {
    if (!selectedHotelId) return

    try {
      setLoading(true)
      let createdCount = 0

      for (const period of selectedSeasonalPeriods) {
        const dateRanges = generateDateRangesForYear(period, pricingYear)
        for (const dateRange of dateRanges) {
          await axios.post(`/api/hotels/${selectedHotelId}/pricing`, {
            startDate: dateRange.start,
            endDate: dateRange.end,
            roomTypeId: row.roomTypeId,
            occupancyTypeId: row.occupancyTypeId,
            price: row.price,
            mealPlanId: row.mealPlanId || null,
            locationSeasonalPeriodId: period.id,
          })
          createdCount++
        }
      }

      const seasonLabel = selectedSeasonType
        ? `all ${selectedSeasonType.replace(/_/g, " ").toLowerCase()} periods`
        : `${selectedSeasonalPeriods.length} selected season${
            selectedSeasonalPeriods.length === 1 ? "" : "s"
          }`
      toast.success(`Created ${createdCount} pricing periods for ${seasonLabel}`)
      await fetchPricingPeriods()
      setEditingRow(null)
      setSelectedSeasonalPeriods([])
      setSelectedSeasonType(null)
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
    setSelectedSeasonalPeriods([])
    setSelectedSeasonType(null)
    if (pricing.locationSeasonalPeriodId && pricing.locationSeasonalPeriod) {
      setSelectedSeasonalPeriods([pricing.locationSeasonalPeriod])
    }
    setEditingRow({
      id: pricing.id,
      roomTypeId: pricing.roomTypeId,
      occupancyTypeId: pricing.occupancyTypeId,
      mealPlanId: pricing.mealPlanId || "",
      startDate: utcToLocal(pricing.startDate) || new Date(),
      endDate: utcToLocal(pricing.endDate) || new Date(),
      price: pricing.price,
      locationSeasonalPeriodId: pricing.locationSeasonalPeriodId || "",
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

    let startDate = new Date()
    let endDate = addDays(new Date(), 30)
    let locationSeasonalPeriodId = ""

    if (selectedSeasonalPeriods.length === 1) {
      const period = selectedSeasonalPeriods[0]
      const dateRanges = generateDateRangesForYear(period, pricingYear)
      if (dateRanges.length > 0) {
        startDate = dateRanges[0].start
        endDate = dateRanges[0].end
        locationSeasonalPeriodId = period.id
      }
    }

    setEditingRow({
      id: null,
      roomTypeId: roomTypes[0]?.id || "",
      occupancyTypeId: occupancyTypes[0]?.id || "",
      mealPlanId: "",
      startDate,
      endDate,
      price: 0,
      locationSeasonalPeriodId,
    })
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
    setSelectedSeasonalPeriods([])
    setSelectedSeasonType(null)
  }

  const handleCopySheet = (sheet: PricingSheet) => {
    const nextSeason = seasonalPeriods.find(
      (p) => p.id !== sheet.locationSeasonalPeriodId
    )
    if (!nextSeason) {
      toast.error("No other season available to copy to")
      return
    }
    const dateRanges = generateDateRangesForYear(nextSeason, pricingYear)
    if (dateRanges.length === 0) return
    const range = dateRanges[0]
    const startDate = range.start.toISOString().split("T")[0]
    const endDate = range.end.toISOString().split("T")[0]
    setCopySheetDraft({
      ...sheet,
      key: sheetKey({
        startDate,
        endDate,
        roomTypeId: sheet.roomTypeId,
        mealPlanId: sheet.mealPlanId,
        locationSeasonalPeriodId: nextSeason.id,
      }),
      startDate,
      endDate,
      locationSeasonalPeriodId: nextSeason.id,
      seasonName: nextSeason.name,
      seasonType: nextSeason.seasonType,
      rowIds: [],
      occupancyPrices: sheet.occupancyPrices.map((o) => ({ ...o, rowId: undefined })),
    })
    toast.success(`Copying to ${nextSeason.name} — edit and save`)
  }

  const handleDuplicate = (pricing: PricingPeriod) => {
    const endDate = utcToLocal(pricing.endDate);
    const nextStart = endDate ? addDays(endDate, 1) : new Date();
    const nextEnd = endDate ? addDays(endDate, 30) : addDays(new Date(), 30);
    
    setEditingRow({
      id: null,
      roomTypeId: pricing.roomTypeId,
      occupancyTypeId: pricing.occupancyTypeId,
      mealPlanId: pricing.mealPlanId || "",
      startDate: nextStart,
      endDate: nextEnd,
      price: pricing.price,
      locationSeasonalPeriodId: pricing.locationSeasonalPeriodId || "",
    })
    if (pricing.locationSeasonalPeriod) {
      setSelectedSeasonalPeriods([pricing.locationSeasonalPeriod])
    }
  }

  const handleAddSpecialDatePricing = () => {
    if (!selectedHotelId) {
      toast.error("Please select a hotel first")
      return
    }
    setEditingSpecialDate({
      id: null,
      name: "",
      roomTypeId: roomTypes[0]?.id || "",
      occupancyTypeId: occupancyTypes[0]?.id || "",
      mealPlanId: "",
      startDate: new Date(),
      endDate: new Date(),
      price: 0,
      notes: "",
      isActive: true,
    })
  }

  const handleEditSpecialDatePricing = (row: SpecialDatePricing) => {
    setEditingSpecialDate({
      id: row.id,
      name: row.name,
      roomTypeId: row.roomTypeId,
      occupancyTypeId: row.occupancyTypeId,
      mealPlanId: row.mealPlanId || "",
      startDate: utcToLocal(row.startDate) || new Date(),
      endDate: utcToLocal(row.endDate) || new Date(),
      price: row.price,
      notes: row.notes || "",
      isActive: row.isActive,
    })
  }

  const handleSaveSpecialDatePricing = async () => {
    if (!selectedHotelId || !editingSpecialDate) return
    if (!editingSpecialDate.name.trim()) {
      toast.error("Enter a special date name")
      return
    }
    if (!editingSpecialDate.roomTypeId || !editingSpecialDate.occupancyTypeId) {
      toast.error("Select room type and occupancy")
      return
    }
    if (editingSpecialDate.endDate < editingSpecialDate.startDate) {
      toast.error("End date must be on or after start date")
      return
    }
    if (editingSpecialDate.price < 0) {
      toast.error("Price cannot be negative")
      return
    }

    const payload = {
      name: editingSpecialDate.name,
      startDate: editingSpecialDate.startDate,
      endDate: editingSpecialDate.endDate,
      roomTypeId: editingSpecialDate.roomTypeId,
      occupancyTypeId: editingSpecialDate.occupancyTypeId,
      mealPlanId: editingSpecialDate.mealPlanId || null,
      price: editingSpecialDate.price,
      notes: editingSpecialDate.notes || null,
      isActive: editingSpecialDate.isActive,
    }

    try {
      setLoading(true)
      if (editingSpecialDate.id) {
        await axios.patch(
          `/api/hotels/${selectedHotelId}/special-date-pricing/${editingSpecialDate.id}`,
          payload
        )
        toast.success("Special date pricing updated")
      } else {
        await axios.post(`/api/hotels/${selectedHotelId}/special-date-pricing`, payload)
        toast.success("Special date pricing added")
      }
      setEditingSpecialDate(null)
      await fetchSpecialDatePricings()
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message || error.response?.data?.error
        toast.error(message || "Failed to save special date pricing")
      } else {
        toast.error("Failed to save special date pricing")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSpecialDatePricing = async (row: SpecialDatePricing) => {
    if (!selectedHotelId) return
    if (!confirm(`Deactivate special date pricing "${row.name}"?`)) return

    try {
      setLoading(true)
      await axios.delete(`/api/hotels/${selectedHotelId}/special-date-pricing/${row.id}`)
      toast.success("Special date pricing deactivated")
      await fetchSpecialDatePricings()
      if (editingSpecialDate?.id === row.id) setEditingSpecialDate(null)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete special date pricing")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Heading
          title="Hotel Pricing Configuration"
          description="Manage broad hotel pricing periods and special date overrides"
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedLocationId ? (
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        {locations.find((l) => l.id === selectedLocationId)?.label}
                      </div>
                    ) : (
                      "Select a location..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search locations..." />
                    <CommandList>
                      <CommandEmpty>No location found.</CommandEmpty>
                      <CommandGroup>
                        {locations.map((location) => (
                          <CommandItem
                            key={location.id}
                            value={location.label}
                            onSelect={() => setSelectedLocationId(location.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedLocationId === location.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <MapPin className="mr-2 h-4 w-4" />
                            {location.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={!selectedLocationId}
                  >
                    {selectedHotelId ? (
                      <div className="flex items-center">
                        <HotelIcon className="mr-2 h-4 w-4" />
                        {filteredHotels.find((h) => h.id === selectedHotelId)?.name}
                      </div>
                    ) : selectedLocationId ? (
                      "Select a hotel..."
                    ) : (
                      "Select location first"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search hotels..." />
                    <CommandList>
                      <CommandEmpty>No hotel found.</CommandEmpty>
                      <CommandGroup>
                        {filteredHotels.map((hotel) => (
                          <CommandItem
                            key={hotel.id}
                            value={hotel.name}
                            onSelect={() => setSelectedHotelId(hotel.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedHotelId === hotel.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <HotelIcon className="mr-2 h-4 w-4" />
                            {hotel.name}
                            {hotel.destination && ` (${hotel.destination.name})`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1 border rounded-md p-0.5">
                  <Button
                    type="button"
                    variant={viewMode === "matrix" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("matrix")}
                  >
                    Matrix
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </Button>
                </div>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={pricingYear}
                  onChange={(e) => setPricingYear(Number(e.target.value))}
                  aria-label="Pricing year"
                >
                  {[pricingYear - 1, pricingYear, pricingYear + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <HotelPricingExcelExportDialog
                  hotelId={selectedHotelId}
                  hotelName={selectedHotel.name}
                  disabled={!selectedHotelId}
                />
                <HotelPricingImportDialog
                  hotelId={selectedHotelId}
                  onImportSuccess={fetchPricingPeriods}
                />
                <JsonImportExportDialog
                  hotelId={selectedHotelId}
                  hotelName={selectedHotel.name}
                  locationId={selectedHotel.locationId}
                  locationName={selectedHotel.location.label}
                  onImportSuccess={fetchPricingPeriods}
                  disabled={!selectedHotelId}
                />
                {viewMode === "list" && (
                  <Button onClick={handleAddNew} disabled={!!editingRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pricing Period
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Special Date Pricing</CardTitle>
                    <CardDescription>
                      Event and holiday prices override normal pricing without splitting base periods.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSpecialDatePricing}
                    disabled={!!editingSpecialDate}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Special Date
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingSpecialDate && (
                  <div className="rounded-md border bg-amber-50/50 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Input
                        value={editingSpecialDate.name}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            name: e.target.value,
                          })
                        }
                        placeholder="Christmas, New Year..."
                      />
                      <Input
                        type="date"
                        value={toDateInputValue(editingSpecialDate.startDate)}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            startDate: parseDateInput(e.target.value),
                          })
                        }
                      />
                      <Input
                        type="date"
                        value={toDateInputValue(editingSpecialDate.endDate)}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            endDate: parseDateInput(e.target.value),
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        value={editingSpecialDate.price}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Price"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={editingSpecialDate.roomTypeId}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            roomTypeId: e.target.value,
                          })
                        }
                      >
                        {roomTypes.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={editingSpecialDate.occupancyTypeId}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            occupancyTypeId: e.target.value,
                          })
                        }
                      >
                        {occupancyTypes.map((occupancy) => (
                          <option key={occupancy.id} value={occupancy.id}>
                            {occupancy.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={editingSpecialDate.mealPlanId}
                        onChange={(e) =>
                          setEditingSpecialDate({
                            ...editingSpecialDate,
                            mealPlanId: e.target.value,
                          })
                        }
                      >
                        <option value="">No meal plan</option>
                        {mealPlans.map((mealPlan) => (
                          <option key={mealPlan.id} value={mealPlan.id}>
                            {mealPlan.code} - {mealPlan.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={handleSaveSpecialDatePricing}
                          disabled={loading}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingSpecialDate(null)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      className="mt-3"
                      value={editingSpecialDate.notes}
                      onChange={(e) =>
                        setEditingSpecialDate({
                          ...editingSpecialDate,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Optional notes"
                    />
                  </div>
                )}

                {specialDatePricings.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
                    No special date pricing yet. Add holiday or event overrides here.
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Occupancy</TableHead>
                          <TableHead>Meal</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specialDatePricings.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">
                              {row.name}
                              {row.notes && (
                                <div className="text-xs text-muted-foreground font-normal">
                                  {row.notes}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{formatDateRange(row.startDate, row.endDate)}</TableCell>
                            <TableCell>{row.roomType?.name || "Unknown"}</TableCell>
                            <TableCell>{row.occupancyType?.name || "Unknown"}</TableCell>
                            <TableCell>
                              {row.mealPlan
                                ? `${row.mealPlan.code} - ${row.mealPlan.name}`
                                : "No meal plan"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ₹{row.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSpecialDatePricing(row)}
                                  disabled={!!editingSpecialDate}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSpecialDatePricing(row)}
                                  disabled={loading}
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seasonal period selection */}
            {seasonalPeriods.length > 0 ? (
              <Card className="border-blue-100 bg-blue-50/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Seasonal periods for {selectedHotel.location.label}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/locations/${selectedLocationId}/seasonal-periods`)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage Periods
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        Bulk selection by season type:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SEASON_TYPES.map((seasonType) => {
                        const periodsOfType = seasonalPeriods.filter((p) => p.seasonType === seasonType)
                        if (periodsOfType.length === 0) return null
                        const colors = getSeasonColor(seasonType)
                        const isSelected = selectedSeasonType === seasonType
                        return (
                          <Button
                            key={seasonType}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={`${colors.bg} ${colors.text} ${colors.border} font-medium`}
                            onClick={() => handleSeasonTypeSelect(seasonType)}
                            disabled={!!editingRow?.id}
                          >
                            All {seasonType.replace(/_/g, " ").toLowerCase()} periods
                            <span className="ml-2 text-xs opacity-70">({periodsOfType.length})</span>
                          </Button>
                        )
                      })}
                      {(selectedSeasonalPeriods.length > 0 || selectedSeasonType) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearSeasonalPeriodSelection}
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {seasonalPeriods.map((period) => (
                        <Button
                          key={period.id}
                          type="button"
                          variant={
                            seasonViewFilter === period.id || selectedSeasonalPeriods.some((p) => p.id === period.id)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={
                            seasonViewFilter === period.id || selectedSeasonalPeriods.some((p) => p.id === period.id)
                              ? `${getSeasonColor(period.seasonType).bg} ${getSeasonColor(period.seasonType).text}`
                              : ""
                          }
                          onClick={() => handleIndividualPeriodSelect(period)}
                          disabled={!!editingRow?.id && selectedSeasonType !== null}
                        >
                          {period.name}
                        </Button>
                    ))}
                  </div>

                  {selectedSeasonalPeriods.length > 0 && (
                    <div className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-3 rounded-lg">
                      <div className="font-semibold text-gray-800 mb-2">
                        Selection Summary ({selectedSeasonalPeriods.length} period
                        {selectedSeasonalPeriods.length === 1 ? "" : "s"})
                      </div>
                      {selectedSeasonType ? (
                        <div className="text-purple-700">
                          <strong>Bulk selection:</strong> All{" "}
                          {selectedSeasonType.replace(/_/g, " ").toLowerCase()} periods
                          <div className="mt-2 text-xs text-purple-600">
                            Pricing will be created for all these periods when you save.
                          </div>
                        </div>
                      ) : (
                        <div className="text-blue-700">
                          <strong>Individual selection:</strong>{" "}
                          {selectedSeasonalPeriods.length === 1
                            ? selectedSeasonalPeriods[0]?.name
                            : `${selectedSeasonalPeriods.length} periods selected`}
                          {selectedSeasonalPeriods.length > 1 && (
                            <div className="mt-2 text-xs text-blue-600">
                              Pricing will be created for all selected periods when you save.
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3 border-t border-gray-200 pt-2">
                        <div className="font-medium text-gray-700 mb-2">
                          Selected periods &amp; date ranges:
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedSeasonalPeriods.map((period, index) => (
                            <div
                              key={period.id}
                              className="flex items-center justify-between text-xs bg-white/70 rounded px-2 py-1"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-4 h-4 text-center bg-gray-100 rounded text-[10px] font-medium">
                                  {index + 1}
                                </span>
                                <span className="font-medium text-gray-800">{period.name}</span>
                              </div>
                              <div className="text-gray-600 font-mono">
                                {formatSeasonalPeriod(period)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : selectedLocationId ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No seasonal periods configured</AlertTitle>
                <AlertDescription className="flex items-center gap-2 flex-wrap">
                  <span>Add peak/off/shoulder seasons for this location to auto-fill pricing dates.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/locations/${selectedLocationId}/seasonal-periods`)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage Seasonal Periods
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === "matrix" ? "Pricing Sheets" : "Pricing Periods"}
                </CardTitle>
                  <CardDescription>
                    {viewMode === "matrix"
                      ? "Edit rate sheets by season — each sheet shows all occupancy prices for a room and meal plan."
                    : "Click edit to modify, or add broad pricing periods. Use Special Date Pricing for event and holiday overrides."}
                  </CardDescription>
              </CardHeader>
              <CardContent className={viewMode === "list" ? "p-0" : "pt-0"}>
                {viewMode === "matrix" ? (
                  <>
                    {copySheetDraft && (
                      <div className="mb-4 border rounded-lg p-4 border-dashed border-blue-300 space-y-3">
                        <p className="text-sm font-medium">
                          Copy to {copySheetDraft.seasonName} · {copySheetDraft.roomTypeName} ·{" "}
                          {copySheetDraft.mealPlanCode ?? "No meal plan"}
                        </p>
                        <PricingSheetEditor
                          sheet={copySheetDraft}
                          hotelId={selectedHotelId}
                          occupancyTypes={occupancyTypes}
                          onSave={() => {
                            setCopySheetDraft(null)
                            fetchPricingPeriods()
                          }}
                          onCancel={() => setCopySheetDraft(null)}
                        />
                      </div>
                    )}
                    <PricingMatrixView
                      hotelId={selectedHotelId}
                      pricingPeriods={pricingPeriods}
                      occupancyTypes={occupancyTypes}
                      seasonalPeriods={seasonalPeriods}
                      selectedSeasonFilter={seasonViewFilter}
                      pricingYear={pricingYear}
                      loading={loading && !editingRow}
                      onRefresh={fetchPricingPeriods}
                      onCopySheet={handleCopySheet}
                    />
                  </>
                ) : loading && !editingRow ? (
                  <div className="flex justify-center items-center h-24">
                    <p>Loading pricing periods...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[160px]">Season</TableHead>
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
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-10 px-3"
                                  >
                                    {selectedSeasonalPeriods.length > 1 ? (
                                      `${selectedSeasonalPeriods.length} periods selected`
                                    ) : editingRow.locationSeasonalPeriodId ? (
                                      seasonalPeriods.find((p) => p.id === editingRow.locationSeasonalPeriodId)?.name ?? "Season"
                                    ) : (
                                      <span className="text-muted-foreground">Manual dates</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search seasons..." />
                                    <CommandList>
                                      <CommandEmpty>No season found.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          value="manual"
                                          onSelect={() => {
                                            setEditingRow({ ...editingRow, locationSeasonalPeriodId: "" })
                                            setSelectedSeasonalPeriods([])
                                            setSelectedSeasonType(null)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              !editingRow.locationSeasonalPeriodId ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          Manual dates
                                        </CommandItem>
                                        {seasonalPeriods.map((period) => (
                                          <CommandItem
                                            key={period.id}
                                            value={period.name}
                                            onSelect={() => applySeasonToEditingRow(period)}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                editingRow.locationSeasonalPeriodId === period.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {period.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-10 px-3"
                                  >
                                    {editingRow.roomTypeId ? (
                                      roomTypes.find((rt) => rt.id === editingRow.roomTypeId)?.name
                                    ) : (
                                      <span className="text-muted-foreground">Select...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search room types..." />
                                    <CommandList>
                                      <CommandEmpty>No room type found.</CommandEmpty>
                                      <CommandGroup>
                                        {roomTypes.map((rt) => (
                                          <CommandItem
                                            key={rt.id}
                                            value={rt.name}
                                            onSelect={() =>
                                              setEditingRow({ ...editingRow, roomTypeId: rt.id })
                                            }
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                editingRow.roomTypeId === rt.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {rt.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-10 px-3"
                                  >
                                    {editingRow.occupancyTypeId ? (
                                      occupancyTypes.find((ot) => ot.id === editingRow.occupancyTypeId)?.name
                                    ) : (
                                      <span className="text-muted-foreground">Select...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search occupancy types..." />
                                    <CommandList>
                                      <CommandEmpty>No occupancy type found.</CommandEmpty>
                                      <CommandGroup>
                                        {occupancyTypes.map((ot) => (
                                          <CommandItem
                                            key={ot.id}
                                            value={ot.name}
                                            onSelect={() =>
                                              setEditingRow({ ...editingRow, occupancyTypeId: ot.id })
                                            }
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                editingRow.occupancyTypeId === ot.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {ot.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-10 px-3"
                                  >
                                    {editingRow.mealPlanId ? (
                                      mealPlans.find((mp) => mp.id === editingRow.mealPlanId)?.code
                                    ) : (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search meal plans..." />
                                    <CommandList>
                                      <CommandEmpty>No meal plan found.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          value=""
                                          onSelect={() =>
                                            setEditingRow({ ...editingRow, mealPlanId: "" })
                                          }
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              editingRow.mealPlanId === "" ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          None
                                        </CommandItem>
                                        {mealPlans.map((mp) => (
                                          <CommandItem
                                            key={mp.id}
                                            value={mp.code}
                                            onSelect={() =>
                                              setEditingRow({ ...editingRow, mealPlanId: mp.id })
                                            }
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                editingRow.mealPlanId === mp.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {mp.code}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    disabled={
                                      !editingRow.id &&
                                      (selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null)
                                    }
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !editingRow.startDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {!editingRow.id &&
                                    (selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null) ? (
                                      <span className="text-xs text-muted-foreground">Auto-set</span>
                                    ) : editingRow.startDate ? (
                                      format(editingRow.startDate, "dd MMM yy")
                                    ) : (
                                      "Pick"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editingRow.startDate}
                                    onSelect={(date) =>
                                      date &&
                                      setEditingRow({
                                        ...editingRow,
                                        startDate: date,
                                        locationSeasonalPeriodId: "",
                                      })
                                    }
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
                                    disabled={
                                      !editingRow.id &&
                                      (selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null)
                                    }
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !editingRow.endDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {!editingRow.id &&
                                    (selectedSeasonalPeriods.length > 1 || selectedSeasonType !== null) ? (
                                      <span className="text-xs text-muted-foreground">Auto-set</span>
                                    ) : editingRow.endDate ? (
                                      format(editingRow.endDate, "dd MMM yy")
                                    ) : (
                                      "Pick"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editingRow.endDate}
                                    onSelect={(date) =>
                                      date &&
                                      setEditingRow({
                                        ...editingRow,
                                        endDate: date,
                                        locationSeasonalPeriodId: "",
                                      })
                                    }
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
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                              No pricing periods defined yet. Click &quot;Add Pricing Period&quot; to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pricingPeriods.map((pricing) => (
                            <TableRow key={pricing.id} className="hover:bg-muted/50">
                              <TableCell>
                                {pricing.locationSeasonalPeriod ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                      getSeasonColor(pricing.locationSeasonalPeriod.seasonType).bg,
                                      getSeasonColor(pricing.locationSeasonalPeriod.seasonType).text
                                    )}
                                  >
                                    {pricing.locationSeasonalPeriod.name}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
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
    </>
  )
}
