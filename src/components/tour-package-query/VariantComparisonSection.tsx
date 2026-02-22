/**
 * VariantComparisonSection Component
 * 
 * Displays selected tour package variants side-by-side for comparison
 * Shows hotel options (with images) and pricing for each variant
 * Matches the layout and richness of the PDF generator variant comparison
 */

import Image from "next/image";
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

const formatINR = (val: string | number): string => {
  try {
    const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    if (isNaN(n)) return String(val);
    return n.toLocaleString('en-IN');
  } catch {
    return String(val);
  }
};

const variantAccentColors = ['#DC2626', '#EA580C', '#D97706', '#92400E', '#7C3AED', '#2563EB'];

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

  // Calculate totals for "Best Value" badge
  const variantTotals = variants.map(v => {
    try {
      const ps = v.pricingSnapshots[0];
      if (ps?.totalPrice) {
        const n = parseFloat(String(ps.totalPrice));
        if (!isNaN(n) && n > 0) return n;
      }
    } catch { /* fall through */ }
    return Infinity;
  });
  const minPrice = Math.min(...variantTotals.filter(t => t !== Infinity));

  return (
    <div className="space-y-8">
      {/* Overview Info */}
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-blue-600" />
        <p className="text-sm text-muted-foreground">
          Compare different package options with varying hotel and pricing selections side-by-side.
        </p>
      </div>

      {/* Hotel Comparison Section */}
      {allDayNumbers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-5 py-4 border-b border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Hotel Comparison</h3>
              <p className="text-xs text-gray-500">Accommodations across all {variants.length} variants — night by night</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-3 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 text-center w-16 text-xs uppercase tracking-wider">Night</th>
                  {variants.map((variant, idx) => (
                    <th key={variant.id} className="px-4 py-3 bg-orange-50 text-center">
                      <div className="font-bold text-red-700 text-sm">{variant.name}</div>
                      {variant.priceModifier && variant.priceModifier !== 0 ? (
                        <div className="text-[10px] font-normal text-gray-500 mt-1">
                          {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}% adjustment
                        </div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allDayNumbers.map((day, idx) => (
                  <tr key={day} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-3 text-center bg-orange-50/80">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                        {day}
                      </div>
                    </td>
                    {variants.map((variant, vidx) => {
                      const hotelInfo = variant.hotelSnapshots.find(h => h.dayNumber === day);
                      const accent = variantAccentColors[vidx % variantAccentColors.length];
                      return (
                        <td key={variant.id} className="px-3 py-3 align-top">
                          {hotelInfo ? (
                            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {/* Hotel Image */}
                              {hotelInfo.imageUrl ? (
                                <div className="relative w-full h-28 bg-gray-100">
                                  <Image
                                    src={hotelInfo.imageUrl}
                                    alt={hotelInfo.hotelName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-orange-50 flex items-center justify-center">
                                  <span className="text-3xl">🏨</span>
                                </div>
                              )}
                              {/* Hotel Info */}
                              <div className="p-3" style={{ borderTop: `3px solid ${accent}` }}>
                                <div className="font-bold text-gray-900 text-sm leading-tight mb-1">{hotelInfo.hotelName}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">📍 {hotelInfo.locationLabel}</div>
                                {hotelInfo.roomCategory && (
                                  <span
                                    className="mt-2 inline-block px-2 py-0.5 text-[10px] rounded-full font-semibold text-white"
                                    style={{ backgroundColor: accent }}
                                  >
                                    {hotelInfo.roomCategory}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-28 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                              <span className="text-xl opacity-40">🏷️</span>
                              <span className="text-gray-400 italic text-[10px] mt-1">Not specified</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-orange-50 px-4 py-2 border-t border-orange-100">
            <p className="text-[11px] text-orange-700 italic">💡 Hotel availability may vary. Final accommodation is confirmed at the time of booking.</p>
          </div>
        </div>
      )}

      {/* Pricing Comparison Table */}
      {variants.some(v => v.pricingSnapshots.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border-b border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Price Comparison</h3>
              <p className="text-xs text-gray-500">Detailed pricing breakdown across all {variants.length} package variants</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase divide-x divide-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-1/4">Component</th>
                  {variants.map(variant => (
                    <th key={variant.id} className="px-4 py-3 font-semibold bg-orange-50/50 text-center">
                      <div className="text-red-700 font-bold">{variant.name}</div>
                      {variant.priceModifier && variant.priceModifier !== 0 ? (
                        <div className="text-[9px] font-normal text-gray-500 mt-1">
                          {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}%
                        </div>
                      ) : null}
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
                        <td key={variant.id} className="px-4 py-3 text-right">
                          {comp ? (
                            <span className="font-semibold text-gray-900">₹ {formatINR(comp.price)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="divide-x divide-orange-200 bg-orange-50 border-t-2 border-red-500">
                  <td className="px-4 py-4 font-bold text-red-800 uppercase bg-orange-50">💰 Total Price</td>
                  {variants.map((variant, idx) => {
                    const ps = variant.pricingSnapshots[0];
                    const total = ps?.totalPrice ? Number(ps.totalPrice) : 0;
                    const totalStr = total > 0 ? `₹ ${formatINR(total)}` : '—';
                    const isBest = variantTotals[idx] === minPrice && minPrice !== Infinity;
                    return (
                      <td key={variant.id} className="px-4 py-4 text-center">
                        <div className="text-xl font-extrabold text-red-700">{totalStr}</div>
                        {isBest && totalStr !== '—' && (
                          <span className="inline-block mt-1 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            Best Value
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-orange-50 px-4 py-2 border-t border-orange-100">
            <p className="text-[11px] text-gray-500 italic">All prices include GST. Subject to availability.</p>
          </div>
        </div>
      )}
    </div>
  );
}
