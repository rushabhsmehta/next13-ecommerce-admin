"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Edit, Copy, Trash, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLocalDate, utcToLocal } from "@/lib/timezone-utils";
import { getSeasonColor } from "@/lib/seasonal-periods";
import {
  buildCoverageSummary,
  detectGaps,
  filterSheetsForSeason,
  filterSheetsForYear,
  groupPricingIntoSheets,
  groupSheetsBySeason,
  type FlatPricingRow,
  type PricingSheet,
} from "@/lib/hotel-pricing-matrix";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PricingSheetEditor } from "./pricing-sheet-editor";

interface OccupancyType {
  id: string;
  name: string;
  rank?: number;
}

interface SeasonalPeriod {
  id: string;
  name: string;
  seasonType: string;
}

interface PricingMatrixViewProps {
  hotelId: string;
  pricingPeriods: FlatPricingRow[];
  occupancyTypes: OccupancyType[];
  seasonalPeriods: SeasonalPeriod[];
  selectedSeasonFilter: string | null;
  pricingYear: number;
  loading?: boolean;
  onRefresh: () => void;
  onCopySheet?: (sheet: PricingSheet) => void;
}

function formatDateRange(startDate: string, endDate: string) {
  const start = formatLocalDate(utcToLocal(startDate) || new Date(startDate), "dd MMM yyyy");
  const end = formatLocalDate(utcToLocal(endDate) || new Date(endDate), "dd MMM yyyy");
  return `${start} – ${end}`;
}

function priceRangeLabel(sheet: PricingSheet) {
  if (sheet.occupancyPrices.length === 0) return "—";
  const prices = sheet.occupancyPrices.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `₹${min.toLocaleString()}`;
  return `₹${min.toLocaleString()} – ₹${max.toLocaleString()}`;
}

export function PricingMatrixView({
  hotelId,
  pricingPeriods,
  occupancyTypes,
  seasonalPeriods,
  selectedSeasonFilter,
  pricingYear,
  loading,
  onRefresh,
  onCopySheet,
}: PricingMatrixViewProps) {
  const [editingSheetKey, setEditingSheetKey] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const sheets = useMemo(() => {
    let grouped = groupPricingIntoSheets(pricingPeriods, occupancyTypes);
    grouped = filterSheetsForYear(grouped, pricingYear);
    if (selectedSeasonFilter) {
      grouped = filterSheetsForSeason(grouped, selectedSeasonFilter);
    }
    return grouped;
  }, [pricingPeriods, occupancyTypes, pricingYear, selectedSeasonFilter]);

  const seasonGroups = useMemo(() => groupSheetsBySeason(sheets), [sheets]);

  const coverage = useMemo(
    () =>
      buildCoverageSummary(
        groupPricingIntoSheets(pricingPeriods, occupancyTypes),
        occupancyTypes,
        seasonalPeriods.map((p) => p.id)
      ),
    [pricingPeriods, occupancyTypes, seasonalPeriods]
  );

  const toggleSeason = (key: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteSheet = async (sheet: PricingSheet) => {
    if (!confirm(`Delete all ${sheet.occupancyPrices.length} rates for this sheet?`)) return;
    try {
      await Promise.all(
        sheet.rowIds.map((id) =>
          axios.delete(`/api/hotels/${hotelId}/pricing/${id}`)
        )
      );
      toast.success("Sheet deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete sheet");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <p>Loading pricing sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seasonalPeriods.length > 0 && (
        <Card className="border-amber-100 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Coverage ({pricingYear})</CardTitle>
            <CardDescription>
              {coverage.seasonsWithPricing} of {coverage.totalSeasons} seasons have pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {coverage.roomMealCombos.slice(0, 3).map((combo) => (
              <div key={`${combo.roomTypeId}-${combo.mealPlanId}`} className="flex justify-between">
                <span>
                  {combo.roomTypeName} / {combo.mealPlanCode}
                </span>
                <span className="text-muted-foreground">
                  {combo.seasonsCovered}/{combo.totalSeasons} seasons
                  {combo.missingOccupancies.length > 0 && (
                    <span className="text-amber-700 ml-1">(gaps)</span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sheets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No pricing sheets for {pricingYear}
          {selectedSeasonFilter ? " in the selected season" : ""}.
        </div>
      ) : (
        seasonGroups.map((group) => {
          const isExpanded = expandedSeasons.has(group.seasonKey) || expandedSeasons.size === 0;
          return (
            <Collapsible
              key={group.seasonKey}
              open={isExpanded}
              onOpenChange={() => toggleSeason(group.seasonKey)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {group.seasonType && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              getSeasonColor(group.seasonType).bg,
                              getSeasonColor(group.seasonType).text
                            )}
                          >
                            {group.seasonName}
                          </span>
                        )}
                        {!group.seasonType && (
                          <CardTitle className="text-base">{group.seasonName}</CardTitle>
                        )}
                        <span className="text-sm text-muted-foreground">
                          ({group.sheets.length} sheet{group.sheets.length === 1 ? "" : "s"})
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3 pt-0">
                    {group.sheets.map((sheet) => {
                      const gaps = detectGaps(sheet, occupancyTypes);
                      const isEditing = editingSheetKey === sheet.key;

                      return (
                        <div
                          key={sheet.key}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-medium">
                                {sheet.roomTypeName ?? sheet.roomTypeId}
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  · {sheet.mealPlanCode ?? "No meal plan"}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDateRange(sheet.startDate, sheet.endDate)}
                              </div>
                              <div className="text-sm font-semibold mt-1">
                                {priceRangeLabel(sheet)}
                              </div>
                              {gaps.length > 0 && !isEditing && (
                                <div className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Missing: {gaps.map((g) => g.occupancyTypeName).join(", ")}
                                </div>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingSheetKey(sheet.key)}
                                  disabled={!!editingSheetKey}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                {onCopySheet && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onCopySheet(sheet)}
                                    disabled={!!editingSheetKey}
                                    title="Copy sheet"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSheet(sheet)}
                                  disabled={!!editingSheetKey}
                                  title="Delete sheet"
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    {occupancyTypes.map((ot) => (
                                      <th
                                        key={ot.id}
                                        className="text-left py-1 px-2 font-medium text-muted-foreground"
                                      >
                                        {ot.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {occupancyTypes.map((ot) => {
                                      const price = sheet.occupancyPrices.find(
                                        (o) => o.occupancyTypeId === ot.id
                                      )?.price;
                                      return (
                                        <td key={ot.id} className="py-1 px-2">
                                          {price !== undefined ? (
                                            <span className="font-medium">
                                              ₹{price.toLocaleString()}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {isEditing && (
                            <PricingSheetEditor
                              sheet={sheet}
                              hotelId={hotelId}
                              occupancyTypes={occupancyTypes}
                              onSave={() => {
                                setEditingSheetKey(null);
                                onRefresh();
                              }}
                              onCancel={() => setEditingSheetKey(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })
      )}
    </div>
  );
}
