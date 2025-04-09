import { useState } from 'react';
import axios from 'axios';

interface PricingData {
  totalPrice: number;
  roomCost: number;
  mealCost: number;
  totalRooms: number;
  breakdown: Array<{
    dayNumber: number;
    date?: string;
    hotelName: string;
    roomCost: number;
    mealCost: number;
    total: number;
    roomsBreakdown?: string;
  }>;
  datePeriodBreakdown?: Array<{
    startDate: string;
    endDate: string;
    days: number;
    totalCost: number;
  }>;
  pricingSection: Array<{
    name: string;
    price: string;
    description?: string;
  }>;
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
  roomCategory?: string;
  roomType?: string;
  mealPlan?: string;
  occupancyType?: string;
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
        itineraries: validItineraries.map(item => ({
          hotelId: item.hotelId,
          roomCategory: item.roomCategory || '',
          numberofRooms: item.numberofRooms || '1',
          dayNumber: item.dayNumber || 0,
          mealsIncluded: item.mealsIncluded || [],
          roomType: item.roomType || '',
          mealPlan: item.mealPlan || '',
          occupancyType: item.occupancyType || ''
        }))
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