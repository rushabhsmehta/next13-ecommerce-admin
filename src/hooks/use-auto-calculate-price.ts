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
      mealPlan?: string;
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
  itineraryImages?: { url: string }[];  
  itineraryTitle?: string;
  itineraryDescription?: string;
  activities?: any[];
  hotelId: string;
  locationId?: string;
  dayNumber?: number;
  days?: string;
  mealsIncluded?: string[];
  numberofRooms?: string;
  transportDetails?: TransportDetailItem[]; // Using this relation for vehicle information
  roomAllocations?: Array<{
    roomType?: string;
    occupancyType: string;
    quantity: number | string;
    guestNames?: string;
    mealPlan?: string; // Added meal plan field for each room
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
  }) => {
    try {
      console.log("Starting package price calculation with data:", data);
      setIsCalculating(true);
      setError(null);

      // Filter out itineraries without hotel data
      const validItineraries = data.itineraries.filter(
        (item) => item.hotelId && item.hotelId.trim() !== ''
      );
      console.log("Valid itineraries after filtering:", validItineraries);

      if (validItineraries.length === 0) {
        setError('No valid hotel selections in itineraries');
        setIsCalculating(false);
        console.error('No valid hotel selections in itineraries');
        return null;
      }      
        // Transform the itineraries to include only the data needed by the API
      console.log("Starting data transformation for API");
      const transformedData = {
        ...data,
        itineraries: validItineraries.map(item => {
          console.log("Processing itinerary item:", item);
          console.log("Room allocations:", item.roomAllocations);
          
          // Process room allocations - use explicit allocations if available
          const roomAllocationData = item.roomAllocations && item.roomAllocations.length > 0 
            ? item.roomAllocations.map(room => ({
                roomType: room.roomType || 'Standard',
                occupancyType: room.occupancyType || 'Double',
                quantity: parseInt(room.quantity?.toString() || '1'),
                guestNames: room.guestNames || '',
                mealPlan: room.mealPlan || 'CP' // Use meal plan from room allocation
              }))
            : [{
                roomType: 'Standard',
                occupancyType: 'Double',
                quantity: parseInt(item.numberofRooms || '1'),
                guestNames: '',
                mealPlan: 'CP' // Use default meal plan
              }];
          
          console.log("Processed room allocations:", roomAllocationData);
            // Process transport details - ensure proper structure
          const transportDetailsData = item.transportDetails && item.transportDetails.length > 0
            ? item.transportDetails.map(transport => ({
                vehicleType: transport.vehicleType || '',
                quantity: parseInt(transport.quantity?.toString() || '1'),
                capacity: transport.capacity,
                description: transport.description || ''
              }))
            : [];
            // Create full accommodation array data
          const accommodationsData = [{
            hotelName: '', // Will be filled in by the API
            roomType: 'Standard',
            roomCount: parseInt(item.numberofRooms || '1'),
            pricePerRoom: 0, // Will be calculated by the API
            totalCost: 0 // Will be calculated by the API
          }];
          
          return {
            hotelId: item.hotelId,
            locationId: item.locationId || '',
            numberofRooms: item.numberofRooms || '1',
            dayNumber: item.dayNumber || 0,
            days: item.days || '', // Include days for multi-day stays at the same hotel
            mealsIncluded: item.mealsIncluded || [],
            transportDetails: transportDetailsData, // Using transportDetails for vehicle information
            roomAllocations: roomAllocationData, // Using roomAllocations for room information
            accommodations: accommodationsData, // Add explicit accommodation array data
          };
        })
      };      console.log("Sending data to API:", transformedData);
      try {
        const response = await axios.post('/api/calculate-package-price', transformedData);
        console.log("API response received:", response.data);
        
        setPricingData(response.data);
        setIsCalculating(false);
        return response.data;
      } catch (err: any) {
        console.error('API request failed:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        setError(err.response?.data || 'Failed to calculate package price');
        setIsCalculating(false);
        return null;
      }
    } catch (err: any) {
      console.error('Error in price calculation function:', err);
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