"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  Plus,
  Edit,
  Trash,
  Calendar,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronLeft,
  Settings
} from "lucide-react"

import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  SEASONAL_TEMPLATES,
  getSeasonColor,
  formatSeasonalPeriod,
  validateSeasonalPeriod,
  checkYearCoverage,
  type SeasonalPeriod
} from "@/lib/seasonal-periods"

const seasonalPeriodSchema = z.object({
  seasonType: z.enum(['OFF_SEASON', 'PEAK_SEASON', 'SHOULDER_SEASON'], {
    required_error: "Season type is required",
  }),
  name: z.string().min(1, {
    message: "Season name is required",
  }),
  startMonth: z.coerce.number().min(1).max(12, {
    message: "Start month must be between 1 and 12",
  }),
  startDay: z.coerce.number().min(1).max(31, {
    message: "Start day must be between 1 and 31",
  }),
  endMonth: z.coerce.number().min(1).max(12, {
    message: "End month must be between 1 and 12",
  }),
  endDay: z.coerce.number().min(1).max(31, {
    message: "End day must be between 1 and 31",
  }),
  description: z.string().optional(),
})

type SeasonalPeriodFormValues = z.infer<typeof seasonalPeriodSchema>

export default function LocationSeasonalPeriodsPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params?.locationId as string

  const [location, setLocation] = useState<any>(null)
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const form = useForm<SeasonalPeriodFormValues>({
    resolver: zodResolver(seasonalPeriodSchema),
    defaultValues: {
      seasonType: "PEAK_SEASON",
      name: "",
      startMonth: 1,
      startDay: 1,
      endMonth: 1,
      endDay: 31,
      description: "",
    }
  })

  const fetchLocationAndPeriods = async () => {
    try {
      setLoading(true)

      // Fetch location details
      const locationResponse = await axios.get(`/api/locations/${locationId}`)
      setLocation(locationResponse.data)

      // Fetch seasonal periods
      const periodsResponse = await axios.get(`/api/locations/${locationId}/seasonal-periods`)
      setSeasonalPeriods(periodsResponse.data)
    } catch (error) {
      toast.error("Failed to fetch location and seasonal periods")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLocationAndPeriods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  const onSubmit = async (data: SeasonalPeriodFormValues) => {
    try {
      setLoading(true)

      if (isEditMode && editId) {
        await axios.patch(`/api/locations/${locationId}/seasonal-periods/${editId}`, data)
        toast.success("Seasonal period updated successfully")
      } else {
        await axios.post(`/api/locations/${locationId}/seasonal-periods`, data)
        toast.success("Seasonal period created successfully")
      }

      setShowDialog(false)
      setIsEditMode(false)
      setEditId(null)
      form.reset()

      // Refresh data
      await fetchLocationAndPeriods()
    } catch (error: any) {
      const errorMessage = error.response?.data || "Failed to save seasonal period"
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (period: SeasonalPeriod) => {
    setIsEditMode(true)
    setEditId(period.id)
    form.reset({
      seasonType: period.seasonType,
      name: period.name,
      startMonth: period.startMonth,
      startDay: period.startDay,
      endMonth: period.endMonth,
      endDay: period.endDay,
      description: period.description || "",
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this seasonal period?")) {
      return
    }

    try {
      setLoading(true)
      await axios.delete(`/api/locations/${locationId}/seasonal-periods/${id}`)
      toast.success("Seasonal period deleted successfully")
      await fetchLocationAndPeriods()
    } catch (error: any) {
      const errorMessage = error.response?.data || "Failed to delete seasonal period"
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyTemplate = async (templateKey: string) => {
    try {
      setLoading(true)
      const template = SEASONAL_TEMPLATES[templateKey as keyof typeof SEASONAL_TEMPLATES]

      // Create all periods from template
      for (const period of template) {
        await axios.post(`/api/locations/${locationId}/seasonal-periods`, {
          seasonType: period.type,
          name: period.name,
          startMonth: period.start[0],
          startDay: period.start[1],
          endMonth: period.end[0],
          endDay: period.end[1],
          description: period.description,
        })
      }

      toast.success(`Applied ${templateKey.replace('_', ' ')} template successfully`)
      setShowTemplateDialog(false)
      await fetchLocationAndPeriods()
    } catch (error: any) {
      const errorMessage = error.response?.data || "Failed to apply template"
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setIsEditMode(false)
    setEditId(null)
    form.reset({
      seasonType: "PEAK_SEASON",
      name: "",
      startMonth: 1,
      startDay: 1,
      endMonth: 1,
      endDay: 31,
      description: "",
    })
    setShowDialog(true)
  }

  // Calculate year coverage
  const yearCoverage = checkYearCoverage(seasonalPeriods)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/locations")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
          <Heading
            title={`Seasonal Periods - ${location?.label || 'Loading...'}`}
            description="Manage seasonal pricing periods for this location"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplateDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Apply Template
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Period
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Year Coverage Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Year Coverage Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {yearCoverage.isComplete ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Complete coverage with no overlaps</span>
              </div>
            ) : (
              <div className="flex items-center text-amber-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span>
                  {yearCoverage.overlaps.length > 0 && "Has overlapping periods"}
                  {yearCoverage.gaps.length > 0 && "Has gaps in coverage"}
                  {seasonalPeriods.length === 0 && "No seasonal periods defined"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Periods List */}
      <div className="grid gap-4">
        {seasonalPeriods.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4 text-center">
                No seasonal periods defined yet for this location.
              </p>
              <div className="flex space-x-2">
                <Button onClick={openCreateDialog}>Create First Period</Button>
                <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          seasonalPeriods.map((period) => {
            const colors = getSeasonColor(period.seasonType)
            return (
              <Card key={period.id} className={`border-l-4 ${colors.border}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge className={`${colors.bg} ${colors.text}`}>
                          {period.seasonType.replace('_', ' ')}
                        </Badge>
                        <h3 className="text-lg font-semibold">{period.name}</h3>
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Period:</span> {formatSeasonalPeriod(period)}
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Dates:</span> {monthNames[period.startMonth - 1]} {period.startDay} - {monthNames[period.endMonth - 1]} {period.endDay}
                      </div>

                      {period.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {period.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(period.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Seasonal Period" : "Create Seasonal Period"}
            </DialogTitle>
            <DialogDescription>
              Define a seasonal pricing period for this location.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="seasonType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value as "PEAK_SEASON" | "SHOULDER_SEASON" | "OFF_SEASON")}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select season type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PEAK_SEASON">Peak Season</SelectItem>
                        <SelectItem value="SHOULDER_SEASON">Shoulder Season</SelectItem>
                        <SelectItem value="OFF_SEASON">Off Season</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Winter Peak Season" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Month</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {monthNames.map((month, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {month}
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
                  name="startDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="endMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Month</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {monthNames.map((month, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {month}
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
                  name="endDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this seasonal period..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide context about weather, demand, or pricing considerations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {isEditMode ? "Update" : "Create"} Period
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Seasonal Period Template</DialogTitle>
            <DialogDescription>
              Choose a template that matches your location type. This will create predefined seasonal periods.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {Object.entries(SEASONAL_TEMPLATES).map(([key, template]) => (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        {key.replace('_', ' ').replace(/\w\S*/g, (txt) =>
                          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                        )}
                      </h3>
                      <div className="space-y-1">
                        {template.map((period, index) => {
                          const colors = getSeasonColor(period.type)
                          return (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <Badge className={`${colors.bg} ${colors.text} text-xs`}>
                                {period.type.replace('_', ' ')}
                              </Badge>
                              <span>{period.name}</span>
                              <span className="text-muted-foreground">
                                ({monthNames[period.start[0] - 1]} {period.start[1]} - {monthNames[period.end[0] - 1]} {period.end[1]})
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApplyTemplate(key)}
                      disabled={loading}
                    >
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
