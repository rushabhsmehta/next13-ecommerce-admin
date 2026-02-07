// Shared component for displaying detailed pricing breakdown
// Used by both main PricingTab and QueryVariantsTab for consistency
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Hotel, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";

interface PricingBreakdownTableProps {
  priceCalculationResult: any;
  hotels: (Hotel & { images: any[] })[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
  itineraries: any[]; // Form itineraries with room allocations
  variant?: boolean; // Flag to indicate if this is for variant display
}

export const PricingBreakdownTable: React.FC<PricingBreakdownTableProps> = ({
  priceCalculationResult,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
  itineraries,
  variant = false,
}) => {
  if (!priceCalculationResult || !priceCalculationResult.itineraryBreakdown?.length) {
    return null;
  }

  // Collect all unique days from both accommodation and transport
  const days = new Set<number>();
  priceCalculationResult.itineraryBreakdown?.forEach((item: any) => {
    days.add(item.day);
  });
  priceCalculationResult.transportDetails?.forEach((transport: any) => {
    days.add(transport.day);
  });
  const sortedDays = Array.from(days).sort((a, b) => a - b);

  return (
    <div className={`mt-6 border ${variant ? 'border-green-200' : 'border-blue-200'} rounded-lg overflow-hidden bg-white shadow-sm`}>
      <Table>
        <TableCaption className={`py-3 ${variant ? 'bg-green-50' : 'bg-blue-50'}`}>
          Detailed Pricing Breakdown
        </TableCaption>
        <TableHeader>
          <TableRow className={variant ? 'bg-green-100' : 'bg-blue-100'}>
            <TableHead className="w-[80px]">Day</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Room Cost</TableHead>
            <TableHead className="text-right">Transport Cost</TableHead>
            <TableHead className="text-right">Day Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDays.map(day => {
            const accommodation = priceCalculationResult.itineraryBreakdown?.find((item: any) => item.day === day);
            const transports = priceCalculationResult.transportDetails?.filter((transport: any) => transport.day === day);
            const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;
            
            const originalItinerary = itineraries.find((it: any) => it.dayNumber === day);
            const hotelName = originalItinerary && hotels.find((h: any) => h.id === originalItinerary.hotelId)?.name;
            const roomAllocations = originalItinerary?.roomAllocations || [];
            
            const accommodationCost = accommodation?.accommodationCost || 0;
            const dayTotal = accommodationCost + transportCost;

            return (
              <TableRow key={`day-${day}`}>
                <TableCell className="font-medium">Day {day}</TableCell>
                <TableCell>
                  {hotelName ? (
                    <div>
                      <span className="font-medium text-sm text-gray-800 block mb-1">{hotelName}</span>
                      {roomAllocations.map((allocation: any, allocIdx: number) => {
                        const roomTypeName = roomTypes.find(rt => rt.id === allocation.roomTypeId)?.name || "N/A";
                        const occupancyTypeName = occupancyTypes.find(ot => ot.id === allocation.occupancyTypeId)?.name || "N/A";
                        const mealPlanName = mealPlans.find(mp => mp.id === allocation.mealPlanId)?.name || "N/A";
                        const quantity = allocation.quantity || 1;
                        
                        const roomBreakdown = priceCalculationResult?.itineraryBreakdown?.find((ib: any) => ib.day === day)?.roomBreakdown;
                        const roomCost = roomBreakdown?.find((rb: any) =>
                          rb.roomTypeId === allocation.roomTypeId &&
                          rb.occupancyTypeId === allocation.occupancyTypeId &&
                          rb.mealPlanId === allocation.mealPlanId
                        );
                        
                        const allocationTotalCost = roomCost ? roomCost.totalCost : 0;
                        const pricePerNight = roomCost ? roomCost.pricePerNight : 0;

                        return (
                          <div key={allocIdx} className={`text-xs text-gray-600 mb-1 pl-2 border-l-2 ${variant ? 'border-green-100' : 'border-blue-100'}`}>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">{roomTypeName}</span>
                              <span className="text-gray-500">({occupancyTypeName})</span>
                              <span className="text-gray-500">• {mealPlanName}</span>
                              {quantity > 1 && <span className="text-gray-500">× {quantity}</span>}
                            </div>
                            <div className="mt-0.5">
                              <span className={`font-medium ${variant ? 'text-green-700' : 'text-blue-700'}`}>
                                {allocationTotalCost > 0 && pricePerNight > 0 && quantity > 1
                                  ? `₹${pricePerNight.toFixed(2)} × ${quantity} = ₹${allocationTotalCost.toFixed(2)}`
                                  : allocationTotalCost > 0
                                    ? `₹${allocationTotalCost.toFixed(2)}`
                                    : '₹0.00'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                        const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                        const transportCost = transport.totalCost || 0;
                        const pricePerUnit = transport.pricePerUnit || 0;
                        const quantity = transport.quantity || 1;
                        const description = transport.description || '';

                        return (
                          <div key={`transport-${transportIdx}`} className={`text-xs text-gray-600 mt-1 pl-2 border-l-2 ${variant ? 'border-green-200' : 'border-green-100'}`}>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">🚗 Transport:</span>
                              <span>{vehicleTypeName}</span>
                              {quantity > 1 && <span className="text-gray-500">× {quantity}</span>}
                            </div>
                            {description && (
                              <div className="text-[10px] text-gray-500 mt-0.5">{description}</div>
                            )}
                            <div className="mt-0.5">
                              <span className="font-medium text-green-700">
                                {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                  ? `₹${pricePerUnit.toFixed(2)} × ${quantity} = ₹${transportCost.toFixed(2)}`
                                  : transportCost > 0
                                    ? `₹${transportCost.toFixed(2)}`
                                    : '₹0.00'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : transports && transports.length > 0 ? (
                    <div>
                      {transports.map((transport: any, transportIdx: number) => {
                        const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                        const transportCost = transport.totalCost || 0;
                        const pricePerUnit = transport.pricePerUnit || 0;
                        const quantity = transport.quantity || 1;
                        const description = transport.description || '';

                        return (
                          <div key={`transport-only-${transportIdx}`} className="text-xs text-gray-600 pl-2 border-l-2 border-green-100">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">🚗 Transport:</span>
                              <span>{vehicleTypeName}</span>
                              {quantity > 1 && <span className="text-gray-500">× {quantity}</span>}
                            </div>
                            {description && (
                              <div className="text-[10px] text-gray-500 mt-0.5">{description}</div>
                            )}
                            <div className="mt-0.5">
                              <span className="font-medium text-green-700">
                                {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                  ? `₹${pricePerUnit.toFixed(2)} × ${quantity} = ₹${transportCost.toFixed(2)}`
                                  : transportCost > 0
                                    ? `₹${transportCost.toFixed(2)}`
                                    : '₹0.00'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No hotel/transport</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {accommodationCost ? `₹${accommodationCost.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {transportCost ? `₹${transportCost.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {`₹${dayTotal.toFixed(2)}`}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className={variant ? 'bg-green-50' : 'bg-blue-50'}>
            <TableCell colSpan={4} className="font-medium text-right text-sm">Base Accommodation Cost</TableCell>
            <TableCell className="text-right font-bold text-sm">
              ₹{priceCalculationResult.breakdown.accommodation.toFixed(2)}
            </TableCell>
          </TableRow>
          <TableRow className={variant ? 'bg-green-50' : 'bg-blue-50'}>
            <TableCell colSpan={4} className="font-medium text-right text-sm">Base Transport Cost</TableCell>
            <TableCell className="text-right font-bold text-sm">
              ₹{priceCalculationResult.breakdown.transport.toFixed(2)}
            </TableCell>
          </TableRow>
          <TableRow className={variant ? 'bg-green-100' : 'bg-blue-100'}>
            <TableCell colSpan={4} className="font-medium text-right text-sm">Total Base Cost</TableCell>
            <TableCell className="text-right font-bold text-sm">
              ₹{(priceCalculationResult.breakdown.accommodation + priceCalculationResult.breakdown.transport).toFixed(2)}
            </TableCell>
          </TableRow>
          {priceCalculationResult.appliedMarkup && priceCalculationResult.appliedMarkup.percentage > 0 && (
            <TableRow className={variant ? 'bg-green-100' : 'bg-blue-100'}>
              <TableCell colSpan={4} className="font-medium text-right text-sm">
                Markup ({priceCalculationResult.appliedMarkup.percentage}%)
              </TableCell>
              <TableCell className="text-right font-bold text-sm">
                ₹{priceCalculationResult.appliedMarkup.amount.toFixed(2)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className={variant ? 'bg-green-200' : 'bg-blue-200'}>
            <TableCell colSpan={4} className="font-medium text-right text-base">Final Total Cost</TableCell>
            <TableCell className="text-right font-bold text-base">
              ₹{priceCalculationResult.totalCost.toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
