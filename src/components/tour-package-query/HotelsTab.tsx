"use client";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Image from "next/image";
import { useState } from "react";
import { Car, Check, Hotel as HotelIcon, Plus, Trash, Users, ChevronsUpDown } from "lucide-react";

interface HotelsTabProps {
  control: Control<any>;
  form: any; // Use any to avoid circular type import
  loading: boolean;
  hotels: (Hotel & { images: Images[] })[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
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
  const daysMissingHotel = itineraries.reduce((acc, it, idx) => !it?.hotelId ? acc + 1 : acc, 0);
  const [openHotelIndex, setOpenHotelIndex] = useState<number | null>(null);

  const addRoomAllocation = (dayIdx: number) => {
    const current = form.getValues(`itineraries.${dayIdx}.roomAllocations`) || [];
    form.setValue(`itineraries.${dayIdx}.roomAllocations`, [...current, { roomTypeId: '', occupancyTypeId: '', mealPlanId: '', quantity: 1 }]);
  };
  const removeRoomAllocation = (dayIdx: number, idx: number) => {
    const current = form.getValues(`itineraries.${dayIdx}.roomAllocations`) || [];
    form.setValue(`itineraries.${dayIdx}.roomAllocations`, current.filter((_: any, i: number) => i !== idx));
  };
  const addTransportDetail = (dayIdx: number) => {
    const current = form.getValues(`itineraries.${dayIdx}.transportDetails`) || [];
    form.setValue(`itineraries.${dayIdx}.transportDetails`, [...current, { vehicleTypeId: '', quantity: 1 }]);
  };
  const removeTransportDetail = (dayIdx: number, idx: number) => {
    const current = form.getValues(`itineraries.${dayIdx}.transportDetails`) || [];
    form.setValue(`itineraries.${dayIdx}.transportDetails`, current.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {itineraries.length > 1 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shadow-sm border-primary hover:bg-primary/10 transition-all flex items-center gap-2"
            onClick={() => {
              if (itineraries.length <= 1) return;
              const firstDay = itineraries[0];
              const roomAllocations = firstDay.roomAllocations || [];
              const transportDetails = firstDay.transportDetails || [];
              const updated = itineraries.map((it, idx) => idx === 0 ? it : ({
                ...it,
                roomAllocations: JSON.parse(JSON.stringify(roomAllocations)),
                transportDetails: JSON.parse(JSON.stringify(transportDetails))
              }));
              form.setValue('itineraries', updated);
              alert('Room allocations and transport details copied to all days');
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0-2 2v8a2 2 0 002 2z" />
            </svg>
            Apply First Day Room Allocations & Transport
          </Button>
        </div>
      )}
      {itineraries.length === 0 && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-sm">No itineraries added yet</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Add day wise itineraries first in the Itinerary tab to assign hotels, rooms & transport.
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
      <Accordion type="multiple" className="space-y-4">
        {itineraries.map((it, index) => {
          const rooms = (it.roomAllocations || []) as any[];
            const transports = (it.transportDetails || []) as any[];
          return (
            <AccordionItem key={index} value={`day-${index}`} className="border rounded-md">
              <AccordionTrigger className="px-4">
                <div className="flex flex-col items-start gap-1 w-full text-left">
                  <div className="flex items-center gap-2">
                    <Badge variant={it.hotelId ? "outline" : "destructive"} className={!it.hotelId ? 'animate-pulse' : ''}>
                      Day {it.dayNumber || index + 1}{!it.hotelId && ' • No Hotel'}
                    </Badge>
                    <span className="font-medium text-sm line-clamp-1" dangerouslySetInnerHTML={{ __html: it.itineraryTitle || '' }} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {it.hotelId && (
                      <Badge variant="secondary" className="flex items-center gap-1"><HotelIcon className="h-3 w-3" />{hotels.find(h=>h.id===it.hotelId)?.name || 'Hotel'}</Badge>
                    )}
                    {rooms.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1"><Users className="h-3 w-3" />{rooms.length} rooms</Badge>
                    )}
                    {transports.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1"><Car className="h-3 w-3" />{transports.length} transports</Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 px-4 pb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><HotelIcon className="h-4 w-4" />Hotel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField
                      control={control as any}
                      name={`itineraries.${index}.hotelId` as any}
                      render={({ field }) => {
                        const selectedHotel = hotels.find(h => h.id === field.value);
                        const open = openHotelIndex === index;
                        return (
                          <FormItem>
                            <FormLabel className="text-xs">Select Hotel</FormLabel>
                            <Popover open={open} onOpenChange={(o)=> setOpenHotelIndex(o? index : null)}>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                                  <span className="truncate text-xs">{selectedHotel ? selectedHotel.name : 'Choose hotel'}</span>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Room Allocations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rooms.map((room, rIndex) => (
                      <Card key={rIndex} className="border-muted/40">
                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs">Room {rIndex + 1}</CardTitle>
                          <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={()=> removeRoomAllocation(index, rIndex)}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-0 grid gap-3 md:grid-cols-5">
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
                        </CardContent>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=> addRoomAllocation(index)} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Add Room Allocation
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" />Transport Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {transports.map((tr, tIndex) => (
                      <Card key={tIndex} className="border-muted/40">
                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs">Vehicle {tIndex + 1}</CardTitle>
                          <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={()=> removeTransportDetail(index, tIndex)}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-0 grid gap-3 md:grid-cols-3">
                          <FormField control={control as any} name={`itineraries.${index}.transportDetails.${tIndex}.vehicleTypeId` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] uppercase tracking-wide">Vehicle Type</FormLabel>
                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vehicle" /></SelectTrigger></FormControl>
                                  <SelectContent>{vehicleTypes.map(v=> <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField control={control as any} name={`itineraries.${index}.transportDetails.${tIndex}.quantity` as any}
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
                        </CardContent>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={()=> addTransportDetail(index)} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Add Transport Detail
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  );
};

export default HotelsTab;
