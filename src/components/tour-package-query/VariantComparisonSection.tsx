/**
 * VariantComparisonSection Component
 *
 * Displays selected tour package variants side-by-side for comparison.
 * Shows hotel options (with images), day-wise room allocation, meal plan & transport, and pricing.
 * Color scheme: red/orange gradient matching Aagam Holidays branding.
 */

import React from "react";
import Image from "next/image";
import { Building2, DollarSign } from "lucide-react";
import {
  buildPackageTotalCalculationParts,
  findPricingRowPrice,
  getVariantPricingDisplayRows,
  mergeVariantPricingRowLabels,
  type VariantPricingEntry,
} from "@/lib/variant-pricing-display";
import { PricingCalculationBreakdown } from "@/components/tour-package-query/PricingCalculationBreakdown";

interface VariantHotelSnapshot {
  id: string;
  dayNumber: number;
  hotelName: string;
  locationLabel: string;
  imageUrl: string | null;
  roomCategory: string | null;
  hotel?: { destination?: { name: string } | null } | null;
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

interface HotelNightCardProps {
  hotelInfo: VariantHotelSnapshot | null | undefined;
  accent: string;
  roomAllocations: any[];
  transportDetails: any[];
  roomTypes: any[];
  occupancyTypes: any[];
  mealPlans: any[];
  vehicleTypes: any[];
}

const formatINR = (val: string | number): string => {
  try {
    const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN");
  } catch {
    return String(val);
  }
};

const variantAccentColors = ["#DC2626", "#EA580C", "#D97706", "#92400E", "#7C3AED", "#2563EB"];

const getName = (field: any): string => {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field?.name || "";
};

function HotelNightCardContent({
  hotelInfo,
  accent,
  roomAllocations,
  transportDetails,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
}: Omit<HotelNightCardProps, "hotelInfo"> & { hotelInfo: VariantHotelSnapshot }) {
  return (
    <div className="p-3" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{hotelInfo.hotelName}</div>
      {hotelInfo.hotel?.destination?.name && (
        <div className="text-xs font-medium text-orange-700 mb-0.5">{hotelInfo.hotel.destination.name}</div>
      )}
      <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">📍 {hotelInfo.locationLabel}</div>
      {hotelInfo.roomCategory && (
        <span
          className="inline-block px-2 py-0.5 text-[10px] rounded-full font-semibold text-white mb-2"
          style={{ backgroundColor: accent }}
        >
          {hotelInfo.roomCategory}
        </span>
      )}

      {roomAllocations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] font-bold text-orange-700 mb-1">🛏️ Room Allocation</div>
          {roomAllocations.map((room: any, ri: number) => {
            const customText = typeof room?.customRoomType === "string" ? room.customRoomType.trim() : "";
            const roomTypeObj = room?.roomType || roomTypes.find((rt) => rt.id === room?.roomTypeId);
            const occupancyObj = room?.occupancyType || occupancyTypes.find((ot) => ot.id === room?.occupancyTypeId);
            const mealPlanObj = room?.mealPlan || mealPlans.find((mp) => mp.id === room?.mealPlanId);
            const roomTypeName = customText || getName(roomTypeObj) || "Standard";
            const occupancy = getName(occupancyObj) || "";
            const mealPlanName = getName(mealPlanObj) || "";

            return (
              <div key={ri} className="text-[10px] text-gray-700 leading-snug mb-1 last:mb-0">
                <div className="font-semibold text-gray-800">
                  {roomTypeName}
                  {occupancy ? ` · ${occupancy}` : ""}
                </div>
                <div className="text-gray-500">
                  {room.quantity || 1} Room{(room.quantity || 1) > 1 ? "s" : ""}
                  {mealPlanName ? ` · 🍽️ ${mealPlanName}` : ""}
                </div>
                {room.extraBeds && room.extraBeds.length > 0 && (
                  <div className="mt-0.5 space-y-0.5 pl-1 border-l border-amber-300">
                    {room.extraBeds.map((eb: any, ebIdx: number) => {
                      const ebOccupancy =
                        eb?.occupancyType || occupancyTypes.find((ot: any) => ot.id === eb?.occupancyTypeId);
                      return (
                        <div key={ebIdx} className="text-amber-700">
                          + {getName(ebOccupancy) || "Extra Bed"}
                        </div>
                      );
                    })}
                  </div>
                )}
                {room.voucherNumber && <div className="text-gray-400">🎫 Voucher: {room.voucherNumber}</div>}
                {room.guestNames && <div className="text-gray-400 truncate">👤 {room.guestNames}</div>}
              </div>
            );
          })}
        </div>
      )}

      {transportDetails.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] font-bold text-orange-700 mb-1">🚗 Transport</div>
          {transportDetails.map((t: any, ti: number) => {
            const vehicleObj = t?.vehicleType || vehicleTypes.find((vt) => vt.id === t?.vehicleTypeId);
            const vehicleName = getName(vehicleObj) || "Vehicle";
            return (
              <div key={ti} className="text-[10px] text-gray-700 leading-snug">
                <span className="font-semibold">{vehicleName}</span>
                {(t.quantity || 1) > 1 && <span> ×{t.quantity}</span>}
                {t.capacity && <span className="text-gray-400"> ({t.capacity})</span>}
                {t.description && <div className="text-[10px] text-gray-500 mt-0.5">{t.description}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HotelNightCard({
  hotelInfo,
  accent,
  roomAllocations,
  transportDetails,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
}: HotelNightCardProps) {
  if (!hotelInfo) {
    return (
      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-orange-200 rounded-lg bg-orange-50/30">
        <span className="text-xl opacity-40">🏷️</span>
        <span className="text-gray-400 italic text-[10px] mt-1">Not specified</span>
      </div>
    );
  }

  const imageSection = hotelInfo.imageUrl ? (
    <div className="relative aspect-[16/10] bg-gray-100">
      <Image
        src={hotelInfo.imageUrl}
        alt={hotelInfo.hotelName}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 320px"
      />
    </div>
  ) : (
    <div className="relative aspect-[16/10] bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <span className="text-4xl">🏨</span>
    </div>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {imageSection}
      <HotelNightCardContent
        hotelInfo={hotelInfo}
        accent={accent}
        roomAllocations={roomAllocations}
        transportDetails={transportDetails}
        roomTypes={roomTypes}
        occupancyTypes={occupancyTypes}
        mealPlans={mealPlans}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}

function getVariantTotalStr(variant: VariantSnapshot, vpd: VariantPricingEntry | undefined): string {
  const packageParts = buildPackageTotalCalculationParts(vpd);
  if (packageParts) return `₹ ${formatINR(String(packageParts.netLineTotal))}`;
  if (vpd?.totalCost) {
    const n = parseFloat(String(vpd.totalCost));
    if (!isNaN(n) && n > 0) return `₹ ${formatINR(n.toString())}`;
  }
  const total = variant.pricingSnapshots.reduce((sum, ps) => {
    const n = parseFloat(String(ps.totalPrice ?? 0));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  if (total > 0) return `₹ ${formatINR(String(total))}`;
  return "—";
}

export function VariantComparisonSection({
  variants,
  variantPricingData,
  variantRoomAllocations,
  variantTransportDetails,
  itineraries,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = [],
}: VariantComparisonSectionProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  const isSingleVariant = variants.length === 1;
  const compactTableClass = isSingleVariant ? "max-w-2xl" : "w-full";
  const priceCellAlign = isSingleVariant ? "items-start" : "items-center";

  const getVpd = (v: VariantSnapshot): VariantPricingEntry | undefined =>
    (variantPricingData?.[(v as any).sourceVariantId] ?? variantPricingData?.[v.id]) as
      | VariantPricingEntry
      | undefined;

  const itineraryByDay: Record<number, ItineraryData> = {};
  if (itineraries) {
    for (const it of itineraries) {
      if (it.dayNumber != null) {
        itineraryByDay[it.dayNumber] = it;
      }
    }
  }

  const allDayNumbers = Array.from(
    new Set(variants.flatMap((v) => v.hotelSnapshots.map((h) => h.dayNumber)))
  ).sort((a, b) => a - b);

  const getSnapshotComponentsFlat = (v: VariantSnapshot) =>
    v.pricingSnapshots.flatMap((ps) =>
      ps.pricingComponentSnapshots.map((comp) => ({
        attributeName: comp.attributeName,
        price: comp.price,
        description: comp.description,
      }))
    );

  const variantDisplayRows = variants.map((v) =>
    getVariantPricingDisplayRows(getVpd(v) as VariantPricingEntry | undefined, getSnapshotComponentsFlat(v))
  );
  const pricingRowLabels = mergeVariantPricingRowLabels(variantDisplayRows);

  const variantTotals = variants.map((v) => {
    const vpd = getVpd(v);
    const packageParts = buildPackageTotalCalculationParts(vpd as VariantPricingEntry | undefined);
    if (packageParts) return packageParts.netLineTotal;
    if (vpd?.totalCost) {
      const n = parseFloat(String(vpd.totalCost));
      if (!isNaN(n) && n > 0) return n;
    }
    try {
      const total = v.pricingSnapshots.reduce((sum, ps) => {
        const n = parseFloat(String(ps.totalPrice ?? 0));
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      if (total > 0) return total;
    } catch {
      /* fall through */
    }
    return Infinity;
  });
  const minPrice = Math.min(...variantTotals.filter((t) => t !== Infinity));

  const hasPricing = variants.some((v) => v.pricingSnapshots.length > 0 || !!getVpd(v)?.totalCost);

  const getNightContext = (variant: VariantSnapshot, day: number) => {
    const itinerary = itineraryByDay[day];
    const hotelInfo = variant.hotelSnapshots.find((h) => h.dayNumber === day);
    const roomAllocations =
      variantRoomAllocations?.[variant.sourceVariantId]?.[(itinerary as any)?.id] ||
      variantRoomAllocations?.[variant.id]?.[(itinerary as any)?.id] ||
      itinerary?.roomAllocations ||
      [];
    const transportDetails =
      variantTransportDetails?.[variant.sourceVariantId]?.[(itinerary as any)?.id] ||
      variantTransportDetails?.[variant.id]?.[(itinerary as any)?.id] ||
      itinerary?.transportDetails ||
      [];
    return { hotelInfo, roomAllocations, transportDetails };
  };

  return (
    <div className="space-y-8">
      {allDayNumbers.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4 border-b border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Hotel Comparison</h3>
              <p className="text-xs text-gray-500">
                Accommodations, room allocation & transport — night by night
                {variants.length > 1 ? ` · ${variants.length} variants` : ""}
              </p>
            </div>
          </div>

          <div className={`overflow-x-auto ${isSingleVariant ? "px-5 py-5" : ""}`}>
            <table className={`${compactTableClass} text-sm text-left`}>
              <thead>
                <tr>
                  <th className="px-3 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 text-center w-16 text-xs uppercase tracking-wider">
                    Night
                  </th>
                  {variants.map((variant) => (
                    <th
                      key={variant.id}
                      className="px-4 py-3 bg-orange-50 text-center border-l border-orange-100"
                    >
                      <div className="font-bold text-red-700 text-sm">{variant.name}</div>
                      {variant.priceModifier && variant.priceModifier !== 0 ? (
                        <div className="text-[10px] font-normal text-gray-500 mt-1">
                          {variant.priceModifier > 0 ? "+" : ""}
                          {variant.priceModifier}% adjustment
                        </div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allDayNumbers.map((day, idx) => (
                  <tr key={day} className={idx % 2 === 0 ? "bg-white" : "bg-orange-50/30"}>
                    <td className="px-3 py-3 text-center bg-orange-50/80 border-r border-orange-100 align-top">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                        {day}
                      </div>
                    </td>
                    {variants.map((variant: any, vidx) => {
                      const { hotelInfo, roomAllocations, transportDetails } = getNightContext(variant, day);
                      return (
                        <td
                          key={variant.id}
                          className={`px-3 py-3 align-top border-l border-gray-100 ${
                            isSingleVariant ? "max-w-xs" : ""
                          }`}
                        >
                          <HotelNightCard
                            hotelInfo={hotelInfo}
                            accent={variantAccentColors[vidx % variantAccentColors.length]}
                            roomAllocations={roomAllocations}
                            transportDetails={transportDetails}
                            roomTypes={roomTypes}
                            occupancyTypes={occupancyTypes}
                            mealPlans={mealPlans}
                            vehicleTypes={vehicleTypes}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-orange-50 px-4 py-2 border-t border-orange-100">
            <p className="text-[11px] text-orange-700 italic">
              💡 Hotel availability may vary. Final accommodation is confirmed at the time of booking.
            </p>
          </div>
        </div>
      )}

      {(hasPricing || pricingRowLabels.length > 0) && (
        <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-5 py-4 border-b border-orange-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">Price Comparison</h3>
              <p className="text-xs text-gray-500">
                Detailed pricing breakdown across {variants.length} package variant
                {variants.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className={`overflow-x-auto ${isSingleVariant ? "px-5 py-5" : ""}`}>
            <table className={`${compactTableClass} text-sm text-left`}>
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold bg-gray-50 text-gray-700 uppercase text-xs w-1/3">
                    Component
                  </th>
                  {variants.map((variant) => (
                    <th
                      key={variant.id}
                      className="px-4 py-3 font-semibold bg-orange-50 text-center border-l border-orange-100"
                    >
                      <div className="text-red-700 font-bold">{variant.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingRowLabels.map((label, idx) => (
                  <tr
                    key={label}
                    className={`divide-x divide-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-orange-50/30"}`}
                  >
                    <td className="px-4 py-4 font-medium text-gray-700 bg-gray-50 align-middle">{label}</td>
                    {variants.map((variant, vidx) => {
                      const row = findPricingRowPrice(variantDisplayRows[vidx], label);
                      return (
                        <td key={variant.id} className="px-4 py-4 align-top">
                          {row ? (
                            <div className={`flex flex-col ${priceCellAlign}`}>
                              {row.calculationParts ? (
                                <PricingCalculationBreakdown parts={row.calculationParts} />
                              ) : (
                                <div className="text-xl font-bold text-red-800 tracking-tight">
                                  ₹ {formatINR(String(row.netPrice))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="divide-x divide-orange-200 bg-orange-50 border-t-2 border-red-500">
                  <td className="px-4 py-4 font-bold text-red-800 uppercase bg-orange-50 align-middle">
                    💰 Total Price
                  </td>
                  {variants.map((variant, idx) => {
                    const vpd = getVpd(variant) as VariantPricingEntry | undefined;
                    const packageParts = buildPackageTotalCalculationParts(vpd);
                    const totalStr = getVariantTotalStr(variant, vpd);
                    const isBest = !isSingleVariant && variantTotals[idx] === minPrice && minPrice !== Infinity;
                    return (
                      <td key={variant.id} className="px-4 py-4 align-top">
                        <div className={`flex flex-col ${priceCellAlign} gap-2.5`}>
                          <div className="text-xl font-extrabold text-red-700">{totalStr}</div>
                          {packageParts && (
                            <PricingCalculationBreakdown parts={packageParts} baseLabel="Base amount" />
                          )}
                          {isBest && totalStr !== "—" && (
                            <span className="inline-block bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                              Best Value
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {!hasPricing ? (
            <div className="bg-yellow-50 px-4 py-2 border-t border-yellow-200">
              <p className="text-[11px] text-yellow-800 italic">
                ⚠ No pricing data found. Please enter pricing in the Variants Pricing Tab and save.
              </p>
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
