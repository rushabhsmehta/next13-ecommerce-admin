"use client";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Image from "next/image";
import { useState } from "react";
import { Car, Check, Hotel as HotelIcon, Plus, Trash, ChevronsUpDown, LayoutGrid, List, Sparkles, Building2, Copy, BedDouble, Users, Receipt } from "lucide-react";
import { MealPlan, OccupancyType, RoomType, VehicleType } from "@prisma/client";

interface HotelsTabProps {
  control: Control<any>;
  form: any; // Use any to avoid circular type import
  loading: boolean;
  hotels: (Hotel & { images: Images[] })[];
  roomTypes?: RoomType[];
  occupancyTypes?: OccupancyType[];
  mealPlans?: MealPlan[];
  vehicleTypes?: VehicleType[];
}

const HotelsTab: React.FC<HotelsTabProps> = ({
  control,
  form,
  loading,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
}) => {
  const itineraries = useWatch({ control, name: "itineraries" }) as any[] || [];
  // Derived stats
  const assignedHotels = itineraries.reduce((sum, it: any) => sum + (it.hotelId ? 1 : 0), 0);
  const daysMissingHotel = itineraries.reduce((acc, it: any) => !it?.hotelId ? acc + 1 : acc, 0);
  const [openHotelIndex, setOpenHotelIndex] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const allAccordionValues = itineraries.map((_: any, i: number) => `day-${i}`);

  // Accent color classes (explicit list so Tailwind doesn't purge)
  const accentBarClasses = [
    'before:bg-primary/80',
    'before:bg-emerald-500/80',
    'before:bg-sky-500/80',
    'before:bg-violet-500/80',
    'before:bg-amber-500/80',
    'before:bg-rose-500/80',
  ];

  const addRoomAllocation = (itineraryIndex: number) => {
    const currentItineraries = form.getValues('itineraries');
    const targetItinerary = currentItineraries[itineraryIndex];
    const newAllocations = [
      ...(targetItinerary.roomAllocations || []),
      { roomTypeId: '', occupancyTypeId: '', mealPlanId: '', quantity: 1, useCustomRoomType: false, customRoomType: '', voucherNumber: '' }
    ];
    form.setValue(`itineraries.${itineraryIndex}.roomAllocations`, newAllocations);
  };

  const removeRoomAllocation = (itineraryIndex: number, allocationIndex: number) => {
    const currentItineraries = form.getValues('itineraries');
    const targetItinerary = currentItineraries[itineraryIndex];
    const newAllocations = (targetItinerary.roomAllocations || []).filter((_: any, i: number) => i !== allocationIndex);
    form.setValue(`itineraries.${itineraryIndex}.roomAllocations`, newAllocations);
  };

  return (
    <div className="space-y-5">
      {/* Overview */}
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Hotels
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Centralized allocation management
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">Days: {itineraries.length}</Badge>
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">Hotels: {assignedHotels}/{itineraries.length}</Badge>
            {daysMissingHotel > 0 && (
              <Badge variant="destructive" className="animate-pulse text-xs">Unassigned: {daysMissingHotel}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 flex flex-wrap gap-3">
          {itineraries.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs flex items-center gap-1 border-primary/40 hover:bg-primary/10"
              onClick={() => {
                if (itineraries.length <= 1) return;
                const firstDay = itineraries[0];
                const hotelId = firstDay.hotelId || null;
                const updated = itineraries.map((it: any, idx: number) => idx === 0 ? it : ({
                  ...it,
                  hotelId: hotelId,
                }));
                form.setValue('itineraries', updated);
                alert('Hotel selection copied to all days');
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy First Day Hotel
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1"
            onClick={() => setExpandAll(e => !e)}
          >
            {expandAll ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
        </CardContent>
      </Card>
      {itineraries.length === 0 && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-sm">No itineraries added yet</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Add day wise itineraries first in the Itinerary tab to assign hotels.
          </CardContent>
        </Card>
      )}
      {daysMissingHotel > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-amber-800">{daysMissingHotel} day{daysMissingHotel>1?'s':''} missing hotel assignment</CardTitle>
          </CardHeader>
        </Card>
      )}
      <Accordion type="multiple" value={expandAll ? allAccordionValues : undefined} className="space-y-4">
        {itineraries.map((it, index) => {
          const accent = accentBarClasses[index % accentBarClasses.length];
          return (
            <AccordionItem
              key={index}
              value={`day-${index}`}
              className={`relative border rounded-md overflow-hidden transition shadow-sm pl-0 ${!it.hotelId ? 'border-rose-200 bg-rose-50/40' : 'bg-white hover:shadow-md'} before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
            >
              <AccordionTrigger className="px-4 py-3 data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/5 data-[state=open]:to-primary/10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border ${it.hotelId ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'}`}>{(it.dayNumber || index + 1)}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" dangerouslySetInnerHTML={{ __html: it.itineraryTitle || `Day ${index+1}` }} />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.hotelId ? (
                          <Badge className="h-5 px-1.5 flex items-center gap-1 bg-gradient-to-r from-primary/90 to-primary text-white"><HotelIcon className="h-3 w-3" /> {hotels.find(h=>h.id===it.hotelId)?.name || 'Hotel'}</Badge>
                        ) : (
                          <Badge variant="destructive" className="h-5 px-1.5 animate-pulse bg-rose-500 text-white">Hotel?</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-6 pt-4 bg-gradient-to-b from-white to-slate-50/60 border-t">
                <Card>
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-t-md">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold"><HotelIcon className="h-4 w-4 text-primary" />Hotel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={control as any}
                      name={`itineraries.${index}.hotelId` as any}
                      render={({ field }) => {
                        const selectedHotel = hotels.find(h => h.id === field.value);
                        const open = openHotelIndex === index;
                        return (
                          <FormItem>
                            <FormLabel className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Select Hotel</FormLabel>
                            <Popover open={open} onOpenChange={(o)=> setOpenHotelIndex(o? index : null)}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="w-full justify-between bg-white hover:bg-primary/5 transition">
                                  <span className="truncate text-xs font-medium">{selectedHotel ? selectedHotel.name : 'Choose hotel'}</span>
                                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[320px] p-0" align="start">
                                <Command onKeyDownCapture={e=>e.stopPropagation()}>
                                  <CommandInput placeholder="Search hotel..." className="text-xs" />
                                  <CommandList className="max-h-60 overflow-auto">
                                    <CommandEmpty>No hotel found.</CommandEmpty>
                                    <CommandGroup>
                                      {hotels.map(h => (
                                        <CommandItem key={h.id} value={h.name} onSelect={()=> { field.onChange(h.id); setOpenHotelIndex(null); }} className="text-xs">
                                          {h.images?.[0]?.url && (
                                            <Image src={h.images[0].url} alt={h.name} width={28} height={20} className="mr-2 rounded object-cover" />
                                          )}
                                          <span className="truncate flex-1">{h.name}</span>
                                          {field.value === h.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                    {(() => {
                      const selected = hotels.find(h => h.id === it.hotelId);
                      if (!selected) return null;
                      const imgs = selected.images?.slice(0,4) || [];
                      if (!imgs.length) return null;
                      return (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {imgs.map((img, idx) => (
                            <div key={idx} className="relative h-16 w-full rounded-md overflow-hidden border bg-slate-100">
                              <Image src={img.url} alt={selected.name} fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {roomTypes && occupancyTypes && mealPlans && (
                <Card>
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-100 via-emerald-50 to-transparent rounded-t-md">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-emerald-600" />Room Allocations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {(it.roomAllocations || []).map((room: any, rIndex: number) => (
                      <Card key={rIndex} className="border-muted/40 shadow-sm hover:shadow-md transition">
                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between bg-slate-50/60">
                          <CardTitle className="text-xs font-medium flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-primary" />Room {rIndex + 1}</CardTitle>
                          <Button type="button" variant="ghost" size="icon" className="hover:text-red-600" disabled={loading} onClick={()=> removeRoomAllocation(index, rIndex)}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-3 space-y-3">
                          {/* Custom Room Type Toggle */}
                          <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.useCustomRoomType` as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      // Clear the opposite field when toggling
                                      if (checked) {
                                        // Switching to custom - clear roomTypeId
                                        form.setValue(`itineraries.${index}.roomAllocations.${rIndex}.roomTypeId`, "");
                                      } else {
                                        // Switching to dropdown - clear customRoomType
                                        form.setValue(`itineraries.${index}.roomAllocations.${rIndex}.customRoomType`, "");
                                      }
                                    }}
                                    disabled={loading}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-medium text-gray-700 cursor-pointer">
                                  Custom Room Type
                                </FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Main Fields Grid */}
                          <div className="grid gap-3 md:grid-cols-4">
                            {/* Room Type - Conditional */}
                            {(() => {
                              const useCustom = form.watch(`itineraries.${index}.roomAllocations.${rIndex}.useCustomRoomType`);
                              if (useCustom) {
                                return (
                                  <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.customRoomType` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-[10px] uppercase tracking-wide">Custom Room Type</FormLabel>
                                        <FormControl>
                                          <Input 
                                            placeholder="Enter room type" 
                                            className="h-8 text-xs" 
                                            {...field} 
                                            disabled={loading}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                );
                              } else {
                                return (
                                  <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.roomTypeId` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-[10px] uppercase tracking-wide">Room Type</FormLabel>
                                        <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                          <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Room" /></SelectTrigger></FormControl>
                                          <SelectContent>{roomTypes.map(rt=> <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                );
                              }
                            })()}
                            
                            <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.occupancyTypeId` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase tracking-wide">Occupancy</FormLabel>
                                  <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Occupancy" /></SelectTrigger></FormControl>
                                    <SelectContent>{occupancyTypes.map(o=> <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.mealPlanId` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase tracking-wide">Meal Plan</FormLabel>
                                  <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Meal" /></SelectTrigger></FormControl>
                                    <SelectContent>{mealPlans.map(mp=> <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.quantity` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] uppercase tracking-wide">Qty</FormLabel>
                                  <FormControl>
                                    <Input type="number" min={0} className="h-8 text-xs" value={field.value as any || ''} onChange={e=> field.onChange(parseInt(e.target.value) || 0)} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Voucher Number Field */}
                          <FormField control={control as any} name={`itineraries.${index}.roomAllocations.${rIndex}.voucherNumber` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase tracking-wide flex items-center gap-1">
                                  <Receipt className="h-3 w-3" />
                                  Hotel Voucher Number
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter hotel booking voucher number" 
                                    className="h-8 text-xs" 
                                    {...field} 
                                    disabled={loading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=> addRoomAllocation(index)} className="w-full border-dashed hover:border-solid">
                      <Plus className="h-4 w-4 mr-1" /> Add Room
                    </Button>
                  </CardContent>
                </Card>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  );
};

export default HotelsTab;
