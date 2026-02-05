"use client";
import { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images, PackageVariant, VariantHotelMapping, Itinerary, TourPackagePricing, PricingComponent, PricingAttribute, MealPlan, VehicleType, LocationSeasonalPeriod } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Hotel as HotelIcon, IndianRupee, Calendar, Info, AlertCircle, Edit2, Check, X, Utensils as UtensilsIcon, Car, Receipt, BedDouble, Users, Calculator } from "lucide-react";
import Image from "next/image";
import { formatSafeDate } from "@/lib/utils";
import { toast } from "react-hot-toast";

type VariantWithDetails = PackageVariant & {
  variantHotelMappings: (VariantHotelMapping & {
    hotel: Hotel & { images: Images[] };
    itinerary: Itinerary | null;
  })[];
  tourPackagePricings: (TourPackagePricing & {
    mealPlan: MealPlan | null;
    vehicleType: VehicleType | null;
    locationSeasonalPeriod: LocationSeasonalPeriod | null;
    pricingComponents: (PricingComponent & {
      pricingAttribute: PricingAttribute | null;
    })[];
  })[];
};

interface TourPackageWithVariants {
  id: string;
  tourPackageName: string | null;
  locationId: string | null;
  packageVariants?: VariantWithDetails[] | null;
  itineraries?: Itinerary[] | null;
}

interface QueryVariantsTabProps {
  control: Control<any>;
  form: any;
  loading?: boolean;
  tourPackages: TourPackageWithVariants[] | null;
  hotels: (Hotel & { images: Images[] })[];
  roomTypes?: any[];
  occupancyTypes?: any[];
  mealPlans?: any[];
  vehicleTypes?: any[];
}

const QueryVariantsTab: React.FC<QueryVariantsTabProps> = ({
  control,
  form,
  loading,
  tourPackages,
  hotels,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = [],
}) => {
  const selectedTourPackageId = useWatch({ control, name: "tourPackageTemplate" }) as string | undefined;
  const selectedVariantIds = useWatch({ control, name: "selectedVariantIds" }) as string[] | undefined;
  const variantHotelOverrides = useWatch({ control, name: "variantHotelOverrides" }) as Record<string, Record<string, string>> | undefined;
  const queryItineraries = useWatch({ control, name: "itineraries" }) as any[] | undefined; // Get query itineraries
  const queryStartDate = useWatch({ control, name: "startDate" });
  const queryEndDate = useWatch({ control, name: "endDate" });
  
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [tempHotelId, setTempHotelId] = useState<string>("");
  
  const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
  const allVariants = selectedTourPackage?.packageVariants || [];
  const selectedVariants = allVariants.filter(v => selectedVariantIds?.includes(v.id));
  
  const itineraries = selectedTourPackage?.itineraries || [];
  const locationId = selectedTourPackage?.locationId;
  const availableHotels = hotels.filter(h => h.locationId === locationId);

  if (!selectedTourPackageId) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please select a tour package from the <strong>Basic Info</strong> tab first to view variants.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!selectedVariants || selectedVariants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No variants selected. Please select package variants from the <strong>Basic Info</strong> tab to view their details here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEffectiveHotelId = (variantId: string, itineraryId: string, originalHotelId: string) => {
    return variantHotelOverrides?.[variantId]?.[itineraryId] || originalHotelId;
  };

  const handleStartEdit = (mappingId: string, currentHotelId: string) => {
    setEditingMapping(mappingId);
    setTempHotelId(currentHotelId);
  };

  const handleSaveHotelChange = (variantId: string, itineraryId: string, newHotelId: string) => {
    const currentOverrides = variantHotelOverrides || {};
    const variantOverrides = currentOverrides[variantId] || {};
    
    const updatedOverrides = {
      ...currentOverrides,
      [variantId]: {
        ...variantOverrides,
        [itineraryId]: newHotelId
      }
    };
    
    form.setValue('variantHotelOverrides', updatedOverrides);
    setEditingMapping(null);
    setTempHotelId("");
    toast.success("Hotel updated for this variant");
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setTempHotelId("");
  };

  return (
    <div className="space-y-5">
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Selected Package Variants
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-primary" /> 
              Variants from <strong className="font-semibold">{selectedTourPackage?.tourPackageName}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">
              Total: {selectedVariants.length}
            </Badge>
            {selectedVariants.some(v => v.isDefault) && (
              <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                Has Default
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={selectedVariants[0]?.id} className="w-full">
        <TabsList className="grid w-full mb-6 bg-gradient-to-r from-slate-100 to-slate-50 p-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(selectedVariants.length, 4)}, minmax(0, 1fr))` }}>
          {selectedVariants.map((variant) => (
            <TabsTrigger 
              key={variant.id} 
              value={variant.id} 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition"
            >
              <Sparkles className="h-3 w-3" />
              {variant.name}
              {variant.isDefault && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">Default</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedVariants.map((variant) => (
          <TabsContent key={variant.id} value={variant.id} className="space-y-6">
            {/* Variant Info */}
            <Card className="shadow-sm border border-primary/20 bg-gradient-to-br from-white to-primary/5">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Variant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Variant Name</span>
                    <span className="font-semibold text-base">{variant.name}</span>
                  </div>
                  {variant.priceModifier !== null && variant.priceModifier !== 0 && (
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Price Modifier</span>
                      <Badge 
                        variant={variant.priceModifier > 0 ? "default" : "secondary"} 
                        className="w-fit text-sm py-1 px-3 bg-gradient-to-r from-primary to-primary/80"
                      >
                        {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}%
                      </Badge>
                    </div>
                  )}
                  {variant.description && (
                    <div className="flex flex-col space-y-1.5 md:col-span-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Description</span>
                      <p className="text-sm leading-relaxed text-muted-foreground">{variant.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hotel Mappings */}
            <Card className="shadow-sm border border-slate-200/70">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-25 to-transparent">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                  <HotelIcon className="h-4 w-4 text-blue-600" />
                  Hotel Mappings ({variant.variantHotelMappings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {variant.variantHotelMappings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <HotelIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    No hotel mappings configured.
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-3">
                    {variant.variantHotelMappings
                      .slice()
                      .sort((a, b) => {
                        const itinA = a.itinerary || itineraries.find(it => it.id === a.itineraryId);
                        const itinB = b.itinerary || itineraries.find(it => it.id === b.itineraryId);
                        return (itinA?.dayNumber || 0) - (itinB?.dayNumber || 0);
                      })
                      .map((mapping, idx) => {
                      const itinerary = mapping.itinerary || itineraries.find(it => it.id === mapping.itineraryId);
                      const effectiveHotelId = getEffectiveHotelId(variant.id, mapping.itineraryId, mapping.hotelId);
                      const effectiveHotel = availableHotels.find(h => h.id === effectiveHotelId) || mapping.hotel;
                      const isEditing = editingMapping === mapping.id;
                      const isOverridden = variantHotelOverrides?.[variant.id]?.[mapping.itineraryId] !== undefined;
                      
                      // Accent color rotation
                      const accentColors = [
                        'before:bg-primary/80',
                        'before:bg-emerald-500/80',
                        'before:bg-sky-500/80',
                        'before:bg-violet-500/80',
                        'before:bg-amber-500/80',
                        'before:bg-rose-500/80',
                      ];
                      const accent = accentColors[idx % accentColors.length];
                      
                      return (
                        <AccordionItem 
                          key={mapping.id} 
                          value={mapping.id} 
                          className={`relative border rounded-md overflow-hidden shadow-sm bg-white hover:shadow-md transition pl-0 before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/5 data-[state=open]:to-primary/10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-white border border-primary/20 shadow-sm">
                                {itinerary?.dayNumber || idx + 1}
                              </div>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <HotelIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{effectiveHotel.name}</span>
                              </div>
                              {isOverridden && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 animate-pulse bg-amber-100 text-amber-700 border border-amber-200">
                                  Modified
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-5 pt-4 space-y-4 bg-gradient-to-b from-white to-slate-50/40 border-t">
                            {/* Hotel Images Grid */}
                            {effectiveHotel.images && effectiveHotel.images.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {effectiveHotel.images.slice(0, 4).map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative h-56 w-full rounded-md overflow-hidden border bg-slate-100 shadow-sm group">
                                    <Image
                                      src={img.url}
                                      alt={effectiveHotel.name}
                                      fill
                                      className="object-cover group-hover:scale-105 transition duration-500"
                                      sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Hotel Details */}
                            <Card className="border-muted/40 bg-slate-50/60">
                              <CardContent className="pt-3 pb-3">
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">City</span>
                                    <span className="font-medium text-slate-700">{'N/A'}</span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Rating</span>
                                    <span className="font-medium text-slate-700">
                                      {'N/A'}
                                    </span>
                                  </div>
                                  {/* address removed */}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Itinerary Info */}
                            {itinerary && (
                              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                                <CardContent className="pt-3 pb-3">
                                  <div className="flex items-start gap-2">
                                    <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div 
                                        className="font-semibold text-sm text-slate-800 [&>p]:m-0"
                                        dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || '' }} 
                                      />
                                      {itinerary.itineraryDescription && (
                                        <div 
                                          className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed prose prose-xs max-w-none text-slate-600 [&>p]:m-0"
                                          dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Room Allocations Section - NEW */}
                            {(() => {
                              // Find corresponding query itinerary for this day with defensive checks
                              let targetDayNumber: number | undefined;
                              if (itinerary && typeof itinerary.dayNumber === "number") {
                                targetDayNumber = itinerary.dayNumber;
                              } else {
                                targetDayNumber = idx + 1;
                                if (typeof window !== "undefined") {
                                  console.warn(
                                    "⚠️ [QueryVariantsTab] Falling back to index-based dayNumber for query itinerary match",
                                    {
                                      itineraryId: itinerary?.id,
                                      itineraryDayNumber: itinerary?.dayNumber,
                                      indexBasedDayNumber: targetDayNumber,
                                    }
                                  );
                                }
                              }

                              const queryItinerary = queryItineraries?.find(
                                (qi: any) => qi.dayNumber === targetDayNumber
                              );
                              const roomAllocations = queryItinerary?.roomAllocations || [];
                              
                              if (roomAllocations.length > 0) {
                                return (
                                  <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/40 to-transparent">
                                    <CardContent className="pt-4 pb-4">
                                      <div className="space-y-3">
                                        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                          <BedDouble className="h-3.5 w-3.5 text-blue-600" />
                                          Room Allocations ({roomAllocations.length})
                                        </div>
                                        {roomAllocations.map((room: any, roomIdx: number) => {
                                          const roomType = roomTypes?.find((rt: any) => rt.id === room.roomTypeId);
                                          const occupancyType = occupancyTypes?.find((ot: any) => ot.id === room.occupancyTypeId);
                                          const mealPlan = mealPlans?.find((mp: any) => mp.id === room.mealPlanId);
                                          
                                          return (
                                            <div 
                                              key={roomIdx} 
                                              className="flex items-start gap-3 py-2 px-3 bg-white/80 rounded-md border border-blue-100 text-xs"
                                            >
                                              <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                              <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50">
                                                    {room.customRoomType || roomType?.name || 'Room'}
                                                  </Badge>
                                                  {occupancyType && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                                      {occupancyType.name}
                                                    </Badge>
                                                  )}
                                                  {mealPlan && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                                      <UtensilsIcon className="h-2.5 w-2.5" />
                                                      {mealPlan.name}
                                                    </Badge>
                                                  )}
                                                  <span className="text-slate-600">×{room.quantity || 1}</span>
                                                </div>
                                                {room.guestNames && (
                                                  <div className="text-slate-600 text-[10px]">
                                                    Guests: {room.guestNames}
                                                  </div>
                                                )}
                                                {room.voucherNumber && (
                                                  <div className="text-slate-500 text-[10px]">
                                                    Voucher: {room.voucherNumber}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              }
                              return null;
                            })()}

                            {/* Hotel Change Controls */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {isEditing ? (
                                <Card className="flex-1 border-primary/30">
                                  <CardContent className="p-3 flex items-center gap-2">
                                    <Select value={tempHotelId} onValueChange={setTempHotelId}>
                                      <SelectTrigger className="flex-1 h-9 text-xs bg-white">
                                        <SelectValue placeholder="Select hotel" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableHotels.map((hotel) => (
                                          <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                              {hotel.images?.[0]?.url && (
                                                <Image src={hotel.images[0].url} alt={hotel.name} width={24} height={18} className="rounded object-cover" />
                                              )}
                                              <div className="flex flex-col">
                                                <span className="font-medium">{hotel.name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                  {/* Details removed */}
                                                </span>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleSaveHotelChange(variant.id, mapping.itineraryId, tempHotelId)}
                                      disabled={!tempHotelId}
                                      className="h-9 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                      className="h-9 px-3"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </CardContent>
                                </Card>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEdit(mapping.id, effectiveHotelId)}
                                  className="w-full h-9 text-xs hover:bg-primary/5 transition"
                                >
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Change Hotel
                                </Button>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Pricing Details */}
            <Card className="shadow-sm border border-slate-200/70">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 via-emerald-25 to-transparent">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  Pricing Details ({variant.tourPackagePricings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {variant.tourPackagePricings.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pricing configured for this variant.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variant.tourPackagePricings.map((pricing, pIdx) => {
                      const totalPrice = pricing.pricingComponents.reduce(
                        (sum, comp) => sum + Number(comp.price || 0),
                        0
                      );
                      
                      return (
                        <Card key={pricing.id} className="border shadow-sm hover:shadow-md transition bg-white">
                          <CardContent className="pt-4 pb-4">
                            <div className="space-y-4">
                              {/* Date Range Header */}
                              <div className="flex items-center justify-between pb-3 border-b">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                                    {pIdx + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                      <span className="font-semibold text-xs">
                                        {new Date(pricing.startDate).toLocaleDateString('en-IN', { 
                                          day: '2-digit', 
                                          month: 'short', 
                                          year: 'numeric' 
                                        })}
                                        {' - '}
                                        {new Date(pricing.endDate).toLocaleDateString('en-IN', { 
                                          day: '2-digit', 
                                          month: 'short', 
                                          year: 'numeric' 
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {pricing.locationSeasonalPeriod && (
                                  <Badge variant="default" className="text-[10px] px-2 py-0.5 h-5 bg-gradient-to-r from-primary to-primary/80">
                                    {pricing.locationSeasonalPeriod.name}
                                  </Badge>
                                )}
                              </div>

                              {/* Configuration Badges */}
                              <div className="flex flex-wrap gap-2">
                                {pricing.mealPlan && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <UtensilsIcon className="h-3 w-3" />
                                    {pricing.mealPlan.name}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <HotelIcon className="h-3 w-3" />
                                  {pricing.numberOfRooms} Room{pricing.numberOfRooms > 1 ? 's' : ''}
                                </Badge>
                                {pricing.vehicleType && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Car className="h-3 w-3" />
                                    {pricing.vehicleType.name}
                                  </Badge>
                                )}
                                {pricing.isGroupPricing && (
                                  <Badge variant="secondary" className="text-xs">Group Pricing</Badge>
                                )}
                              </div>

                              {/* Pricing Components */}
                              {pricing.pricingComponents.length > 0 && (
                                <Card className="border-muted/40 bg-gradient-to-br from-emerald-50/40 to-transparent">
                                  <CardContent className="pt-4 pb-4 space-y-2">
                                    <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                                      <Receipt className="h-3 w-3" />
                                      Price Breakdown
                                    </div>
                                    {pricing.pricingComponents.map((component) => (
                                      <div 
                                        key={component.id} 
                                        className="flex justify-between items-center py-1.5 text-xs border-b border-dashed border-slate-200 last:border-0"
                                      >
                                        <span className="text-slate-600">
                                          {component.pricingAttribute?.name || 'Component'}
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {formatCurrency(Number(component.price || 0))}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-emerald-600/30">
                                      <span className="font-bold text-sm">Total</span>
                                      <span className="font-bold text-base text-emerald-700">
                                        {formatCurrency(totalPrice)}
                                      </span>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Description */}
                              {pricing.description && (
                                <Card className="bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900">
                                  <CardContent className="pt-3 pb-3">
                                    <div className="text-xs text-blue-900 dark:text-blue-100 flex items-start gap-2">
                                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span className="leading-relaxed">{pricing.description}</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Summary Card - NEW */}
            {variant.tourPackagePricings.length > 0 && (
              <Card className="shadow-sm border border-emerald-200/70 bg-gradient-to-br from-emerald-50/30 to-white">
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 via-emerald-25 to-transparent">
                  <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    Price Calculation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {(() => {
                    // Calculate total across all pricing periods
                    const grandTotal = variant.tourPackagePricings.reduce((sum, pricing) => {
                      const periodTotal = pricing.pricingComponents.reduce(
                        (compSum, comp) => compSum + Number(comp.price || 0),
                        0
                      );
                      return sum + periodTotal;
                    }, 0);

                    // Apply price modifier to get adjusted grand total
                    const priceModifier = variant.priceModifier ?? 0;
                    const adjustedGrandTotal = grandTotal * (1 + priceModifier / 100);
                    const hasModifier = priceModifier !== 0;

                    const avgPricePerPeriod = grandTotal / variant.tourPackagePricings.length;
                    
                    // Get date range
                    const allDates = variant.tourPackagePricings.map(p => ({
                      start: new Date(p.startDate),
                      end: new Date(p.endDate)
                    }));
                    const earliestDate = allDates.length > 0 
                      ? new Date(Math.min(...allDates.map(d => d.start.getTime())))
                      : null;
                    const latestDate = allDates.length > 0
                      ? new Date(Math.max(...allDates.map(d => d.end.getTime())))
                      : null;

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-white rounded-lg border border-emerald-100">
                            <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                              Total Pricing Periods
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">
                              {variant.tourPackagePricings.length}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-emerald-100">
                            <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                              Avg. Price/Period
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">
                              {formatCurrency(avgPricePerPeriod)}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-emerald-100 md:col-span-1 col-span-2">
                            <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                              {hasModifier ? 'Base Total' : 'Grand Total'}
                            </div>
                            <div className="text-2xl font-bold text-emerald-700">
                              {formatCurrency(grandTotal)}
                            </div>
                          </div>
                          {hasModifier && (
                            <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-lg border-2 border-emerald-300 md:col-span-3 col-span-2">
                              <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">
                                Final Price (with {priceModifier > 0 ? '+' : ''}{priceModifier}% modifier)
                              </div>
                              <div className="text-2xl font-bold text-emerald-800">
                                {formatCurrency(adjustedGrandTotal)}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {earliestDate && latestDate && (
                          <div className="p-3 bg-gradient-to-r from-blue-50/50 to-transparent rounded-lg border border-blue-100">
                            <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-2">
                              Pricing Date Range
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">
                                {earliestDate.toLocaleDateString('en-IN', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                                {' - '}
                                {latestDate.toLocaleDateString('en-IN', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default QueryVariantsTab;
