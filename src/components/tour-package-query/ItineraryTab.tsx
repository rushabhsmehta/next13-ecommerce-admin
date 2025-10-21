// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\ItineraryTab.tsx
import { useState, useRef, useEffect } from "react";
import { Control, useFieldArray, useFormContext } from "react-hook-form";
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed
import { ListPlus, ChevronDown, ChevronUp, Trash2, Plus, ImageIcon, Type, AlignLeft, MapPinIcon, Check as CheckIcon, GripVertical, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import JoditEditor from "jodit-react";
import { Activity, ActivityMaster, Hotel, Images, ItineraryMaster, Location, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client"; // Added lookup types
import { addDays, isValid, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { formatLocalDate } from '@/lib/timezone-utils';

// Import necessary UI components
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// Removed RoomAllocationComponent & TransportDetailsComponent (moved to Hotels tab)
import ImageUpload from "@/components/ui/image-upload";
// Removed hotel image preview (now managed in Hotels tab)
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define the props interface with a union type for control
interface ItineraryTabProps {
  control: Control<TourPackageQueryFormValues | TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  hotels: (Hotel & { images: Images[]; })[]; // kept prop for backwards compatibility (not used now)
  activitiesMaster?: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster?: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  form: any; // Consider using a more specific type or a union type if form methods differ
  // --- ADDED LOOKUP PROPS ---
  roomTypes?: RoomType[]; // no longer used here
  occupancyTypes?: OccupancyType[]; // no longer used here
  mealPlans?: MealPlan[]; // no longer used here
  vehicleTypes?: VehicleType[]; // no longer used here
  // --- END ADDED LOOKUP PROPS ---
}

function ItineraryTab({
  control,
  loading,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  form,
  // --- DESTRUCTURE ADDED PROPS ---
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = [],
  // --- END DESTRUCTURE ---
}: ItineraryTabProps) {
  // Create a refs object to store multiple editor references instead of a single ref
  const editorsRef = useRef<{[key: string]: any}>({});
  // Track open state for each itinerary accordion to avoid it collapsing on re-render
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({ 0: true });
  // Handle saving to master itinerary
  const handleSaveToMasterItinerary = async (itinerary: any) => {
    try {
      // Mark as loading
      form.setValue('loading', true);

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
      };

      // Send to existing API endpoint
      const response = await fetch('/api/itinerariesMaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterItineraryData),
      });

      const data = await response.json();
      alert('Saved to Master Itinerary successfully!');
      console.log('Saved to master itinerary:', data);
    } catch (error: any) {
      console.error('Error saving to master itinerary:', error);
      alert(`Failed to save to Master Itinerary: ${error.message}`);
    } finally {
      form.setValue('loading', false);
    }
  };

  // Activity selection helper (restored after refactor)
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

  // Sortable wrapper to attach drag listeners to a handle and item container
  const SortableWrapper: React.FC<{ id: string; children: (opts: { attributes: any; listeners: any; isDragging: boolean; setNodeRef: (node: HTMLElement | null) => void; style: React.CSSProperties; }) => React.ReactNode; }> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : undefined,
    };
    return <div ref={setNodeRef} style={style}>{children({ attributes, listeners, isDragging, setNodeRef, style })}</div>;
  };

  // DnD sensors (restored)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Normalizers to ensure fields are strings/arrays and not null
  const normalizeActivity = (activity: any) => ({
    activityTitle: typeof activity?.activityTitle === 'string' ? activity.activityTitle : '',
    activityDescription: typeof activity?.activityDescription === 'string' ? activity.activityDescription : '',
    activityImages: Array.isArray(activity?.activityImages) ? activity.activityImages : [],
  });

  const normalizeItinerary = (it: any, index?: number) => ({
    ...it,
    itineraryTitle: typeof it?.itineraryTitle === 'string' ? it.itineraryTitle : '',
    itineraryDescription: typeof it?.itineraryDescription === 'string' ? it.itineraryDescription : '',
    days: typeof it?.days === 'string' ? it.days : '',
    itineraryImages: Array.isArray(it?.itineraryImages) ? it.itineraryImages : [],
    activities: Array.isArray(it?.activities) ? it.activities.map(normalizeActivity) : [],
    roomAllocations: Array.isArray(it?.roomAllocations) ? it.roomAllocations : [],
    transportDetails: Array.isArray(it?.transportDetails) ? it.transportDetails : [],
    hotelId: typeof it?.hotelId === 'string' ? it.hotelId : '',
    locationId: typeof it?.locationId === 'string' ? it.locationId : (form.getValues('locationId') || ''),
    dayNumber: typeof it?.dayNumber === 'number' ? it.dayNumber : (typeof index === 'number' ? index + 1 : 1),
  });

  // One-time normalization on mount for existing data that may contain nulls
  useEffect(() => {
    try {
      const current: any[] = form.getValues('itineraries') || [];
      if (!Array.isArray(current)) return;
      const normalized = current.map((it, i) => normalizeItinerary(it, i));
      // Only set if something actually changed to avoid loops
      if (JSON.stringify(current) !== JSON.stringify(normalized)) {
        form.setValue('itineraries', normalized, { shouldDirty: true, shouldValidate: false });
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill itinerary date strings when tourStartsFrom is set and days are empty
  useEffect(() => {
    try {
      const start = form.getValues('tourStartsFrom');
      const items = form.getValues('itineraries') || [];
      if (!start || !Array.isArray(items) || items.length === 0) return;
      const startDate = new Date(start);
      if (!isValid(startDate)) return;
      const needsFill = items.some((it: any) => !it?.days);
      if (!needsFill) return;
      const updated = items.map((it: any, i: number) => ({
        ...it,
        days: it?.days || formatLocalDate(addDays(startDate, i), 'dd-MM-yyyy')
      }));
      form.setValue('itineraries', updated, { shouldDirty: true, shouldValidate: false });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch?.('tourStartsFrom')]);

  // Handle drag end to reorder itineraries and renumber dayNumber
  const handleDragEnd = (event: any, itineraries: any[], onChange: (val: any) => void) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(String(active.id).split("-")[1]);
    const newIndex = Number(String(over.id).split("-")[1]);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;

    const reordered = arrayMove(itineraries, oldIndex, newIndex)
      .map((it, i) => normalizeItinerary({ ...it, dayNumber: i + 1 }, i));
    onChange(reordered);
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <ListPlus className="h-5 w-5 text-primary" />
            Itinerary Details
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  const start = form.getValues('tourStartsFrom');
                  const items = form.getValues('itineraries') || [];
                  if (!start || !items.length) return;
                  const startDate = new Date(start);
                  if (!isValid(startDate)) return;
                  const updated = items.map((it: any, i: number) => ({
                    ...it,
                    days: formatLocalDate(addDays(startDate, i), 'dd-MM-yyyy')
                  }));
                  form.setValue('itineraries', updated, { shouldDirty: true, shouldValidate: false });
                } catch {}
              }}
              className="h-8"
            >
              Auto-fill dates
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <FormField
          control={control}
          name="itineraries"
          render={({ field: { value = [], onChange } }) => (
            <FormItem>
              <div className="space-y-6">
                {/* Itinerary Days with Drag-and-Drop */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, value, onChange)}>
                  <SortableContext items={value.map((_, idx) => `it-${idx}`)} strategy={verticalListSortingStrategy}>
                    {value.map((itinerary, index) => (
                      <SortableWrapper key={`it-${index}`} id={`it-${index}`}>
                        {({ attributes, listeners }) => (
                          <Accordion
                            type="single"
                            collapsible
                            value={openMap[index] ? `item-${index}` : undefined}
                            onValueChange={(v) => setOpenMap(prev => ({ ...prev, [index]: !!v }))}
                            className="w-full border rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <AccordionItem value={`item-${index}`} className="border-0">
                              <AccordionTrigger className="bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 rounded-t-lg">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    aria-label="Drag to reorder"
                                    className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                                    {...attributes}
                                    {...listeners}
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="font-bold" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${index + 1}` }} />
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 px-4 pb-6">
                                <div className="flex justify-end mb-4">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={loading}
                                    onClick={() => onChange(value.filter((_: any, i: number) => i !== index).map((it, i) => normalizeItinerary({ ...it, dayNumber: i + 1 }, i)))}
                                    className="h-8 px-2"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove Day
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6" />
                                <div className="flex flex-col gap-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                  <h3 className="font-medium text-sm text-slate-500">Itinerary Template</h3>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            "w-full justify-between bg-white shadow-sm",
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
                                    <PopoverContent className="w-[240px] p-0 max-h-[240px] overflow-auto">
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
                                              key={itineraryMaster.id} onSelect={() => {
                                                const updatedItineraries = [...value];
                                                updatedItineraries[index] = normalizeItinerary({
                                                  ...itinerary,
                                                  itineraryTitle: itineraryMaster.itineraryMasterTitle || '',
                                                  itineraryDescription: itineraryMaster.itineraryMasterDescription || '',
                                                  itineraryImages: itineraryMaster.itineraryMasterImages?.map((image) => ({ url: image.url })) || [],
                                                  activities: itineraryMaster.activities?.map(activity => ({
                                                    activityTitle: activity.activityTitle || '',
                                                    activityDescription: activity.activityDescription || '',
                                                    activityImages: activity.activityImages?.map(image => ({ url: image.url })) || [],
                                                  })) || [],
                                                  days: itinerary.days || '',
                                                }, index);
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
                                </div>
                                <div className="col-span-2">
                                  <div className="grid grid-cols-1 gap-5">                            <FormItem className="bg-white rounded-lg p-4 shadow-sm border">
                                    <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                      <Type className="h-4 w-4" />
                                      <span>Title</span>
                                    </FormLabel>
                                    <FormControl>
                                      <JoditEditor
                                        ref={(node) => editorsRef.current[`title-${index}`] = node}
                                        value={itinerary.itineraryTitle || ''}
                                        config={{
                                          readonly: loading,
                                          toolbar: true,
                                          theme: 'default',
                                        }}
                                        onBlur={(newContent) => {
                                          const newItineraries = [...value]
                                          newItineraries[index] = normalizeItinerary({ ...itinerary, itineraryTitle: newContent }, index)
                                          onChange(newItineraries)
                                        }}
                                        onChange={() => {}}
                                      />
                                    </FormControl>
                                  </FormItem>                            <FormItem className="bg-white rounded-lg p-4 shadow-sm border">
                                    <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                      <AlignLeft className="h-4 w-4" />
                                      <span>Description</span>
                                    </FormLabel>
                                    <FormControl>
                                      <JoditEditor
                                        ref={(node) => editorsRef.current[`description-${index}`] = node}
                                        value={itinerary.itineraryDescription || ''}
                                        config={{
                                          readonly: loading,
                                          toolbar: true,
                                          theme: 'default',
                                        }}
                                        onBlur={(newContent) => {
                                          const newItineraries = [...value]
                                          newItineraries[index] = normalizeItinerary({ ...itinerary, itineraryDescription: newContent }, index)
                                          onChange(newItineraries)
                                        }}
                                        onChange={() => {}}
                                      />
                                    </FormControl>
                                  </FormItem>
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <FormItem>
                                  <FormLabel>Day</FormLabel>
                                  <FormControl>
                                    <Input
                                      disabled={loading}
                                      type="number"
                                      className="bg-white shadow-sm"
                                      value={itinerary.dayNumber}
                                      onChange={(e) => {
                                        const dayNumber = Number(e.target.value);
                                        const newItineraries = [...value];
                                        newItineraries[index] = normalizeItinerary({ ...itinerary, dayNumber });
                                        onChange(newItineraries);
                                      }}
                                      onKeyDown={(e) => {
                                        // Prevent keyboard events from bubbling up to accordion
                                        e.stopPropagation();
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>

                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={loading}
                                        className={cn("w-full justify-between text-left font-normal bg-white shadow-sm", !itinerary.days && "text-muted-foreground")}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span>{itinerary.days || 'Pick a date'}</span>
                                        <CalendarIcon className="ml-2 h-4 w-4 opacity-60" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-2"
                                      align="start"
                                      onClick={(e) => e.stopPropagation()}
                                      onPointerDownCapture={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex flex-col gap-2">
                                        {/* Calendar Date Picker */}
                                        <Calendar
                                          mode="single"
                                          selected={(() => {
                                            try {
                                              if (!itinerary.days) return undefined;
                                              const parsed = parse(itinerary.days, 'dd-MM-yyyy', new Date());
                                              return isValid(parsed) ? parsed : undefined;
                                            } catch { return undefined; }
                                          })()}
                                          onSelect={(date) => {
                                            const newItineraries = [...value];
                                            const newDate = date && isValid(date) ? formatLocalDate(date, 'dd-MM-yyyy') : '';
                                            newItineraries[index] = normalizeItinerary({ ...itinerary, days: newDate }, index);
                                            onChange(newItineraries);
                                            setOpenMap(prev => ({ ...prev, [index]: true }));
                                          }}
                                          initialFocus
                                        />
                                        <div className="flex items-center justify-between pt-1">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={loading || !itinerary.days}
                                            onClick={() => {
                                              const newItineraries = [...value];
                                              newItineraries[index] = normalizeItinerary({ ...itinerary, days: '' }, index);
                                              onChange(newItineraries);
                                              setOpenMap(prev => ({ ...prev, [index]: true }));
                                            }}
                                          >
                                            Clear
                                          </Button>
                                          <div className="text-xs text-slate-500 pr-2">Format: dd-MM-yyyy</div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {/* Manual text input removed to prevent duplicate date field */}
                                </FormItem>
                              </div>

                              {/* Destination Images */}
                              <div className="bg-slate-50 p-3 rounded-md mb-4">
                                <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                                  <ImageIcon className="h-4 w-4 text-primary" />
                                  Destination Images
                                </h3>
                                <ImageUpload
                                  value={itinerary.itineraryImages.map(img => img.url)}
                                  disabled={loading}
                                  onChange={(url) => {
                                    const newItineraries = [...value];
                                    newItineraries[index] = {
                                      ...itinerary,
                                      itineraryImages: [...itinerary.itineraryImages, { url }]
                                    };
                                    onChange(newItineraries);
                                  }}
                                  onRemove={(url) => {
                                    const newItineraries = [...value];
                                    newItineraries[index] = {
                                      ...itinerary,
                                      itineraryImages: itinerary.itineraryImages.filter(img => img.url !== url)
                                    };
                                    onChange(newItineraries);
                                  }}
                                />
                              </div>

                              {/* Accommodation selection removed; now managed fully in Hotels tab */}

                              <div className="md:col-span-2">
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-700">
                                  <MapPinIcon className="h-4 w-4 text-primary" />
                                  Activities
                                </h3>
                                {itinerary.activities.map((activity, activityIndex) => (
                                  <div key={activityIndex} className="mb-6 p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-sm font-medium text-slate-700">Activity {activityIndex + 1}</h4>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          const newItineraries = [...value];
                                          newItineraries[index].activities = newItineraries[index].activities.filter((_, idx: number) => idx !== activityIndex);
                                          onChange(newItineraries);
                                        }}
                                        className="h-8 px-3"
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Remove
                                      </Button>
                                    </div>
                                    <div className="space-y-4">
                                      <FormItem>
                                        <div className="space-y-4">
                                          <FormItem>
                                            <Select
                                              disabled={loading}
                                              onValueChange={(selectedActivityId) =>
                                                handleActivitySelection(selectedActivityId, index, activityIndex)
                                              }
                                            >
                                              <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select an Activity" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {activitiesMaster?.map((activityMaster) => (
                                                  <SelectItem key={activityMaster.id} value={activityMaster.id}>
                                                    {activityMaster.activityMasterTitle}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>

                                          {/* Activity Title */}
                                          <FormItem>
                                            <FormLabel>Activity Title</FormLabel>
                                            <FormControl>
                                              <Input
                                                disabled={loading}
                                                placeholder="Activity Title"
                                                value={activity.activityTitle || ''}
                                                onChange={(e) => {
                                                  const newItineraries = [...value];
                                                  newItineraries[index].activities[activityIndex] = {
                                                    ...newItineraries[index].activities[activityIndex],
                                                    activityTitle: e.target.value
                                                  };
                                                  onChange(newItineraries);
                                                }}
                                                onKeyDown={(e) => {
                                                  // Prevent keyboard events from bubbling up to accordion
                                                  e.stopPropagation();
                                                }}
                                                className="bg-white"
                                              />
                                            </FormControl>
                                          </FormItem>

                                          {/* Activity Description */}
                                          <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                              <Textarea
                                                disabled={loading}
                                                placeholder="Activity Description"
                                                value={activity.activityDescription || ''}
                                                onChange={(e) => {
                                                  const newItineraries = [...value];
                                                  newItineraries[index].activities[activityIndex] = {
                                                    ...newItineraries[index].activities[activityIndex],
                                                    activityDescription: e.target.value
                                                  };
                                                  onChange(newItineraries);
                                                }}
                                                onKeyDown={(e) => {
                                                  // Prevent keyboard events from bubbling up to accordion
                                                  e.stopPropagation();
                                                }}
                                                className="bg-white min-h-[100px]"
                                              />
                                            </FormControl>
                                          </FormItem>

                                          {/* Activity Images */}
                                          <FormItem>
                                            <FormLabel>Activity Images</FormLabel>
                                            <div className="bg-slate-50 p-3 rounded-md">
                                              <ImageUpload
                                                value={activity.activityImages?.map(img => img.url) || []}
                                                disabled={loading}
                                                onChange={(url) => {
                                                  const newItineraries = [...value];
                                                  if (!newItineraries[index].activities[activityIndex].activityImages) {
                                                    newItineraries[index].activities[activityIndex].activityImages = [];
                                                  }
                                                  newItineraries[index].activities[activityIndex].activityImages.push({ url });
                                                  onChange(newItineraries);
                                                }}
                                                onRemove={(url) => {
                                                  const newItineraries = [...value];
                                                  newItineraries[index].activities[activityIndex].activityImages =
                                                    newItineraries[index].activities[activityIndex].activityImages?.filter(img => img.url !== url) || [];
                                                  onChange(newItineraries);
                                                }}
                                              />
                                            </div>
                                          </FormItem>
                                        </div>
                                      </FormItem>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-end mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={loading}
                                    onClick={() => {
                                      const newItineraries = [...value];
                                      newItineraries[index].activities = [
                                        ...newItineraries[index].activities,
                                        { activityTitle: '', activityDescription: '', activityImages: [] }
                                      ];
                                      onChange(newItineraries);
                                    }}
                                  >
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Activity
                                  </Button>
                                </div>

                                <Button
                                  type="button"
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
                        )}
                      </SortableWrapper>
                    ))}
                  </SortableContext>
                </DndContext>

                <Button
                  type="button"
                  size="default"
                  className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-dashed border-2 border-primary/30"
                  onClick={() => onChange([
                    ...value,
                    normalizeItinerary({
                      dayNumber: value.length + 1,
                      days: '',
                      itineraryImages: [],
                      itineraryTitle: '',
                      itineraryDescription: '',
                      activities: [],
                      roomAllocations: [],
                      transportDetails: [],
                      hotelId: '',
                      locationId: form.getValues('locationId') || ''
                    }, value.length)
                  ])}
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
  );
}

export default ItineraryTab;
