"use client";
import { useState, useEffect } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Plus, Trash2, Hotel as HotelIcon, Check, ChevronsUpDown, Sparkles, Copy, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PackageVariant {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sortOrder: number;
  priceModifier?: number;
  hotelMappings: {
    [itineraryId: string]: string; // itineraryId -> hotelId
  };
}

interface PackageVariantsTabProps {
  control: Control<any>;
  form: any;
  loading?: boolean;
  hotels: (Hotel & { images: Images[] })[];
}

const PackageVariantsTab: React.FC<PackageVariantsTabProps> = ({
  control,
  form,
  loading,
  hotels,
}) => {
  const itineraries = useWatch({ control, name: "itineraries" }) as any[] || [];
  
  // Initialize variants from form or use default
  const [variants, setVariants] = useState<PackageVariant[]>(() => {
    console.log('🎬 [VARIANTS INIT] Initializing PackageVariantsTab state...');
    try {
      if (form && typeof form.getValues === 'function') {
        const current = form.getValues("packageVariants");
        console.log('📋 [VARIANTS INIT] Current form value:', {
          exists: !!current,
          type: typeof current,
          isArray: Array.isArray(current),
          length: current?.length,
          data: current
        });
        
        if (current) {
          // If stored as string (older versions), parse it
          if (typeof current === 'string') {
            try {
              const parsed = JSON.parse(current);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('✅ [VARIANTS INIT] Loaded from parsed string:', parsed.length, 'variants');
                return parsed as PackageVariant[];
              }
            } catch (e) {
              console.warn('⚠️ [VARIANTS INIT] Failed to parse string format:', e);
              // ignore parse errors and fall through to default
            }
          } else if (Array.isArray(current) && current.length > 0) {
            console.log('✅ [VARIANTS INIT] Loaded from array:', current.length, 'variants');
            console.log('🏨 [VARIANTS INIT] Hotel mappings:', current.map(v => ({
              name: v.name,
              mappings: v.hotelMappings
            })));
            return current as PackageVariant[];
          }
        }
      }
    } catch (e) {
      console.error('❌ [VARIANTS INIT] Failed to initialize packageVariants from form:', e);
    }
    
    // Default variant if no data from form
    console.log('🆕 [VARIANTS INIT] Using default variant (no data in form)');
    return [{
      name: "Standard",
      description: "Standard package with good quality hotels",
      isDefault: true,
      sortOrder: 0,
      priceModifier: 0,
      hotelMappings: {},
    }];
  });
  
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [openHotelPopover, setOpenHotelPopover] = useState<string | null>(null);

  // Sync variants to form whenever they change
  useEffect(() => {
    try {
      if (form && typeof form.setValue === 'function') {
        console.log('🔄 [VARIANTS SYNC] Syncing variants to form:', {
          variantsCount: variants.length,
          variants: variants.map(v => ({
            name: v.name,
            hotelMappingsCount: Object.keys(v.hotelMappings || {}).length,
            hotelMappings: v.hotelMappings
          }))
        });
        form.setValue("packageVariants", variants, { shouldValidate: false, shouldDirty: true });
      }
    } catch (e) {
      console.error('Failed to sync packageVariants to form:', e);
    }
  }, [variants, form]);

  const addVariant = () => {
    const newVariant: PackageVariant = {
      name: `Variant ${variants.length + 1}`,
      description: "",
      isDefault: false,
      sortOrder: variants.length,
      priceModifier: 0,
      hotelMappings: {},
    };
    setVariants([...variants, newVariant]);
    setActiveVariantIndex(variants.length);
  };

  const deleteVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("Cannot delete the last variant");
      return;
    }
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    if (activeVariantIndex >= updated.length) {
      setActiveVariantIndex(updated.length - 1);
    }
  };

  const updateVariant = (index: number, updates: Partial<PackageVariant>) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], ...updates };
    setVariants(updated);
  };

  const updateHotelMapping = (variantIndex: number, itineraryId: string, hotelId: string) => {
    // Use dayNumber as the stable mapping key when possible to avoid orphaned mappings
    const itinerary = itineraries.find(i => i.id === itineraryId);
    const key = itinerary && typeof itinerary.dayNumber === 'number' ? String(itinerary.dayNumber) : itineraryId;
    console.log('🏨 [HOTEL MAPPING] Updating hotel:', {
      variantIndex,
      variantName: variants[variantIndex]?.name,
      itineraryId,
      mappingKey: key,
      hotelId,
      hotelName: hotels.find(h => h.id === hotelId)?.name
    });
    const updated = [...variants];
    updated[variantIndex].hotelMappings = { ...(updated[variantIndex].hotelMappings || {}) };
    updated[variantIndex].hotelMappings[key] = hotelId;
    console.log('🏨 [HOTEL MAPPING] Updated mappings:', updated[variantIndex].hotelMappings);
    setVariants(updated);
  };

  const copyFirstVariantHotels = () => {
    if (variants.length <= 1) return;
    const firstVariantMappings = variants[0].hotelMappings;
    const updated = variants.map((variant, idx) => {
      if (idx === 0) return variant;
      return {
        ...variant,
        hotelMappings: { ...firstVariantMappings },
      };
    });
    setVariants(updated);
    alert("Hotels from first variant copied to all variants");
  };

  const activeVariant = variants[activeVariantIndex];

  if (itineraries.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-sm">No itineraries added yet</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Add day-wise itineraries first in the Itinerary tab before creating package variants.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Package Variants
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Create multiple package tiers (Luxury, Premium, Standard) with different hotels
              </p>
            </div>
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">
              {variants.length} Variant{variants.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1"
            disabled={loading}
            onClick={addVariant}
          >
            <Plus className="h-3.5 w-3.5" /> Add Variant
          </Button>
          {variants.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs flex items-center gap-1 border-primary/40 hover:bg-primary/10"
              disabled={loading}
              onClick={copyFirstVariantHotels}
            >
              <Copy className="h-3.5 w-3.5" /> Copy First Variant Hotels
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Package variants allow you to offer the same itinerary with different hotel options. Perfect for offering Luxury, Premium, and Standard packages.
        </AlertDescription>
      </Alert>

      {/* Variants Tabs */}
      <Tabs value={activeVariantIndex.toString()} onValueChange={(v) => setActiveVariantIndex(parseInt(v))}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
          {variants.map((variant, index) => (
            <TabsTrigger key={index} value={index.toString()} className="text-xs">
              {variant.name}
              {variant.isDefault && <Badge className="ml-1 h-4 px-1 text-[10px]">Default</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {variants.map((variant, variantIndex) => (
          <TabsContent key={variantIndex} value={variantIndex.toString()} className="space-y-4">
            {/* Variant Settings */}
            <Card>
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-t-md">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Variant Settings</span>
                  {variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteVariant(variantIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Variant Name *</Label>
                    <Input
                      placeholder="e.g., Luxury, Premium, Standard"
                      value={variant.name}
                      onChange={(e) => updateVariant(variantIndex, { name: e.target.value })}
                      className="text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Price Modifier (%)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 50 for 50% increase"
                      value={variant.priceModifier || 0}
                      onChange={(e) => updateVariant(variantIndex, { priceModifier: parseFloat(e.target.value) || 0 })}
                      className="text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    placeholder="Describe what makes this variant special..."
                    value={variant.description || ""}
                    onChange={(e) => updateVariant(variantIndex, { description: e.target.value })}
                    className="text-sm min-h-[60px]"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`default-${variantIndex}`}
                    checked={variant.isDefault}
                    onCheckedChange={(checked) => {
                      const updated = variants.map((v, i) => ({
                        ...v,
                        isDefault: i === variantIndex ? Boolean(checked) : false,
                      }));
                      setVariants(updated);
                    }}
                    disabled={loading}
                  />
                  <Label htmlFor={`default-${variantIndex}`} className="text-xs font-normal cursor-pointer">
                    Set as default variant
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Hotel Assignments */}
            <Card>
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent rounded-t-md">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HotelIcon className="h-4 w-4 text-orange-600" /> Hotel Assignments
                </CardTitle>
                {Object.keys(variant.hotelMappings).length === 0 && (
                  <p className="text-xs text-orange-600 mt-1 font-normal">
                    ⚠️ No hotels assigned yet. Please select a hotel for each day below.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {itineraries.map((itinerary, itineraryIndex) => {
                  // Support mappings keyed by itinerary.id or by dayNumber (string)
                  const selectedHotelId = variant.hotelMappings[itinerary.id] || variant.hotelMappings[String(itinerary.dayNumber)] || "";
                  const selectedHotel = hotels.find(h => h.id === selectedHotelId);
                  const popoverKey = `${variantIndex}-${itinerary.id}`;
                  const isOpen = openHotelPopover === popoverKey;

                  return (
                    <div key={itinerary.id || itineraryIndex} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 font-semibold">
                              {itinerary.dayNumber || itineraryIndex + 1}
                            </Badge>
                            <span className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itineraryIndex + 1}` }} />
                          </div>
                          {itinerary.days && (
                            <p className="text-xs text-muted-foreground mt-1 ml-8">{itinerary.days}</p>
                          )}
                        </div>
                      </div>
                      <div className="ml-8">
                        <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-600 mb-2 block">Select Hotel</Label>
                        <Popover open={isOpen} onOpenChange={(o) => setOpenHotelPopover(o ? popoverKey : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full justify-between bg-white hover:bg-orange-50/50 transition"
                              disabled={loading}
                            >
                              <span className="truncate text-xs font-medium">
                                {selectedHotel ? selectedHotel.name : 'Choose hotel'}
                              </span>
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search hotel..." className="text-xs" />
                              <CommandList className="max-h-60 overflow-auto">
                                <CommandEmpty>No hotel found.</CommandEmpty>
                                <CommandGroup>
                                  {hotels.map(h => (
                                    <CommandItem
                                      key={h.id}
                                      value={h.name}
                                      onSelect={() => {
                                        updateHotelMapping(variantIndex, itinerary.id, h.id);
                                        setOpenHotelPopover(null);
                                      }}
                                      className="text-xs"
                                    >
                                      {h.images?.[0]?.url && (
                                        <Image
                                          src={h.images[0].url}
                                          alt={h.name}
                                          width={28}
                                          height={20}
                                          className="mr-2 rounded object-cover"
                                        />
                                      )}
                                      <span className="truncate flex-1">{h.name}</span>
                                      {selectedHotelId === h.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedHotel && selectedHotel.images?.[0]?.url && (
                          <div className="mt-2">
                            <Image
                              src={selectedHotel.images[0].url}
                              alt={selectedHotel.name}
                              width={120}
                              height={80}
                              className="rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {variants.map((variant, index) => {
            // Count only valid hotel mappings (where itinerary still exists)
            const validMappings = Object.entries(variant.hotelMappings).filter(([itinId, hotelId]) => {
              const itineraryExists = itineraries.some(itin => itin.id === itinId);
              const hotelExists = hotels.some(h => h.id === hotelId);
              return itineraryExists && hotelExists;
            });
            const assignedCount = validMappings.length;
            const totalDays = itineraries.length;
            const isComplete = assignedCount === totalDays;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{variant.name}</span>
                  <Badge variant={isComplete ? "default" : "destructive"} className="text-xs">
                    {assignedCount}/{totalDays} Hotels Assigned
                  </Badge>
                </div>
                {assignedCount > 0 && (
                  <div className="ml-2 space-y-1 text-[10px] text-muted-foreground">
                    {validMappings.map(([itinId, hotelId]) => {
                      const itinerary = itineraries.find(i => i.id === itinId);
                      const hotel = hotels.find(h => h.id === hotelId);
                      return (
                        <div key={itinId} className="flex items-center gap-2">
                          <Badge variant="outline" className="h-4 w-4 rounded-full flex items-center justify-center p-0 text-[9px]">
                            {itinerary?.dayNumber}
                          </Badge>
                          <span className="truncate">{hotel?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* packageVariants is synced to the form using form.setValue - no hidden input required */}
    </div>
  );
};

export default PackageVariantsTab;
