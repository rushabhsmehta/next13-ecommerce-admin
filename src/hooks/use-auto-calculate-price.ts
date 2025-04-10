import { useState } from 'react';
import axios from 'axios';

interface PricingData {
  totalPrice: number;
  roomCost: number;
  mealCost: number;
  transportCost: number;
  markupAmount?: number;  
  markupPercentage?: number;  
  priceAfterMarkup?: number;  
  totalRooms: number;
  breakdown: Array<{
    dayNumber: number;
    date?: string;
    hotelName: string;
    roomCost: number;
    mealCost: number;
    transportCost: number;
    total: number;
    roomsBreakdown?: string;
    mealPlan?: string;
    accommodations?: Array<{
      hotelName: string;
      roomType: string;
      roomCount: number;
      pricePerRoom: number;
      totalCost: number;
    }>;
  }>;
  datePeriodBreakdown?: Array<{
    startDate: string;
    endDate: string;
    days: number;
    totalCost: number;
  }>;
  roomAllocations?: Array<{
    dayNumber: number;
    date: string;
    hotelName: string;
    totalCost: number;
    rooms: Array<{
      roomType: string;
      occupancyType: string;
      quantity: number;
      pricePerRoom?: number;
      totalCost?: number;
      guestNames?: string;
      warning?: string;
    }>;
  }>;
  transportDetails?: Array<{
    vehicleType: string;
    quantity: number;
    capacity?: string;
    cost: number;
    description?: string;
    dayNumber?: number;
    dayRange?: string;
    perDayOrTrip?: 'PerDay' | 'PerTrip';
    date?: string;
  }>;
  pricingSection: Array<{
    name: string;
    price: string;
    description?: string;
  }>;
}

// Define transport detail structure
interface TransportDetailItem {
  vehicleType: string;
  quantity: number;
  capacity?: number;
  description?: string;
}

// Updated to match the full itinerary structure
interface ItineraryItem {
  itineraryImages?: { url: string }[];  itineraryTitle?: string;
  itineraryDescription?: string;
  activities?: any[];
  hotelId: string;
  locationId?: string;
  dayNumber?: number;
  days?: string;
  mealsIncluded?: string[];
  numberofRooms?: string;
  roomCategory?: string;
  roomType?: string;
  mealPlan?: string;
  occupancyType?: string;
  vehicleType?: string; // Kept for backward compatibility
  transportDetails?: TransportDetailItem[]; // Added support for multiple vehicles
  roomAllocations?: Array<{
    roomType?: string;
    occupancyType: string;
    quantity: number | string;
    guestNames?: string;
  }>; // Added support for mixed occupancy room allocations
}

export const useAutoCalculatePrice = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const calculatePackagePrice = async (data: {
    tourStartsFrom: Date;
    tourEndsOn: Date;
    itineraries: ItineraryItem[];
    numAdults: string;
    numChild5to12: string;
    numChild0to5: string;
  }) => {
    try {
      setIsCalculating(true);
      setError(null);

      // Filter out itineraries without hotel data
      const validItineraries = data.itineraries.filter(
        (item) => item.hotelId && item.hotelId.trim() !== ''
      );

      if (validItineraries.length === 0) {
        setError('No valid hotel selections in itineraries');
        setIsCalculating(false);
        return null;
      }      
      
      // Transform the itineraries to include only the data needed by the API
      const transformedData = {
        ...data,
        itineraries: validItineraries.map(item => {          // Process room allocations - use explicit allocations if available
          // Ensure we have proper room type and occupancy type to find correct pricing
          const roomAllocationData = item.roomAllocations && item.roomAllocations.length > 0 
            ? item.roomAllocations.map(room => ({
                roomType: room.roomType || item.roomType || item.roomCategory || 'Standard',
                occupancyType: room.occupancyType || 'Double',
                quantity: parseInt(room.quantity?.toString() || '1'),
                guestNames: room.guestNames || ''
              }))
            : [{
                roomType: item.roomType || item.roomCategory || 'Standard',
                occupancyType: item.occupancyType || 'Double',
                quantity: parseInt(item.numberofRooms || '1'),
                guestNames: ''
              }];
          
          // Process transport details - ensure proper structure
          const transportDetailsData = item.transportDetails && item.transportDetails.length > 0
            ? item.transportDetails.map(transport => ({
                vehicleType: transport.vehicleType || '',
                quantity: parseInt(transport.quantity?.toString() || '1'),
                capacity: transport.capacity,
                description: transport.description || ''
              }))
            : item.vehicleType 
              ? [{ 
                  vehicleType: item.vehicleType,
                  quantity: 1,
                  description: ''
                }] 
              : [];
          
          // Process meal plan information
          const mealPlan = item.mealPlan || ''; // CP, MAP, AP, EP
          
          // Create full accommodation array data
          const accommodationsData = [{
            hotelName: '', // Will be filled in by the API
            roomType: item.roomType || 'Standard',
            roomCount: parseInt(item.numberofRooms || '1'),
            pricePerRoom: 0, // Will be calculated by the API
            totalCost: 0 // Will be calculated by the API
          }];
          
          return {
            hotelId: item.hotelId,
            locationId: item.locationId || '',
            roomCategory: item.roomCategory || '',
            numberofRooms: item.numberofRooms || '1',
            dayNumber: item.dayNumber || 0,
            days: item.days || '', // Include days for multi-day stays at the same hotel
            mealsIncluded: item.mealsIncluded || [],
            roomType: item.roomType || '',
            mealPlan: mealPlan,
            occupancyType: item.occupancyType || '',
            vehicleType: item.vehicleType || '', // Kept for backward compatibility
            transportDetails: transportDetailsData, // Enhanced multiple vehicles support
            roomAllocations: roomAllocationData, // Enhanced room allocations for mixed occupancy
            accommodations: accommodationsData, // Add explicit accommodation array data
          };
        })
      };

      const response = await axios.post('/api/calculate-package-price', transformedData);

      setPricingData(response.data);
      setIsCalculating(false);
      return response.data;
    } catch (err: any) {
      console.error('Error calculating package price:', err);
      setError(err.response?.data || 'Failed to calculate package price');
      setIsCalculating(false);
      return null;
    }
  };

  return {
    calculatePackagePrice,
    pricingData,
    isCalculating,
    error
  };
};