"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Package, Utensils, BedDouble, Calculator, FileDown, Check, ArrowRight, ArrowLeft, AlertTriangle, User, CalendarDays, Phone, Car, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inquiry, TourPackage, MealPlan, RoomType, OccupancyType, VehicleType } from '@prisma/client';

// Schema for the automated query creation
const automatedQuerySchema = z.object({
  tourPackageId: z.string().min(1, "Please select a tour package"),
  mealPlanId: z.string().min(1, "Please select a meal plan"),
  roomAllocations: z.array(z.object({
    roomTypeId: z.string().optional(),
    occupancyTypeId: z.string().min(1),
    quantity: z.number().min(1),
    customRoomType: z.string().optional(),
    useCustomRoomType: z.boolean().default(false),
  })).min(1, "Please add at least one room allocation"),
  // Optional transport details for the query
  transportDetails: z.array(z.object({
    vehicleTypeId: z.string().optional(),
    quantity: z.number().min(1).default(1),
    isAirportPickupRequired: z.boolean().default(false).optional(),
    isAirportDropRequired: z.boolean().default(false).optional(),
    pickupLocation: z.string().optional().nullable(),
    dropLocation: z.string().optional().nullable(),
    requirementDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).default([]).optional(),
  tourPackageQueryNumber: z.string().optional(),
});

type AutomatedQueryFormData = z.infer<typeof automatedQuerySchema>;

interface AutomatedQueryCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  onSuccess?: (queryId: string) => void;
}

interface TourPackageExtended extends TourPackage {
  images: { url: string }[];
  itineraries: any[];
}

export const AutomatedQueryCreationDialog: React.FC<AutomatedQueryCreationDialogProps> = ({
  isOpen,
  onClose,
  inquiryId,
  onSuccess
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inquiry, setInquiry] = useState<any>(null);
  const [tourPackages, setTourPackages] = useState<TourPackageExtended[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [selectedTourPackage, setSelectedTourPackage] = useState<TourPackageExtended | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [priceCalculationDetails, setPriceCalculationDetails] = useState<any[]>([]);
  const [availablePricingComponents, setAvailablePricingComponents] = useState<any[]>([]);
  const [selectedPricingComponentIds, setSelectedPricingComponentIds] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Independent pricing component calculation state
  const [pricingMealPlanId, setPricingMealPlanId] = useState<string>('');
  const [pricingNumberOfRooms, setPricingNumberOfRooms] = useState<number>(1);
  const [componentRoomQuantities, setComponentRoomQuantities] = useState<Record<string, number>>({});
  // Debug logging state
  const [debugLog, setDebugLog] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugSessionId, setDebugSessionId] = useState<string>("");
  // Refs to avoid dependency loops and repeated loads
  const debugSessionIdRef = React.useRef<string>("");
  const dataLoaded = React.useRef<boolean>(false);
  const currentSessionId = React.useRef<string>("");

  // Helper to add structured logs (stable reference)
  // NOTE: Keep this callback stable (no deps) and read session id from ref to avoid
  // triggering useEffect re-runs when the session id changes.
  const addLog = React.useCallback((entry: {
    step: string;
    level?: 'info' | 'warn' | 'error';
    msg?: string;
    data?: any;
  }) => {
    const e = {
      t: new Date().toISOString(),
      id: debugSessionIdRef.current || 'unknown',
      level: entry.level || 'info',
      step: entry.step,
      msg: entry.msg || '',
      data: entry.data,
    };
    setDebugLog(prev => [...prev, e]);
    // Keep console logs too for dev tools
    const prefix = `[DBG:${e.id}] ${e.step}`;
    if (e.level === 'error') console.error(prefix, e.msg || '', e.data ?? '');
    else if (e.level === 'warn') console.warn(prefix, e.msg || '', e.data ?? '');
    else console.log(prefix, e.msg || '', e.data ?? '');
  }, []);

  const copyLogsToClipboard = async () => {
    const text = debugLog.map(l => JSON.stringify(l)).join('\n');
    await navigator.clipboard.writeText(text);
    toast.success('Debug logs copied');
  };

  const clearLogs = () => {
    setDebugLog([]);
    toast.success('Debug logs cleared');
  };

  const form = useForm<AutomatedQueryFormData>({
    resolver: zodResolver(automatedQuerySchema),
    defaultValues: {
      tourPackageId: '',
      mealPlanId: '',
  tourPackageQueryNumber: `TPQ-${Date.now()}`,
      roomAllocations: [
        {
          roomTypeId: '',
          occupancyTypeId: '',
          quantity: 1,
          customRoomType: '',
          useCustomRoomType: false,
        }
      ],
      transportDetails: [],
    },
  });

  // Flattened list of Zod/react-hook-form validation errors to show in a banner
  const zodErrorList = React.useMemo(() => {
    const errs: any = form.formState.errors as any;
    const list: string[] = [];
    if (!errs) return list;
    if (errs.tourPackageId?.message) list.push(String(errs.tourPackageId.message));
    if (errs.mealPlanId?.message) list.push(String(errs.mealPlanId.message));
    if (errs.roomAllocations?.message) list.push(String(errs.roomAllocations.message));
    if (Array.isArray(errs.roomAllocations)) {
      errs.roomAllocations.forEach((allocErr: any, idx: number) => {
        if (!allocErr) return;
        if (allocErr.roomTypeId?.message) list.push(`Room ${idx + 1}: ${allocErr.roomTypeId.message}`);
        if (allocErr.occupancyTypeId?.message) list.push(`Room ${idx + 1}: ${allocErr.occupancyTypeId.message}`);
        if (allocErr.quantity?.message) list.push(`Room ${idx + 1}: ${allocErr.quantity.message}`);
        if (allocErr.customRoomType?.message) list.push(`Room ${idx + 1}: ${allocErr.customRoomType.message}`);
      });
    }
    return list;
  }, [form.formState.errors]);

  // Initialize transport details from inquiry (if present) once inquiry loads
  useEffect(() => {
    if (!inquiry) return;
    const existing = form.getValues('transportDetails');
    const hasMeaningfulData = Array.isArray(existing) && existing.some(td => td?.vehicleTypeId || td?.pickupLocation || td?.dropLocation || td?.requirementDate || (td?.quantity && td.quantity > 0));
    if (!hasMeaningfulData && Array.isArray(inquiry.transportDetails) && inquiry.transportDetails.length > 0) {
      const mapped = inquiry.transportDetails.map((t: any) => ({
        vehicleTypeId: t.vehicleTypeId || undefined,
        quantity: t.quantity || 1,
        isAirportPickupRequired: !!t.isAirportPickupRequired,
        isAirportDropRequired: !!t.isAirportDropRequired,
        pickupLocation: t.pickupLocation || '',
        dropLocation: t.dropLocation || '',
        requirementDate: t.requirementDate || undefined,
        notes: t.notes || '',
      }));
      form.setValue('transportDetails', mapped);
      addLog({ step: 'transport/initFromInquiry', data: { count: mapped.length } });
    }
  }, [inquiry, form, addLog]);

  // Fetch required data when dialog opens (stabilized with guards to prevent loops)
  useEffect(() => {
    if (!isOpen) {
      // Reset guard when dialog closes so it can load again next time
      dataLoaded.current = false;
      return;
    }

    // Prevent multiple loads for the same open session
    if (dataLoaded.current && currentSessionId.current) {
      addLog({ step: 'fetchRequiredData/skip', msg: 'Data already loaded for this session' });
      return;
    }

    const sid = `DBG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDebugSessionId(sid);
    debugSessionIdRef.current = sid;
    currentSessionId.current = sid;
    addLog({ step: 'dialog/open', msg: 'Automated dialog opened' });

    (async () => {
      try {
        setLoading(true);
        addLog({ step: 'fetchRequiredData/start', data: { inquiryId } });

        // First fetch the inquiry data
        const inquiryRes = await axios.get(`/api/inquiries/${inquiryId}`);
        const inquiryData = inquiryRes.data;
        setInquiry(inquiryData);
        addLog({ step: 'fetchRequiredData/inquiry', data: { locationId: inquiryData.locationId, journeyDate: inquiryData.journeyDate } });

        // Then fetch all required data in parallel
        const [
          tourPackagesRes,
          mealPlansRes,
          roomTypesRes,
          occupancyTypesRes,
          vehicleTypesRes
        ] = await Promise.all([
          axios.get(`/api/tourPackages?locationId=${inquiryData.locationId}&isArchived=false`),
          axios.get('/api/config/meal-plans'),
          axios.get('/api/config/room-types'),
          axios.get('/api/config/occupancy-types'),
          axios.get('/api/config/vehicle-types'),
        ]);

        setTourPackages(tourPackagesRes.data);
        setMealPlans(mealPlansRes.data);
        setRoomTypes(roomTypesRes.data);
        setOccupancyTypes(occupancyTypesRes.data);
        setVehicleTypes(vehicleTypesRes.data);
        addLog({ step: 'fetchRequiredData/success', data: {
          tourPackages: tourPackagesRes.data?.length ?? 0,
          mealPlans: mealPlansRes.data?.length ?? 0,
          roomTypes: roomTypesRes.data?.length ?? 0,
          occupancyTypes: occupancyTypesRes.data?.length ?? 0,
          vehicleTypes: vehicleTypesRes.data?.length ?? 0,
        }});
        // Mark as loaded for this session
        dataLoaded.current = true;
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data');
        addLog({ step: 'fetchRequiredData/error', level: 'error', msg: (error as any)?.message, data: (error as any)?.response?.data || String(error) });
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, inquiryId, addLog]);
  const getOccupancyMultiplier = (componentName: string): number => {
    const name = componentName.toLowerCase();
    
    if (name.includes('single')) {
      return 1;
    } else if (name.includes('double')) {
      return 2;
    } else if (name.includes('triple')) {
      return 3;
    } else if (name.includes('quad')) {
      return 4;
    }
    
    // Default to 1 if no occupancy type is detected
    return 1;
  };

  // Function to fetch available pricing components (like the screenshot interface)
  const fetchAvailablePricingComponents = async () => {
    setIsCalculatingPrice(true);
    try {
      if (!selectedTourPackage) {
        toast.error('Please select a tour package first');
        addLog({ step: 'fetchComponents/guard', level: 'warn', msg: 'No tour package selected' });
        return;
      }
      if (!inquiry) {
        toast.error('Inquiry data not loaded');
        addLog({ step: 'fetchComponents/guard', level: 'warn', msg: 'Inquiry not loaded' });
        return;
      }
      if (!pricingMealPlanId) {
        toast.error('Please select a meal plan for pricing');
        addLog({ step: 'fetchComponents/guard', level: 'warn', msg: 'No pricing meal plan selected' });
        return;
      }
      if (pricingNumberOfRooms <= 0) {
        toast.error('Please set a valid number of rooms for pricing');
        addLog({ step: 'fetchComponents/guard', level: 'warn', msg: 'Invalid pricing room count' });
        return;
      }

      // Fetch pricing data for the selected tour package
      addLog({ step: 'fetchComponents/pricingRequest', data: { tourPackageId: selectedTourPackage.id } });
      const response = await axios.get(`/api/tourPackages/${selectedTourPackage.id}/pricing`);
      const tourPackagePricings = response.data || [];
      addLog({ step: 'fetchComponents/pricingPeriods', data: { count: tourPackagePricings.length } });

      if (!Array.isArray(tourPackagePricings) || tourPackagePricings.length === 0) {
        toast.error('No pricing periods found for the selected tour package');
        setAvailablePricingComponents([]);
        return;
      }

      // Filter matching pricing periods based on date, meal plan, and number of rooms
      const queryDate = new Date(inquiry.journeyDate);
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = new Date(p.startDate);
        const periodEnd = new Date(p.endDate);
        const isDateMatch = queryDate >= periodStart && queryDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === pricingMealPlanId;
        const isRoomMatch = p.numberOfRooms === pricingNumberOfRooms;
        return isDateMatch && isMealPlanMatch && isRoomMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing period found for the selected criteria (Date, Meal Plan, ${pricingNumberOfRooms} Room${pricingNumberOfRooms > 1 ? 's' : ''}).`);
        setAvailablePricingComponents([]);
        addLog({ step: 'fetchComponents/noMatch', level: 'warn', data: {
          date: queryDate.toISOString().split('T')[0], 
          totalRooms: pricingNumberOfRooms,
          mealPlanId: pricingMealPlanId
        }});
        return;
      }

      if (matchedPricings.length > 1) {
        console.warn('Multiple matching pricing periods found:', matchedPricings);
        toast.error('Multiple pricing periods match the criteria. Cannot automatically fetch components. Please refine Tour Package pricing definitions.');
        setAvailablePricingComponents([]);
        addLog({ step: 'fetchComponents/multiMatch', level: 'warn', data: { matchedPricingIds: matchedPricings.map((p:any)=>p.id) } });
        return;
      }

      // Get components from the matched pricing
      const selectedPricing = matchedPricings[0];
      const components = selectedPricing.pricingComponents || [];
      setAvailablePricingComponents(components);

      // Initially select all components
      const allComponentIds = components.map((comp: any) => comp.id);
      setSelectedPricingComponentIds(allComponentIds);

      // Initialize room quantities for all components (default to 1)
      const initialQuantities: Record<string, number> = {};
      components.forEach((comp: any) => {
        initialQuantities[comp.id] = 1;
      });
      setComponentRoomQuantities(initialQuantities);

      addLog({ step: 'fetchComponents/success', data: { components: components.length, selectedPricing: selectedPricing.id } });
      toast.success(`Found ${components.length} pricing component${components.length !== 1 ? 's' : ''} available for selection.`);
    } catch (error: any) {
      toast.dismiss();
      console.error('Error fetching pricing components:', error);
      toast.error('Failed to fetch pricing components: ' + (error?.response?.data?.message || error?.message));
      setAvailablePricingComponents([]);
      addLog({ step: 'fetchComponents/error', level: 'error', msg: error?.message, data: error?.response?.data });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Function to calculate price automatically (same logic as manual form)
  const calculateAutomaticPrice = async () => {
    if (!selectedTourPackage) {
      toast.error('Please select a tour package first');
  addLog({ step: 'autoCalc/guard', level: 'warn', msg: 'No tour package selected' });
      return;
    }

    if (!inquiry) {
      toast.error('Inquiry data not loaded');
  addLog({ step: 'autoCalc/guard', level: 'warn', msg: 'Inquiry not loaded' });
      return;
    }

    const formData = form.getValues();
    
    if (!formData.mealPlanId) {
      toast.error('Please select a meal plan first');
  addLog({ step: 'autoCalc/guard', level: 'warn', msg: 'No meal plan selected' });
      return;
    }

    if (!formData.roomAllocations || formData.roomAllocations.length === 0) {
      toast.error('Please add at least one room allocation first');
  addLog({ step: 'autoCalc/guard', level: 'warn', msg: 'No room allocations' });
      return;
    }

    setIsCalculatingPrice(true);
    console.log('🔍 AUTOMATED PRICE CALCULATION');
    console.log('==============================');
    
    try {
      // Get total number of rooms from allocations
      const totalRooms = formData.roomAllocations.reduce((sum: number, allocation: any) => 
        sum + (allocation.quantity || 1), 0
      );
      
      addLog({ step: 'autoCalc/inputs', data: {
        tourPackageId: selectedTourPackage.id,
        mealPlanId: formData.mealPlanId,
        totalRooms,
        journeyDate: inquiry.journeyDate
      }});

      // Fetch pricing data from the tour package
      const response = await axios.get(`/api/tourPackages/${selectedTourPackage.id}/pricing`);
      const tourPackagePricings = response.data;

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error('No pricing periods found for the selected tour package');
        setCalculatedPrice(null);
        setPriceCalculationDetails([]);
        return;
      }

  addLog({ step: 'autoCalc/pricingPeriods', data: { count: tourPackagePricings.length } });

      // Filter matching pricing periods based on date, meal plan, and number of rooms
      const queryDate = new Date(inquiry.journeyDate);
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = new Date(p.startDate);
        const periodEnd = new Date(p.endDate);
        const isDateMatch = queryDate >= periodStart && queryDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === formData.mealPlanId;
        const isRoomMatch = p.numberOfRooms === totalRooms;

        console.log('3. Checking pricing period:', {
          periodId: p.id,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0],
          queryDate: queryDate.toISOString().split('T')[0],
          isDateMatch,
          periodMealPlan: p.mealPlanId,
          queryMealPlan: formData.mealPlanId,
          isMealPlanMatch,
          periodRooms: p.numberOfRooms,
          queryRooms: totalRooms,
          isRoomMatch,
          overallMatch: isDateMatch && isMealPlanMatch && isRoomMatch
        });

        return isDateMatch && isMealPlanMatch && isRoomMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing found for: ${queryDate.toISOString().split('T')[0]}, ${totalRooms} room(s), selected meal plan`);
        setCalculatedPrice(null);
        setPriceCalculationDetails([]);
        addLog({ step: 'autoCalc/noMatch', level: 'warn', data: {
          date: queryDate.toISOString().split('T')[0], totalRooms,
          mealPlanId: formData.mealPlanId
        }});
        return;
      }

      if (matchedPricings.length > 1) {
        console.warn('Multiple matching pricing periods found:', matchedPricings);
        toast.error('Multiple pricing periods match the criteria. Please refine the tour package pricing definitions.');
        setCalculatedPrice(null);
        setPriceCalculationDetails([]);
        addLog({ step: 'autoCalc/multiMatch', level: 'warn', data: { matchedPricingIds: matchedPricings.map((p:any)=>p.id) } });
        return;
      }

      // Apply the uniquely matched pricing
      const selectedPricing = matchedPricings[0];
  addLog({ step: 'autoCalc/selectedPricing', data: { id: selectedPricing.id, numberOfRooms: selectedPricing.numberOfRooms, mealPlanId: selectedPricing.mealPlanId } });

      // ================= UPDATED PARITY WITH PRICING TAB (OCCUPANCY & ROOMS) =================
      // Pricing Tab multiplies each component base price by an inferred occupancy multiplier
      // (derived from component name: single/double/triple/quad) and by the number of rooms
      // matched in the pricing period (selectedPricing.numberOfRooms). This produces a
      // per-component total: basePrice * occupancyMultiplier * rooms.
      // We replicate that here so that auto calculation from inquiry matches the Pricing Tab exactly.
      let totalPrice = 0;
      const calculationDetails: any[] = [];
      setAvailablePricingComponents(selectedPricing.pricingComponents || []);

      const componentsToUse = (selectedPricing.pricingComponents || []).filter((comp: any) =>
        selectedPricingComponentIds.length > 0 ? selectedPricingComponentIds.includes(comp.id) : true
      );

      if (componentsToUse && componentsToUse.length > 0) {
        componentsToUse.forEach((comp: any) => {
          const componentName = comp.pricingAttribute?.name || 'Pricing Component';
          const basePrice = parseFloat(comp.price || '0');
          const occupancyMultiplier = getOccupancyMultiplier(componentName);
          const roomQty = selectedPricing.numberOfRooms || 1;
          const componentTotal = basePrice * occupancyMultiplier * roomQty;
          totalPrice += componentTotal;
          calculationDetails.push({
            name: componentName,
            basePrice,
            occupancyMultiplier,
            roomQuantity: roomQty,
            totalPrice: componentTotal,
            roomsRepresented: roomQty,
            isGroupPricing: !!selectedPricing.isGroupPricing,
            description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy × ${roomQty} room${roomQty > 1 ? 's' : ''} = ₹${componentTotal.toFixed(2)}`
          });
        });
      } else {
        calculationDetails.push({
          name: 'No Pricing Components',
          basePrice: 0,
          occupancyMultiplier: 0,
            roomQuantity: selectedPricing.numberOfRooms || 0,
          totalPrice: 0,
          roomsRepresented: selectedPricing.numberOfRooms,
          isGroupPricing: !!selectedPricing.isGroupPricing,
          description: 'No pricing components configured in the matched pricing period.'
        });
      }

      addLog({ step: 'autoCalc/result', data: { totalPrice, lines: calculationDetails.length, groupPricing: !!selectedPricing.isGroupPricing, details: calculationDetails } });

      setCalculatedPrice(totalPrice);
      setPriceCalculationDetails(calculationDetails);
      
      toast.success(`Price calculated successfully: ₹${totalPrice.toFixed(2)}`);

    } catch (error: any) {
      console.error('Error calculating price:', error);
      toast.error('Failed to calculate price: ' + (error.response?.data?.message || error.message));
      setCalculatedPrice(null);
      setPriceCalculationDetails([]);
  addLog({ step: 'autoCalc/error', level: 'error', msg: error?.message, data: error?.response?.data });
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  // Compute price from currently available components without refetch
  const applySelectedPricingComponents = () => {
    if (!availablePricingComponents || availablePricingComponents.length === 0) {
      toast.error('No pricing components available. Run Auto Calculate first.');
  addLog({ step: 'pricing/applySelected/guard', level: 'warn', msg: 'No components available' });
      return;
    }
    const toUse = availablePricingComponents.filter((comp: any) => selectedPricingComponentIds.includes(comp.id));
    if (toUse.length === 0) {
      toast.error('Please select at least one pricing component.');
      addLog({ step: 'pricing/applySelected/guard', level: 'warn', msg: 'No components selected' });
      return;
    }
    let total = 0;
    const details: any[] = [];
    // Try to infer numberOfRooms from any available component metadata (roomsRepresented) else fallback to total from current form allocations
    const formData = form.getValues();
    const inferredRooms = formData.roomAllocations?.reduce((s: number, a: any) => s + (a.quantity || 1), 0) || 1;
    toUse.forEach((comp: any) => {
      const name = comp.pricingAttribute?.name || 'Pricing Component';
      const basePrice = parseFloat(comp.price || '0');
      const occupancyMultiplier = getOccupancyMultiplier(name);
      // Use the specific room quantity set for this component, fallback to inferredRooms
      const roomQty = componentRoomQuantities[comp.id] || comp.numberOfRooms || inferredRooms;
      const componentTotal = basePrice * occupancyMultiplier * roomQty;
      total += componentTotal;
      details.push({
        name,
        basePrice,
        occupancyMultiplier,
        roomQuantity: roomQty,
        totalPrice: componentTotal,
        description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} × ${roomQty} room${roomQty > 1 ? 's' : ''} = ₹${componentTotal.toFixed(2)}`
      });
    });
    setCalculatedPrice(total);
    setPriceCalculationDetails(details);
    toast.success(`Applied ${toUse.length} pricing component${toUse.length !== 1 ? 's' : ''}.`);
    addLog({ step: 'pricing/applySelected/success', data: { selectedCount: toUse.length, totalPrice: total } });
  };

  const applyAllPricingComponents = () => {
    if (!availablePricingComponents || availablePricingComponents.length === 0) {
      toast.error('No pricing components available. Run Auto Calculate first.');
      addLog({ step: 'pricing/applyAll/guard', level: 'warn', msg: 'No components available' });
      return;
    }
    setSelectedPricingComponentIds(availablePricingComponents.map((c: any) => c.id));
    // Reuse selected apply after selecting all
    setTimeout(applySelectedPricingComponents, 0);
    addLog({ step: 'pricing/applyAll/selectAll', data: { count: availablePricingComponents.length } });
  };

  const clearPricingComponentSelection = () => {
    setSelectedPricingComponentIds([]);
    setCalculatedPrice(null);
    setPriceCalculationDetails([]);
    toast.success('Pricing components selection cleared.');
  addLog({ step: 'pricing/clear' });
  };

  // Reset pricing related state when meal plan or room allocations change
  const watchedMealPlanId = form.watch('mealPlanId');
  const watchedRoomAllocations = JSON.stringify(form.watch('roomAllocations'));
  useEffect(() => {
    setAvailablePricingComponents([]);
    setSelectedPricingComponentIds([]);
    setCalculatedPrice(null);
    setPriceCalculationDetails([]);
    addLog({ step: 'form/reset', msg: 'Reset pricing components due to form changes' });
  }, [watchedMealPlanId, watchedRoomAllocations, addLog]);

  // Auto-recalculate total when component room quantities change
  useEffect(() => {
    if (selectedPricingComponentIds.length > 0 && Object.keys(componentRoomQuantities).length > 0) {
      // Automatically update the calculation when room quantities change
      const timeout = setTimeout(() => {
        // Recalculate manually to avoid dependency issues
        const toUse = availablePricingComponents.filter((comp: any) => selectedPricingComponentIds.includes(comp.id));
        if (toUse.length > 0) {
          let total = 0;
          const details: any[] = [];
          const formData = form.getValues();
          const inferredRooms = formData.roomAllocations?.reduce((s: number, a: any) => s + (a.quantity || 1), 0) || 1;
          
          toUse.forEach((comp: any) => {
            const name = comp.pricingAttribute?.name || 'Pricing Component';
            const basePrice = parseFloat(comp.price || '0');
            const occupancyMultiplier = getOccupancyMultiplier(name);
            const roomQty = componentRoomQuantities[comp.id] || comp.numberOfRooms || inferredRooms;
            const componentTotal = basePrice * occupancyMultiplier * roomQty;
            total += componentTotal;
            details.push({
              name,
              basePrice,
              occupancyMultiplier,
              roomQuantity: roomQty,
              totalPrice: componentTotal,
              description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} × ${roomQty} room${roomQty > 1 ? 's' : ''} = ₹${componentTotal.toFixed(2)}`
            });
          });
          
          setCalculatedPrice(total);
          setPriceCalculationDetails(details);
        }
      }, 300); // Debounce to avoid excessive calculations
      
      return () => clearTimeout(timeout);
    }
  }, [componentRoomQuantities, selectedPricingComponentIds, availablePricingComponents, form, addLog]);

  // Handle tour package selection with validation
  const handleTourPackageSelection = (tourPackageId: string) => {
    const selectedPackage = tourPackages.find(pkg => pkg.id === tourPackageId);
    
    console.log('🔍 TOUR PACKAGE SELECTION DEBUG');
    console.log('===============================');
    console.log('1. Selected Package ID:', tourPackageId);
    console.log('2. Found Package:', selectedPackage?.tourPackageName);
    console.log('3. Package Itineraries Count:', selectedPackage?.itineraries?.length || 0);
    
  if (selectedPackage) {
      // Validate the selected package
      setIsValidating(true);
      const errors = validateTourPackageTemplate(selectedPackage);
      setValidationErrors(errors);
      setIsValidating(false);
      
      if (errors.length > 0) {
        console.log('❌ Validation Errors:', errors);
        toast.error(`Template validation failed: ${errors.length} issues found`);
    addLog({ step: 'template/validation', level: 'warn', data: { errors } });
      } else {
        console.log('✅ Template validation passed');
        toast.success(`Template "${selectedPackage.tourPackageName}" validated successfully`);
    addLog({ step: 'template/validation', data: { status: 'ok', tourPackageId: selectedPackage.id } });
      }
      
      console.log('4. Package Itineraries:', JSON.stringify(selectedPackage.itineraries, null, 2));
    } else {
      setValidationErrors(['Selected tour package not found']);
    }
    
    console.log('===============================');
    
  setSelectedTourPackage(selectedPackage || null);
    form.setValue('tourPackageId', tourPackageId);
  };
  const validateTourPackageTemplate = (tourPackage: TourPackageExtended): string[] => {
    const errors: string[] = [];
    
    if (!tourPackage) {
      errors.push("No tour package selected");
      return errors;
    }

    if (!tourPackage.itineraries || tourPackage.itineraries.length === 0) {
      errors.push(`Selected tour package "${tourPackage.tourPackageName}" has no itineraries defined`);
    } else {
      tourPackage.itineraries.forEach((itinerary: any, index: number) => {
        const dayRef = `Day ${index + 1}`;
        if (!itinerary.itineraryTitle && !itinerary.dayTitle) {
          errors.push(`${dayRef}: Missing itinerary title`);
        }
        if (!itinerary.locationId) {
          errors.push(`${dayRef}: Missing location information`);
        }
        if (!itinerary.dayNumber && !itinerary.day) {
          errors.push(`${dayRef}: Missing day number`);
        }
      });
    }

    if (!tourPackage.tourPackageName) {
      errors.push("Tour package missing name");
    }

    if (!tourPackage.locationId) {
      errors.push("Tour package missing location");
    }

    return errors;
  };

  // Add room allocation
  const addRoomAllocation = () => {
    const currentAllocations = form.getValues('roomAllocations');
    form.setValue('roomAllocations', [
      ...currentAllocations,
      {
        roomTypeId: '',
        occupancyTypeId: '',
        quantity: 1,
        customRoomType: '',
        useCustomRoomType: false,
      }
    ]);
  addLog({ step: 'roomAllocation/add', data: { newCount: (currentAllocations?.length || 0) + 1 } });
  };

  // Remove room allocation
  const removeRoomAllocation = (index: number) => {
    const currentAllocations = form.getValues('roomAllocations');
    if (currentAllocations.length > 1) {
      form.setValue('roomAllocations', currentAllocations.filter((_, i) => i !== index));
  addLog({ step: 'roomAllocation/remove', data: { index, newCount: currentAllocations.length - 1 } });
    }
  };

  // Transport details add/remove helpers
  const addTransportDetail = () => {
    const current = form.getValues('transportDetails') || [];
    form.setValue('transportDetails', [
      ...current,
      {
        vehicleTypeId: undefined,
        quantity: 1,
        isAirportPickupRequired: false,
        isAirportDropRequired: false,
        pickupLocation: '',
        dropLocation: '',
        requirementDate: undefined,
        notes: '',
      },
    ]);
    addLog({ step: 'transport/add', data: { newCount: current.length + 1 } });
  };

  const removeTransportDetail = (index: number) => {
    const current = form.getValues('transportDetails') || [];
    form.setValue('transportDetails', current.filter((_: any, i: number) => i !== index));
    addLog({ step: 'transport/remove', data: { index, newCount: Math.max(0, current.length - 1) } });
  };

  // Handle room quantity change for pricing components
  const handleComponentRoomQuantityChange = (componentId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setComponentRoomQuantities(prev => ({
      ...prev,
      [componentId]: newQuantity
    }));
    // The useEffect will handle recalculation automatically
  };

  // Calculate component total price
  const calculateComponentTotalPrice = (component: any, roomQuantity: number) => {
    const basePrice = parseFloat(component.price || '0');
    const occupancyMultiplier = getOccupancyMultiplier(component.pricingAttribute?.name || '');
    return basePrice * occupancyMultiplier * roomQuantity;
  };

  // Calculate price based on selections (using same logic as manual form)
  const calculatePrice = async () => {
    await calculateAutomaticPrice();
  };

  // Create tour package query with validation
  const createTourPackageQuery = async () => {
    try {
      setLoading(true);
  setServerError(null);
      addLog({ step: 'submit/start' });
      const formData = form.getValues();
      
      console.log('🔍 AUTOMATED DIALOG - CREATING TOUR PACKAGE QUERY');
      console.log('================================================');
      
      // Clear previous errors
      setValidationErrors([]);
      
      // Validate form data first
      if (!selectedTourPackage) {
        const error = 'Tour package not selected';
        setValidationErrors([error]);
        toast.error(error);
        addLog({ step: 'submit/guard', level: 'error', msg: error });
        return;
      }

      // Re-validate template data
      const templateErrors = validateTourPackageTemplate(selectedTourPackage);
      if (templateErrors.length > 0) {
        setValidationErrors(templateErrors);
        toast.error(`Template validation failed: ${templateErrors.join(', ')}`);
        addLog({ step: 'submit/templateInvalid', level: 'error', data: { errors: templateErrors } });
        return;
      }

      if (!formData.roomAllocations || formData.roomAllocations.length === 0) {
        const error = 'Please add at least one room allocation';
        setValidationErrors([error]);
        toast.error(error);
        addLog({ step: 'submit/guard', level: 'error', msg: error });
        return;
      }

      if (!formData.mealPlanId) {
        const error = 'Please select a meal plan';
        setValidationErrors([error]);
        toast.error(error);
        addLog({ step: 'submit/guard', level: 'error', msg: error });
        return;
      }

  addLog({ step: 'submit/formData', data: { mealPlanId: formData.mealPlanId, roomAllocations: formData.roomAllocations } });
      console.log('2. Selected Tour Package:', JSON.stringify(selectedTourPackage, null, 2));
      console.log('3. Inquiry Data:', JSON.stringify(inquiry, null, 2));

      // Ensure roomAllocations is always an array
      const safeRoomAllocations = Array.isArray(formData.roomAllocations) ? formData.roomAllocations : [];
      console.log('5. Safe Room Allocations:', JSON.stringify(safeRoomAllocations, null, 2));

      // Prepare the tour package query data
  const queryData: any = {
        inquiryId: inquiry.id,
        tourPackageQueryNumber: form.getValues('tourPackageQueryNumber') || undefined,
        tourPackageQueryName: `${inquiry.customerName} - ${selectedTourPackage.tourPackageName}`,
        tourPackageQueryType: selectedTourPackage.tourPackageType,
        tourCategory: selectedTourPackage.tourCategory || 'Domestic',
        customerName: inquiry.customerName,
        customerNumber: inquiry.customerMobileNumber,
        locationId: inquiry.locationId,
        associatePartnerId: inquiry.associatePartnerId,
        tourPackageTemplate: formData.tourPackageId,
        selectedTemplateId: formData.tourPackageId,
        selectedTemplateType: 'TourPackage',
  selectedMealPlanId: formData.mealPlanId,
        numAdults: inquiry.numAdults.toString(),
        numChild5to12: (inquiry.numChildrenAbove11 || 0).toString(),
        numChild0to5: (inquiry.numChildrenBelow5 || 0).toString(),
  // Only include totalPrice if we calculated it; otherwise omit
  ...(calculatedPrice !== null ? { totalPrice: calculatedPrice.toString() } : {}),
        journeyDate: inquiry.journeyDate,
        tourStartsFrom: inquiry.journeyDate,
        numDaysNight: selectedTourPackage.numDaysNight || '1',
        // Map itineraries from template without fallback values - let validation catch issues
        itineraries: selectedTourPackage.itineraries?.map((itinerary: any, index: number) => {
          const itineraryData = {
            // Use actual field values without fallbacks - validation will catch missing data
            itineraryTitle: itinerary.itineraryTitle || itinerary.dayTitle,
            itineraryDescription: itinerary.itineraryDescription,
            locationId: itinerary.locationId,
            tourPackageId: selectedTourPackage.id,
            dayNumber: itinerary.dayNumber || itinerary.day,
            days: itinerary.days,
            hotelId: itinerary.hotelId,
            numberofRooms: itinerary.numberofRooms,
            roomCategory: itinerary.roomCategory,
            mealsIncluded: itinerary.mealsIncluded,
            itineraryImages: itinerary.itineraryImages || [],
            activities: itinerary.activities || [],
            roomAllocations: safeRoomAllocations.map(allocation => ({
              roomTypeId: allocation.useCustomRoomType ? undefined : allocation.roomTypeId,
              occupancyTypeId: allocation.occupancyTypeId,
              mealPlanId: formData.mealPlanId,
              quantity: allocation.quantity,
              customRoomType: allocation.customRoomType,
              useCustomRoomType: allocation.useCustomRoomType,
              guestNames: '',
              voucherNumber: '',
            })),
            // Prefer transport details entered in this form; fallback to inquiry if form has none
            transportDetails: (formData.transportDetails && formData.transportDetails.length > 0
              ? formData.transportDetails
              : (inquiry.transportDetails || [])
            ).map((transport: any) => ({
              vehicleTypeId: transport.vehicleTypeId,
              quantity: transport.quantity || 1,
              isAirportPickupRequired: !!transport.isAirportPickupRequired,
              isAirportDropRequired: !!transport.isAirportDropRequired,
              pickupLocation: transport.pickupLocation || '',
              dropLocation: transport.dropLocation || '',
              requirementDate: transport.requirementDate,
              notes: transport.notes || '',
            })),
          };
          
          console.log(`6. Itinerary ${index + 1} Data (NO FALLBACKS):`, JSON.stringify(itineraryData, null, 2));
          console.log(`7. Itinerary ${index + 1} Required Fields Check:`, {
            'itineraryTitle': itineraryData.itineraryTitle ? '✅' : '❌ MISSING',
            'locationId': itineraryData.locationId ? '✅' : '❌ MISSING',
            'dayNumber': itineraryData.dayNumber ? '✅' : '❌ MISSING',
          });
          return itineraryData;
        }) || [],
        debugSessionId,
      };
      // attach top-level pricing details and log snapshot
      if (calculatedPrice !== null && priceCalculationDetails && priceCalculationDetails.length > 0) {
        queryData.pricingSection = priceCalculationDetails.map((detail: any) => ({
          name: detail.name,
          price: (detail.totalPrice ?? detail.basePrice ?? 0).toString(),
          description: detail.description // already includes base × occupancy × rooms
        }));
        queryData.totalPrice = calculatedPrice.toString();
      }
      // attach a compact client debug log (last 200 entries)
      queryData.clientDebugLog = debugLog.slice(-200);
      addLog({ step: 'submit/payloadBuilt', data: {
        itineraries: queryData.itineraries?.length || 0,
        totalPrice: queryData.totalPrice,
        hasPricingSection: !!queryData.pricingSection,
      }});
      
      console.log('8. Final Query Data Structure:');
      console.log('   - inquiryId:', queryData.inquiryId);
      console.log('   - customerName:', queryData.customerName);
      console.log('   - itineraries count:', queryData.itineraries.length);
      console.log('   - itineraries:', JSON.stringify(queryData.itineraries, null, 2));
      console.log('================================================');

      // Create the tour package query
      console.log('9. Sending request to API...');
  const response = await axios.post('/api/tourPackageQuery', queryData);
      const createdQuery = response.data;

      toast.success('Tour Package Query created successfully!');
  addLog({ step: 'submit/success', data: { id: createdQuery?.id } });
      
      // Auto-download PDF
      await downloadPDF(createdQuery.id);
      
      // Call success callback
      onSuccess?.(createdQuery.id);
      
      // Close dialog
      onClose();
      
      // Refresh the page
      router.refresh();
      
    } catch (error: any) {
      console.error('Error creating tour package query:', error);
      const data = error?.response?.data;
      const message = typeof data === 'string'
        ? data
        : (data?.message || error?.message || 'Failed to create tour package query');
      const details = typeof data === 'object' ? data?.details : undefined;
      const composed = details ? `${message} — ${details}` : message;
      setServerError(composed);
      toast.error(message);
  addLog({ step: 'submit/error', level: 'error', msg: message, data });
    } finally {
      setLoading(false);
  addLog({ step: 'submit/end' });
    }
  };

  // Download PDF
  const downloadPDF = async (queryId: string) => {
    try {
      // Use AH template by default for better aesthetics, user can change if needed
      window.open(`/tourPackageQueryPDFGenerator/${queryId}?search=AH`, '_blank');
      toast.success('Generating beautiful PDF...');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Handle step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return form.getValues('tourPackageId') !== '' && validationErrors.length === 0;
      case 2:
        return form.getValues('mealPlanId') !== '';
      case 3:
        const allocations = form.getValues('roomAllocations');
        return allocations.every(allocation => 
          allocation.occupancyTypeId !== '' && (
            (allocation.useCustomRoomType && (allocation.customRoomType || '').trim().length > 0) ||
            (!allocation.useCustomRoomType && allocation.roomTypeId !== '')
          )
        );
      case 4:
        // Allow proceeding even if pricing components are not available or no calculation was performed
        return true;
      default:
        return true;
    }
  };

  const stepTitles = [
    'Select Tour Package Template',
    'Choose Meal Plan',
    'Configure Room Allocations',
    'Fetch Pricing Components',
    'Review & Create'
  ];

  const stepIcons = [Package, Utensils, BedDouble, Calculator, Check];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <span className="tracking-tight">Automated Tour Package Query</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Create a tour package query from inquiry</DialogDescription>
        </DialogHeader>

        {/* Inquiry summary banner */}
        {inquiry && (
          <div className="mb-2 rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-800">
                <User className="h-4 w-4 text-orange-600" />
                <span className="font-medium">{inquiry.customerName}</span>
                {inquiry.customerMobileNumber ? (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Phone className="h-3.5 w-3.5" />{inquiry.customerMobileNumber}
                  </span>
                ) : null}
              </div>
              <span className="hidden sm:block h-4 w-px bg-orange-200" />
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarDays className="h-4 w-4 text-orange-600" />
                <span>{inquiry.journeyDate ? new Date(inquiry.journeyDate).toLocaleDateString() : 'Journey date: N/A'}</span>
              </div>
              <span className="hidden sm:block h-4 w-px bg-orange-200" />
              <div className="flex items-center gap-2 text-slate-700">
                <BedDouble className="h-4 w-4 text-orange-600" />
                <span>{inquiry.numAdults} adult{Number(inquiry.numAdults) > 1 ? 's' : ''}</span>
                <span className="text-slate-500">• {inquiry.numChildrenAbove11 || 0} child (5–11)</span>
                <span className="text-slate-500">• {inquiry.numChildrenBelow5 || 0} child (0–5)</span>
              </div>
              {inquiry.pickupLocation || inquiry.dropLocation ? (
                <>
                  <span className="hidden sm:block h-4 w-px bg-orange-200" />
                  <div className="flex items-center gap-2 text-slate-700">
                    <Car className="h-4 w-4 text-orange-600" />
                    <span className="truncate max-w-[14rem]">{inquiry.pickupLocation || 'Pickup N/A'} → {inquiry.dropLocation || 'Drop N/A'}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Server Error Banner */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{serverError}</p>
              </div>
              <button
                type="button"
                className="text-red-600 text-sm underline"
                onClick={() => setServerError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Template Validation Errors (from template checks) */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Template Validation Issues ({validationErrors.length})
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 text-xs text-red-600">
                  Please fix these issues in the tour package template before proceeding, or contact an administrator.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zod/Form Validation Errors (from resolver) */}
        {form.formState.isSubmitted && zodErrorList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800">Please fix the following issues</h3>
                <ul className="mt-2 text-sm text-amber-700 list-disc pl-5 space-y-1">
                  {zodErrorList.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Loading Validation State */}
        {isValidating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-blue-700">Validating tour package template...</span>
            </div>
          </div>
        )}

        {/* Show loading state if inquiry data is not yet loaded */}
        {!inquiry ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading inquiry details...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Steps - compact, no horizontal scroll */}
            <div className="flex items-center gap-1 mb-3 px-2 sm:px-0 w-full">
              {stepTitles.map((title, index) => {
                const stepNumber = index + 1;
                const StepIcon = stepIcons[index];
                const isActive = currentStep === stepNumber;
                const isCompleted = currentStep > stepNumber;

                return (
                  <div key={stepNumber} className="flex items-center flex-shrink-0 w-auto">
                    <button
                      type="button"
                      title={title}
                      onClick={() => setCurrentStep(stepNumber)}
                      className="flex flex-col items-center focus:outline-none px-1"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-sm transition-colors ${
                        isCompleted ? 'bg-green-500 border-green-500 text-white' :
                        isActive ? 'border-orange-500 text-orange-600 bg-white' : 'border-gray-200 text-gray-300 bg-white'
                      }`}>
                        {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                      </div>

                      {/* labels on md+ to save space; numbers on xs */}
                      <span className={`hidden md:block text-[11px] leading-tight mt-1 text-center truncate ${isActive ? 'text-orange-700 font-medium' : 'text-gray-500'}`} style={{maxWidth: 110}}>
                        {title}
                      </span>
                      <span className={`sm:hidden text-[10px] mt-1 ${isActive ? 'text-orange-700' : 'text-gray-400'}`}>{stepNumber}</span>
                    </button>

                    {/* flexible connector fills remaining space */}
                    {index < stepTitles.length - 1 && (
                      <div className={`hidden sm:flex flex-1 mx-1 h-0.5 rounded ${currentStep > stepNumber ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(createTourPackageQuery)} className="space-y-6">
            
            {/* Step 1: Tour Package Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 1: Select Tour Package Template</h3>
                <p className="text-sm text-gray-600">
                  Choose a tour package template that matches the inquiry requirements.
                </p>
                
                <FormField
                  control={form.control}
                  name="tourPackageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Package Template</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleTourPackageSelection(value);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tour package template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tourPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{pkg.tourPackageName}</span>
                                <span className="text-xs text-gray-500">
                                  {pkg.tourPackageType} • ₹{pkg.price}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTourPackage && (
                  <Card className="shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                      <CardTitle className="text-base">Selected Package Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Name:</strong> {selectedTourPackage.tourPackageName}</p>
                          <p><strong>Type:</strong> {selectedTourPackage.tourPackageType}</p>
                          <p><strong>Category:</strong> {selectedTourPackage.tourCategory}</p>
                        </div>
                        <div>
                          <p><strong>Base Price:</strong> ₹{selectedTourPackage.price}</p>
                          <p><strong>Days:</strong> {selectedTourPackage.itineraries?.length || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Meal Plan Selection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 2: Choose Meal Plan</h3>
                <p className="text-sm text-gray-600">
                  Select the meal plan that will be applied to all room allocations.
                </p>
                
                <FormField
                  control={form.control}
                  name="mealPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a meal plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mealPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{plan.name}</span>
                                {plan.description && (
                                  <span className="text-xs text-gray-500">{plan.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Room Allocations */}
            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Step 3: Configure Room Allocations</h3>
                    <p className="text-sm text-gray-600">
                      Set up room allocations based on the number of guests.
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">Total Rooms: {form.getValues('roomAllocations').reduce((s, a) => s + (a.quantity || 1), 0)}</Badge>
                      <span className="hidden md:inline text-[11px] text-gray-500">Guests: {inquiry.numAdults}A • {(inquiry.numChildrenAbove11||0)}C(5–11) • {(inquiry.numChildrenBelow5||0)}C(0–5)</span>
                    </div>
                  </div>
                  <Button type="button" onClick={addRoomAllocation} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Room
                  </Button>
                </div>

        {form.watch('roomAllocations').map((_, index) => (
      <Card key={index} className="shadow-sm ring-1 ring-gray-100">
                    <CardHeader className="py-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Room {index + 1}</CardTitle>
                        {form.watch('roomAllocations').length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRoomAllocation(index)}
                            title="Remove room"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <FormField
                          control={form.control}
                          name={`roomAllocations.${index}.roomTypeId`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-5">
                              <FormLabel>Room Type</FormLabel>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.watch(`roomAllocations.${index}.useCustomRoomType`) || false}
                                    onChange={(e) => {
                                      form.setValue(`roomAllocations.${index}.useCustomRoomType`, e.target.checked);
                                      if (e.target.checked) {
                                        form.setValue(`roomAllocations.${index}.roomTypeId`, '');
                                      } else {
                                        form.setValue(`roomAllocations.${index}.customRoomType`, '');
                                      }
                                    }}
                                  />
                                  <span className="text-sm">Use custom room type</span>
                                </div>
                                {form.watch(`roomAllocations.${index}.useCustomRoomType`) ? (
                                  <Input
                                    placeholder="Enter custom room type"
                                    value={form.watch(`roomAllocations.${index}.customRoomType`) || ''}
                                    onChange={(e) => form.setValue(`roomAllocations.${index}.customRoomType`, e.target.value)}
                                  />
                                ) : (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select room type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {roomTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                          {type.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`roomAllocations.${index}.occupancyTypeId`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-4">
                              <FormLabel>Occupancy Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select occupancy" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {occupancyTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
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
                          name={`roomAllocations.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-3">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = Number(field.value) || 1;
                                      const next = Math.max(1, current - 1);
                                      field.onChange(next);
                                    }}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-base font-medium"
                                    aria-label="Decrease quantity"
                                  >
                                    –
                                  </button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={field.value}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value);
                                      field.onChange(isNaN(v) || v < 1 ? 1 : v);
                                    }}
                                    className="w-16 text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = Number(field.value) || 1;
                                      field.onChange(current + 1);
                                    }}
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-base font-medium"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Transport Details */}
                <Card className="shadow-sm ring-1 ring-gray-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Transport Details</CardTitle>
                      <Button type="button" variant="outline" size="sm" onClick={addTransportDetail}>
                        <Plus className="h-4 w-4 mr-1" /> Add Transport
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(form.watch('transportDetails') || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No transport added. Use &quot;Add Transport&quot; to include vehicle requirements.</p>
                    )}
                    {(form.watch('transportDetails') || []).map((_, index) => (
                      <div key={index} className="border rounded-md p-3 space-y-3 bg-orange-50/30">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium flex items-center gap-2"><Car className="h-4 w-4 text-orange-600"/>Transport {index + 1}</div>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeTransportDetail(index)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.vehicleTypeId` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select vehicle type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {vehicleTypes.map((vt) => (
                                      <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.quantity` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(Math.max(1, (Number(field.value) || 1) - 1))}
                                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-lg font-medium"
                                      aria-label="Decrease quantity"
                                    >
                                      –
                                    </button>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={field.value ?? 1}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        field.onChange(isNaN(v) || v < 1 ? 1 : v);
                                      }}
                                      className="w-20 text-center"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => field.onChange((Number(field.value) || 1) + 1)}
                                      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent hover:text-accent-foreground text-lg font-medium"
                                      aria-label="Increase quantity"
                                    >
                                      +
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.requirementDate` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Requirement Date</FormLabel>
                                <FormControl>
                                  <Input type="date" value={field.value || ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.pickupLocation` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pickup Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Airport / Hotel / Address" value={field.value || ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.dropLocation` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Drop Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Airport / Hotel / Address" value={field.value || ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.isAirportPickupRequired` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Airport Pickup</FormLabel>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" className="h-4 w-4" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                                  <span className="text-sm">Airport Pickup Required</span>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.isAirportDropRequired` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Airport Drop</FormLabel>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" className="h-4 w-4" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                                  <span className="text-sm">Airport Drop Required</span>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`transportDetails.${index}.notes` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Input placeholder="Driver notes / special instructions" value={field.value || ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Price Calculation */}
            {currentStep === 4 && (
              <div className="space-y-4 px-3 sm:px-0">
                <h3 className="text-lg font-semibold">Step 4: Fetch Available Pricing Components</h3>
                <p className="text-sm text-gray-600">
                  Fetch and select pricing components from tour package pricing configuration.
                </p>

                <div className="space-y-4">
                  <Card className="shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                      <CardTitle className="text-base">Inquiry Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm py-3 px-3">
                      <p><strong>Customer:</strong> {inquiry.customerName}</p>
                      <p><strong>Adults:</strong> {inquiry.numAdults}</p>
                      <p><strong>Children (5-11):</strong> {inquiry.numChildrenAbove11 || 0}</p>
                      <p><strong>Children (0-5):</strong> {inquiry.numChildrenBelow5 || 0}</p>
                      <p><strong>Journey Date:</strong> {inquiry.journeyDate ? new Date(inquiry.journeyDate).toLocaleDateString() : 'Not specified'}</p>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm ring-1 ring-gray-100">
                    <CardHeader>
                      <CardTitle className="text-base">Selection Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm py-3 px-3">
                      <p><strong>Package:</strong> {selectedTourPackage?.tourPackageName}</p>
                      <p><strong>Meal Plan:</strong> {mealPlans.find(m => m.id === form.getValues('mealPlanId'))?.name}</p>
                      <p><strong>Total Rooms:</strong> {form.getValues('roomAllocations').reduce((sum, allocation) => sum + allocation.quantity, 0)}</p>
                      
                      {/* Independent Pricing Configuration */}
                      <div className="pt-3 border-t space-y-3">
                        <h4 className="font-medium text-purple-800">🧮 Pricing Configuration</h4>
                        
                        {/* Meal Plan for Pricing */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Meal Plan for Pricing:</label>
                          <Select value={pricingMealPlanId} onValueChange={setPricingMealPlanId}>
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue placeholder="Select meal plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {mealPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  🍽️ {plan.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Number of Rooms for Pricing */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Rooms for Pricing:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPricingNumberOfRooms(Math.max(1, pricingNumberOfRooms - 1))}
                              className="h-7 w-7 rounded border hover:bg-gray-100 text-sm"
                              disabled={pricingNumberOfRooms <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={pricingNumberOfRooms}
                              onChange={(e) => setPricingNumberOfRooms(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 text-center border rounded px-1 py-1 text-sm"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={() => setPricingNumberOfRooms(pricingNumberOfRooms + 1)}
                              className="h-7 w-7 rounded border hover:bg-gray-100 text-sm"
                            >
                              +
                            </button>
                            <span className="text-xs text-gray-600">🏨 {pricingNumberOfRooms} room{pricingNumberOfRooms > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Fetch Components Button */}
                      <div className="pt-2">
                        <Button 
                          type="button" 
                          onClick={fetchAvailablePricingComponents} 
                          disabled={isCalculatingPrice || loading || !pricingMealPlanId || pricingNumberOfRooms <= 0} 
                          className="w-full mb-3 bg-orange-600 text-white hover:bg-orange-700"
                          variant="outline"
                        >
                          <Package className="mr-2 h-4 w-4" />
                          {isCalculatingPrice ? 'Fetching Components...' : '📦 Fetch Available Pricing Components'}
                        </Button>
                        
                        {availablePricingComponents.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-medium text-blue-800">Select Pricing Components:</p>
                              <div className="text-xs text-blue-600">
                                Choose which pricing components to include in your tour package pricing breakdown:
                              </div>
                            </div>
                            <div className="space-y-3">
                              {/* Select All / Clear Selection */}
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const allComponentIds = availablePricingComponents.map((comp: any) => comp.id);
                                    setSelectedPricingComponentIds(allComponentIds);
                                    // Initialize room quantities for all components if not already set
                                    const newQuantities = { ...componentRoomQuantities };
                                    availablePricingComponents.forEach((comp: any) => {
                                      if (!newQuantities[comp.id]) {
                                        newQuantities[comp.id] = 1;
                                      }
                                    });
                                    setComponentRoomQuantities(newQuantities);
                                  }}
                                  className="text-xs"
                                >
                                  Select All
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPricingComponentIds([])}
                                  className="text-xs"
                                >
                                  Deselect All
                                </Button>
                              </div>
                              
                              {/* Pricing Components Grid */}
                              <div className="space-y-2">
                                {availablePricingComponents.map((component: any) => {
                                  const isSelected = selectedPricingComponentIds.includes(component.id);
                                  const occupancyMultiplier = getOccupancyMultiplier(component.pricingAttribute?.name || '');
                                  const basePrice = parseFloat(component.price || '0');
                                  const componentRoomQty = componentRoomQuantities[component.id] || 1;
                                  const totalComponentPrice = calculateComponentTotalPrice(component, componentRoomQty);
                                  
                                  return (
                                    <div key={component.id} className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                                      <label className="flex items-start gap-3 p-3 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedPricingComponentIds(prev => [...prev, component.id]);
                                            } else {
                                              setSelectedPricingComponentIds(prev => prev.filter(id => id !== component.id));
                                            }
                                          }}
                                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-900">
                                              {component.pricingAttribute?.name || 'Pricing Component'}
                                            </h4>
                                            <div className="text-right">
                                              <span className="text-lg font-bold text-blue-700">
                                                ₹{totalComponentPrice.toFixed(2)}
                                              </span>
                                            </div>
                                          </div>
                                          {component.description && (
                                            <p className="text-sm text-gray-600">{component.description}</p>
                                          )}
                                          <p className="text-xs text-gray-500 mt-1">
                                            <span className="font-medium">Sales Price:</span> ₹{parseFloat(component.price || '0').toFixed(2)} per person
                                            {occupancyMultiplier > 1 && (
                                              <span className="text-blue-600 ml-1 block">
                                                (×{occupancyMultiplier} for {component.pricingAttribute?.name?.toLowerCase().includes('double') ? 'Double' : component.pricingAttribute?.name?.toLowerCase().includes('triple') ? 'Triple' : component.pricingAttribute?.name?.toLowerCase().includes('quad') ? 'Quad' : 'Multi'} occupancy)
                                              </span>
                                            )}
                                          </p>
                                          <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">Rooms:</span>
                                              <button
                                                type="button"
                                                onClick={() => handleComponentRoomQuantityChange(
                                                  component.id, 
                                                  (componentRoomQuantities[component.id] || 1) - 1
                                                )}
                                                className="h-5 w-5 text-xs border rounded hover:bg-gray-100"
                                                disabled={(componentRoomQuantities[component.id] || 1) <= 1}
                                              >
                                                -
                                              </button>
                                              <input
                                                type="number"
                                                value={componentRoomQuantities[component.id] || 1}
                                                onChange={(e) => handleComponentRoomQuantityChange(
                                                  component.id, 
                                                  parseInt(e.target.value) || 1
                                                )}
                                                min="1"
                                                className="w-12 text-center text-xs border rounded px-1"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleComponentRoomQuantityChange(
                                                  component.id, 
                                                  (componentRoomQuantities[component.id] || 1) + 1
                                                )}
                                                className="h-5 w-5 text-xs border rounded hover:bg-gray-100"
                                              >
                                                +
                                              </button>
                                            </div>
                                            {(componentRoomQty > 1 || occupancyMultiplier > 1) && (
                                              <p className="text-xs text-gray-500">
                                                {componentRoomQty} rooms × ₹{parseFloat(component.price || '0').toFixed(2)} × {occupancyMultiplier} occupancy
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Summary of selected components */}
                              {selectedPricingComponentIds.length > 0 && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                  <p className="text-sm font-medium text-green-800">
                                    Selected: {selectedPricingComponentIds.length} component{selectedPricingComponentIds.length !== 1 ? 's' : ''}
                                  </p>
                                  <p className="text-xs text-green-600 mt-1">
                                    Total: ₹{availablePricingComponents
                                      .filter((comp: any) => selectedPricingComponentIds.includes(comp.id))
                                      .reduce((sum: number, comp: any) => {
                                        const roomQuantity = componentRoomQuantities[comp.id] || 1;
                                        return sum + calculateComponentTotalPrice(comp, roomQuantity);
                                      }, 0).toFixed(2)}
                                  </p>
                                </div>
                              )}
                              
                              {/* Apply Button */}
                              <Button 
                                type="button" 
                                onClick={() => {
                                  if (selectedPricingComponentIds.length === 0) {
                                    toast.error('Please select at least one pricing component.');
                                    return;
                                  }
                                  applySelectedPricingComponents();
                                }} 
                                disabled={selectedPricingComponentIds.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Apply Selected Components ({selectedPricingComponentIds.length})
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Price Calculation Results */}
                      {calculatedPrice !== null && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-lg font-semibold text-green-800">
                              Total Price: ₹{calculatedPrice.toLocaleString()}
                            </p>
                          </div>
                          
                          {/* Price Breakdown */}
                          {priceCalculationDetails.length > 0 && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium text-gray-800 mb-2">Price Breakdown:</p>
                              <div className="space-y-1">
                                {priceCalculationDetails.map((detail, index) => (
                                  <div key={index} className="text-xs text-gray-600">
                                    <div className="font-medium">{detail.name}</div>
                                    <div>{detail.description}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Loading State */}
                      {isCalculatingPrice && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className="text-sm text-blue-700">
                              {availablePricingComponents.length === 0 ? 'Fetching pricing components...' : 'Processing pricing components...'}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Calculation Notes */}
                {calculatedPrice !== null && (
                  <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Auto Price Calculation Complete</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Price calculated based on selected pricing components from tour package pricing configuration, 
                            selected meal plan, number of rooms, and journey date. This matches the same calculation method used 
                            in manual tour package queries.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 5: Review & Create */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 5: Review & Create</h3>
                <p className="text-sm text-gray-600">
                  Review all selections and create the tour package query.
                </p>

                <Card className="ring-1 ring-gray-100">
                  <CardHeader>
                    <CardTitle className="text-base">Final Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2">Tour Package</h4>
                        <p>{selectedTourPackage?.tourPackageName}</p>
                        <p className="text-gray-600">{selectedTourPackage?.tourPackageType}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Meal Plan</h4>
                        <p>{mealPlans.find(m => m.id === form.getValues('mealPlanId'))?.name}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Room Allocations</h4>
          {form.getValues('roomAllocations').map((allocation, index) => (
                        <div key={index} className="flex items-center justify-between py-1 text-sm">
                          <span>
            Room {index + 1}: {allocation.useCustomRoomType ? (allocation.customRoomType || 'Custom') : (roomTypes.find(r => r.id === allocation.roomTypeId)?.name)} - {occupancyTypes.find(o => o.id === allocation.occupancyTypeId)?.name}
                          </span>
                          <Badge variant="secondary">Qty: {allocation.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                    
                    {calculatedPrice !== null ? (
                      <>
                        <Separator />
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-lg font-semibold text-blue-800">
                            Total Estimated Price: ₹{calculatedPrice.toLocaleString()}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Separator />
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-amber-800">
                            No pricing components applied. You can create the query without a computed total price.
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between py-2 border-t sticky bottom-0 bg-white/85 backdrop-blur-md px-2 sm:px-0">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || loading}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceedToNextStep() || loading}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                   <Button
                     type="submit"
                     disabled={loading || !canProceedToNextStep()}
                     className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white"
                   >
                     {loading ? 'Creating...' : (
                       <>
                         <FileDown className="h-4 w-4" />
                         Create & Download
                       </>
                     )}
                   </Button>
                )}
              </div>
            </div>

            {/* Debug panel */}
            <div className="mt-2 border-t pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setShowDebug(v => !v)}
                  title="Toggle debug logs"
                >
                  {showDebug ? 'Hide debug logs' : 'Show debug logs'}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{debugLog.length} logs</span>
                  <span className="text-[11px] text-muted-foreground">Session: {debugSessionId || 'n/a'}</span>
                  <Button type="button" variant="outline" onClick={copyLogsToClipboard}>Copy</Button>
                  <Button type="button" variant="outline" onClick={clearLogs}>Clear</Button>
                </div>
              </div>
              {showDebug && (
                <div className="mt-2 h-40 overflow-auto rounded border bg-muted/30 p-2">
                  <pre className="text-[11px] leading-4 whitespace-pre-wrap">
                    {debugLog.map((l, i) => (
                      <div key={i}>{JSON.stringify(l)}</div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          </form>
        </Form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};
