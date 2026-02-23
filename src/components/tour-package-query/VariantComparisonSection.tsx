/**
 * VariantComparisonSection Component
 * 
 * Displays selected tour package variants side-by-side for comparison.
 * Shows hotel options (with images), day-wise room allocation, meal plan & transport, and pricing.
 * Color scheme: red/orange gradient matching Aagam Holidays branding.
 */

import React from "react";
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
  sourceVariantId?: string;
  name: string;
  description: string | null;
  priceModifier: number | null;
  isDefault: boolean;
  sortOrder: number;
  hotelSnapshots: VariantHotelSnapshot[];
  pricingSnapshots: PricingSnapshot[];
}

interface VariantPricingEntry {
  components?: { name: string; price: string; description?: string }[];
  totalCost?: number;
  remarks?: string;
}

interface ItineraryData {
  dayNumber: number | null;
  roomAllocations?: any[];
  transportDetails?: any[];
}

interface VariantComparisonSectionProps {
  variants: VariantSnapshot[];
  variantPricingData?: Record<string, VariantPricingEntry> | null;
  variantRoomAllocations?: any;
  variantTransportDetails?: any;
  itineraries?: ItineraryData[];
  roomTypes?: any[];
  occupancyTypes?: any[];
  mealPlans?: any[];
  vehicleTypes?: any[];
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

const getName = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field?.name || '';
};

export function VariantComparisonSection({
  variants,
  variantPricingData,
  variantRoomAllocations,
  variantTransportDetails,
  itineraries,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = []
}: VariantComparisonSectionProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  const getVpd = (v: VariantSnapshot): VariantPricingEntry | undefined =>
    variantPricingData?.[(v as any).sourceVariantId] as VariantPricingEntry | undefined;

  // Build itinerary lookup by day number
  const itineraryByDay: Record<number, ItineraryData> = {};
  if (itineraries) {
    console.log("VariantComparisonSection - Total itineraries passed:", itineraries.length);
    for (const it of itineraries) {
      if (it.dayNumber != null) {
        itineraryByDay[it.dayNumber] = it;
        console.log(`Day ${it.dayNumber} - RoomAllocations:`, it.roomAllocations);
      }
    }
  }

  // Get all unique days
  const allDayNumbers = Array.from(
    new Set(variants.flatMap(v => v.hotelSnapshots.map(h => h.dayNumber)))
  ).sort((a, b) => a - b);

  // Get all unique pricing components
  const allPricingComponents = Array.from(
    new Set([
      ...variants.flatMap(v =>
        v.pricingSnapshots.flatMap(p =>
          p.pricingComponentSnapshots.map(c => c.attributeName)
        )
      ),
      ...variants.flatMap(v =>
        (getVpd(v)?.components || []).map(c => c.name).filter(Boolean)
      ),
    ])
  );

  // Calculate totals for "Best Value" badge
  const variantTotals = variants.map(v => {
    const vpd = getVpd(v);
    if (vpd?.totalCost) {
      const n = parseFloat(String(vpd.totalCost));
      if (!isNaN(n) && n > 0) return n;
    }
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

  const hasPricing = variants.some(v => v.pricingSnapshots.length > 0 || !!getVpd(v)?.totalCost);

  return (
    <div className="space-y-8">
      {/* Overview Info */}
      <div className="flex items-center gap-2 mb-4">

      </div>

      {/* Hotel Comparison Section */}
      {allDayNumbers.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4 border-b border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Hotel Comparison</h3>
              <p className="text-xs text-gray-500">Accommodations, room allocation & transport — night by night</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-3 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 text-center w-16 text-xs uppercase tracking-wider">Night</th>
                  {variants.map((variant) => (
                    <th key={variant.id} className="px-4 py-3 bg-orange-50 text-center border-l border-orange-100">
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
                {allDayNumbers.map((day, idx) => {
                  const itinerary = itineraryByDay[day];

                  return (
                    <tr key={day} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                      <td className="px-3 py-3 text-center bg-orange-50/80 border-r border-orange-100 align-top">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                          {day}
                        </div>
                      </td>
                      {variants.map((variant: any, vidx) => {
                        const hotelInfo = variant.hotelSnapshots.find((h: any) => h.dayNumber === day);
                        const accent = variantAccentColors[vidx % variantAccentColors.length];

                        // Use variant-specific room allocations, fallback to default itinerary allocations
                        const roomAllocations = variantRoomAllocations?.[variant.sourceVariantId]?.[(itinerary as any)?.id] ||
                          variantRoomAllocations?.[variant.id]?.[(itinerary as any)?.id] ||
                          itinerary?.roomAllocations || [];

                        const transportDetails = variantTransportDetails?.[variant.sourceVariantId]?.[(itinerary as any)?.id] ||
                          variantTransportDetails?.[variant.id]?.[(itinerary as any)?.id] ||
                          itinerary?.transportDetails || [];

                        return (
                          <td key={variant.id} className="px-3 py-3 align-top border-l border-gray-100">
                            {hotelInfo ? (
                              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                {/* Hotel Image */}
                                {hotelInfo.imageUrl ? (
                                  <div className="relative w-full h-40 bg-gray-100">
                                    <Image
                                      src={hotelInfo.imageUrl}
                                      alt={hotelInfo.hotelName}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full h-24 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                                    <span className="text-3xl">🏨</span>
                                  </div>
                                )}
                                {/* Hotel Info */}
                                <div className="p-3" style={{ borderTop: `3px solid ${accent}` }}>
                                  <div className="font-bold text-gray-900 text-sm leading-tight mb-1">{hotelInfo.hotelName}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">📍 {hotelInfo.locationLabel}</div>
                                  {hotelInfo.roomCategory && (
                                    <span
                                      className="inline-block px-2 py-0.5 text-[10px] rounded-full font-semibold text-white mb-2"
                                      style={{ backgroundColor: accent }}
                                    >
                                      {hotelInfo.roomCategory}
                                    </span>
                                  )}

                                  {/* Room Allocation Details inside the hotel card */}
                                  {roomAllocations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <div className="text-[10px] font-bold text-orange-700 mb-1">🛏️ Room Allocation</div>
                                      {roomAllocations.map((room: any, ri: number) => {
                                        const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';

                                        // If room has actual nested objects (from default itineraries), use them.
                                        // Otherwise (from variant records), map from the ID using the passed prop arrays.
                                        const roomTypeObj = room?.roomType || roomTypes.find(rt => rt.id === room?.roomTypeId);
                                        const occupancyObj = room?.occupancyType || occupancyTypes.find(ot => ot.id === room?.occupancyTypeId);
                                        const mealPlanObj = room?.mealPlan || mealPlans.find(mp => mp.id === room?.mealPlanId);

                                        const roomTypeName = customText || getName(roomTypeObj) || 'Standard';
                                        const occupancy = getName(occupancyObj) || '';
                                        const mealPlanName = getName(mealPlanObj) || '';

                                        return (
                                          <div key={ri} className="text-[10px] text-gray-700 leading-snug mb-1 last:mb-0">
                                            <div className="font-semibold text-gray-800">{roomTypeName}{occupancy ? ` · ${occupancy}` : ''}</div>
                                            <div className="text-gray-500">
                                              {room.quantity || 1} Room{(room.quantity || 1) > 1 ? 's' : ''}
                                              {mealPlanName ? ` · 🍽️ ${mealPlanName}` : ''}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Transport Details inside the hotel card */}
                                  {transportDetails.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <div className="text-[10px] font-bold text-orange-700 mb-1">🚗 Transport</div>
                                      {transportDetails.map((t: any, ti: number) => {
                                        const vehicleObj = t?.vehicleType || vehicleTypes.find(vt => vt.id === t?.vehicleTypeId);
                                        const vehicleName = getName(vehicleObj) || 'Vehicle';
                                        return (
                                          <div key={ti} className="text-[10px] text-gray-700 leading-snug">
                                            <span className="font-semibold">{vehicleName}</span>
                                            {(t.quantity || 1) > 1 && <span> ×{t.quantity}</span>}
                                            {t.capacity && <span className="text-gray-400"> ({t.capacity})</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-32 flex flex-col items-center justify-center border border-dashed border-orange-200 rounded-lg bg-orange-50/30">
                                <span className="text-xl opacity-40">🏷️</span>
                                <span className="text-gray-400 italic text-[10px] mt-1">Not specified</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-orange-50 px-4 py-2 border-t border-orange-100">
            <p className="text-[11px] text-orange-700 italic">💡 Hotel availability may vary. Final accommodation is confirmed at the time of booking.</p>
          </div>
        </div>
      )}

      {/* Pricing Comparison Table */}
      {(hasPricing || allPricingComponents.length > 0) && (
        <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-5 py-4 border-b border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Price Comparison</h3>
              <p className="text-xs text-gray-500">Detailed pricing breakdown across all {variants.length} package variants</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold bg-gray-50 text-gray-700 uppercase text-xs w-1/4">Component</th>
                  {variants.map(variant => (
                    <th key={variant.id} className="px-4 py-3 font-semibold bg-orange-50 text-center border-l border-orange-100">
                      <div className="text-red-700 font-bold">{variant.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allPricingComponents.map((compName, idx) => (
                  <tr key={compName} className={`divide-x divide-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">{compName}</td>
                    {variants.map(variant => {
                      const vpd = getVpd(variant);
                      const vpdComp = (vpd?.components || []).find(c => c.name === compName);
                      if (vpdComp) {
                        return (
                          <td key={variant.id} className="px-4 py-3 text-right">
                            <span className="font-semibold text-gray-900">₹ {formatINR(String(vpdComp.price || 0))}</span>
                          </td>
                        );
                      }
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
                    const vpd = getVpd(variant);
                    let totalStr = '—';
                    if (vpd?.totalCost) {
                      const n = parseFloat(String(vpd.totalCost));
                      if (!isNaN(n) && n > 0) totalStr = `₹ ${formatINR(n.toString())}`;
                    } else {
                      const ps = variant.pricingSnapshots[0];
                      if (ps?.totalPrice) {
                        const n = parseFloat(String(ps.totalPrice));
                        if (!isNaN(n) && n > 0) totalStr = `₹ ${formatINR(String(ps.totalPrice))}`;
                      }
                    }
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
          {!hasPricing ? (
            <div className="bg-yellow-50 px-4 py-2 border-t border-yellow-200">
              <p className="text-[11px] text-yellow-800 italic">⚠ No pricing data found. Please enter pricing in the Variants Pricing Tab and save.</p>
            </div>
          ) : (
            <div className="bg-orange-50 px-4 py-2 border-t border-orange-100">
              <p className="text-[11px] text-gray-500 italic">All prices include GST. Subject to availability.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
