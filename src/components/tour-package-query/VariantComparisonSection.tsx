/**
 * VariantComparisonSection Component
 * 
 * Displays selected tour package variants side-by-side for comparison
 * Shows hotel options and pricing for each variant
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, DollarSign, Info } from "lucide-react";

interface VariantHotelSnapshot {
  id: string;
  dayNumber: number;
  hotelName: string;
  locationLabel: string;
  imageUrl: string | null;
  roomCategory: string | null;
}

interface PricingComponentSnapshot {
  id: string;
  attributeName: string;
  price: number;
  purchasePrice: number | null;
  description: string | null;
}

interface PricingSnapshot {
  id: string;
  mealPlanName: string;
  vehicleTypeName: string | null;
  numberOfRooms: number;
  totalPrice: number;
  pricingComponentSnapshots: PricingComponentSnapshot[];
}

interface VariantSnapshot {
  id: string;
  name: string;
  description: string | null;
  priceModifier: number | null;
  isDefault: boolean;
  sortOrder: number;
  hotelSnapshots: VariantHotelSnapshot[];
  pricingSnapshots: PricingSnapshot[];
}

interface VariantComparisonSectionProps {
  variants: VariantSnapshot[];
}

export function VariantComparisonSection({ variants }: VariantComparisonSectionProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  // Get all unique days
  const allDayNumbers = Array.from(
    new Set(variants.flatMap(v => v.hotelSnapshots.map(h => h.dayNumber)))
  ).sort((a, b) => a - b);

  // Get all unique pricing components
  const allPricingComponents = Array.from(
    new Set(
      variants.flatMap(v =>
        v.pricingSnapshots.flatMap(p =>
          p.pricingComponentSnapshots.map(c => c.attributeName)
        )
      )
    )
  );

  return (
    <div className="space-y-8">
      {/* Overview Info */}
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-blue-600" />
        <p className="text-sm text-muted-foreground">
          Compare different package options with varying hotel and pricing selections side-by-side.
        </p>
      </div>

      {/* Hotel Comparison Table */}
      {allDayNumbers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Hotel Comparison by Day
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase divide-x divide-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-24">Day</th>
                  {variants.map(variant => (
                    <th key={variant.id} className="px-4 py-3 font-semibold bg-blue-50/50">
                      <div className="text-blue-900">{variant.name}</div>
                      {variant.priceModifier && variant.priceModifier !== 0 ? (
                        <div className="text-[10px] font-normal text-blue-600 mt-1">
                          {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}% adjustment
                        </div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allDayNumbers.map((day, idx) => (
                  <tr key={day} className={`divide-x divide-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">Day {day}</td>
                    {variants.map(variant => {
                      const hotelInfo = variant.hotelSnapshots.find(h => h.dayNumber === day);
                      return (
                        <td key={variant.id} className="px-4 py-3 align-top">
                          {hotelInfo ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{hotelInfo.hotelName}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">📍 {hotelInfo.locationLabel}</div>
                              {hotelInfo.roomCategory && (
                                <div className="mt-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full font-medium">
                                  {hotelInfo.roomCategory}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Not specified</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Comparison Table */}
      {variants.some(v => v.pricingSnapshots.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Pricing Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase divide-x divide-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-1/4">Component</th>
                  {variants.map(variant => (
                    <th key={variant.id} className="px-4 py-3 font-semibold bg-emerald-50/50 text-emerald-900">
                      {variant.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Metadata Rows */}
                <tr className="divide-x divide-gray-200 bg-white">
                  <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">🍽️ Meal Plan</td>
                  {variants.map(variant => (
                    <td key={variant.id} className="px-4 py-3 text-gray-700">
                      {variant.pricingSnapshots[0]?.mealPlanName || '—'}
                    </td>
                  ))}
                </tr>
                <tr className="divide-x divide-gray-200 bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50">🛏️ Rooms & Transport</td>
                  {variants.map(variant => {
                    const ps = variant.pricingSnapshots[0];
                    return (
                      <td key={variant.id} className="px-4 py-3 text-gray-700">
                        {ps ? `${ps.numberOfRooms} Room(s)${ps.vehicleTypeName ? ` · ${ps.vehicleTypeName}` : ''}` : '—'}
                      </td>
                    );
                  })}
                </tr>

                {/* Individual Components */}
                {allPricingComponents.map((compName, idx) => (
                  <tr key={compName} className={`divide-x divide-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">{compName}</td>
                    {variants.map(variant => {
                      const comp = variant.pricingSnapshots[0]?.pricingComponentSnapshots.find(c => c.attributeName === compName);
                      return (
                        <td key={variant.id} className="px-4 py-3">
                          {comp ? `₹ ${Number(comp.price).toLocaleString('en-IN')}` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="divide-x divide-emerald-200 bg-emerald-50">
                  <td className="px-4 py-4 font-bold text-emerald-900 uppercase">💰 Total Price</td>
                  {variants.map(variant => {
                    const ps = variant.pricingSnapshots[0];
                    return (
                      <td key={variant.id} className="px-4 py-4 font-bold text-emerald-700 text-lg">
                        {ps?.totalPrice ? `₹ ${Number(ps.totalPrice).toLocaleString('en-IN')}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
