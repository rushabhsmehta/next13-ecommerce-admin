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

  // Group hotel snapshots by day number across all variants
  const allDayNumbers = Array.from(
    new Set(
      variants.flatMap(v => v.hotelSnapshots.map(h => h.dayNumber))
    )
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Variant Comparison</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Compare different package options with varying hotel and pricing selections
      </p>

      {/* Variant Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {variants.map((variant) => (
          <Card key={variant.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{variant.name}</CardTitle>
                  {variant.description && (
                    <CardDescription className="mt-1">{variant.description}</CardDescription>
                  )}
                </div>
                {variant.isDefault && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Default
                  </Badge>
                )}
              </div>
              {variant.priceModifier !== null && variant.priceModifier !== 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className={variant.priceModifier > 0 ? 'text-orange-600 border-orange-300' : 'text-green-600 border-green-300'}>
                    {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}% Price Adjustment
                  </Badge>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-4 space-y-4">
              {/* Hotels Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm">Hotels</h4>
                </div>
                <div className="space-y-2">
                  {variant.hotelSnapshots.length > 0 ? (
                    variant.hotelSnapshots
                      .sort((a, b) => a.dayNumber - b.dayNumber)
                      .map((hotel) => (
                        <div key={hotel.id} className="flex gap-2 text-xs">
                          <Badge variant="outline" className="w-16 justify-center">
                            Day {hotel.dayNumber}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{hotel.hotelName}</div>
                            <div className="text-muted-foreground truncate">{hotel.locationLabel}</div>
                            {hotel.roomCategory && (
                              <div className="text-xs text-blue-600">{hotel.roomCategory}</div>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No hotels configured</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Pricing Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-sm">Pricing</h4>
                </div>
                {variant.pricingSnapshots.length > 0 ? (
                  <div className="space-y-3">
                    {variant.pricingSnapshots.map((pricing) => (
                      <div key={pricing.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">{pricing.mealPlanName}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            ₹{Number(pricing.totalPrice).toLocaleString('en-IN')}
                          </Badge>
                        </div>
                        {pricing.vehicleTypeName && (
                          <div className="text-xs text-muted-foreground">
                            Transport: {pricing.vehicleTypeName}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {pricing.numberOfRooms} {pricing.numberOfRooms === 1 ? 'Room' : 'Rooms'}
                        </div>
                        
                        {/* Pricing Components Breakdown */}
                        {pricing.pricingComponentSnapshots.length > 0 && (
                          <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                            {pricing.pricingComponentSnapshots.map((component) => (
                              <div key={component.id} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{component.attributeName}</span>
                                <span className="font-medium">₹{Number(component.price).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No pricing configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hotel Comparison Table */}
      {allDayNumbers.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Day-by-Day Hotel Comparison</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="border border-gray-200 dark:border-gray-700 p-2 text-left text-sm font-medium">
                    Day
                  </th>
                  {variants.map((variant) => (
                    <th key={variant.id} className="border border-gray-200 dark:border-gray-700 p-2 text-left text-sm font-medium">
                      {variant.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDayNumbers.map((dayNumber) => (
                  <tr key={dayNumber} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="border border-gray-200 dark:border-gray-700 p-2 font-medium">
                      Day {dayNumber}
                    </td>
                    {variants.map((variant) => {
                      const hotel = variant.hotelSnapshots.find(h => h.dayNumber === dayNumber);
                      return (
                        <td key={variant.id} className="border border-gray-200 dark:border-gray-700 p-2">
                          {hotel ? (
                            <div>
                              <div className="font-medium text-sm">{hotel.hotelName}</div>
                              <div className="text-xs text-muted-foreground">{hotel.locationLabel}</div>
                              {hotel.roomCategory && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {hotel.roomCategory}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No hotel</span>
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
    </div>
  );
}
