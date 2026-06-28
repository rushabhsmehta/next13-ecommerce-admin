"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Save, X, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OccupancyPrice, PricingSheet } from "@/lib/hotel-pricing-matrix";
import { applyPercentToSheet } from "@/lib/hotel-pricing-matrix";

interface OccupancyType {
  id: string;
  name: string;
  rank?: number;
}

interface PricingSheetEditorProps {
  sheet: PricingSheet;
  hotelId: string;
  occupancyTypes: OccupancyType[];
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function PricingSheetEditor({
  sheet,
  hotelId,
  occupancyTypes,
  onSave,
  onCancel,
  disabled,
}: PricingSheetEditorProps) {
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ot of occupancyTypes) {
      const existing = sheet.occupancyPrices.find((o) => o.occupancyTypeId === ot.id);
      initial[ot.id] = existing ? String(existing.price) : "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [percentInput, setPercentInput] = useState("");

  const handleApplyPercent = () => {
    const pct = parseFloat(percentInput);
    if (isNaN(pct)) {
      toast.error("Enter a valid percentage");
      return;
    }
    const adjusted = applyPercentToSheet(sheet, pct);
    const next: Record<string, string> = { ...prices };
    for (const ot of occupancyTypes) {
      const found = adjusted.occupancyPrices.find((o) => o.occupancyTypeId === ot.id);
      if (found) {
        next[ot.id] = String(found.price);
      }
    }
    setPrices(next);
    toast.success(`Applied ${pct > 0 ? "+" : ""}${pct}%`);
  };

  const handleSave = async () => {
    const occupancyPrices: OccupancyPrice[] = [];
    for (const ot of occupancyTypes) {
      const raw = prices[ot.id];
      if (raw === "" || raw === undefined) continue;
      const price = parseFloat(raw);
      if (isNaN(price) || price < 0) {
        toast.error(`Invalid price for ${ot.name}`);
        return;
      }
      const existing = sheet.occupancyPrices.find((o) => o.occupancyTypeId === ot.id);
      occupancyPrices.push({
        occupancyTypeId: ot.id,
        price,
        rowId: existing?.rowId,
      });
    }

    if (occupancyPrices.length === 0) {
      toast.error("Enter at least one occupancy price");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`/api/hotels/${hotelId}/pricing/batch`, {
        startDate: sheet.startDate,
        endDate: sheet.endDate,
        roomTypeId: sheet.roomTypeId,
        mealPlanId: sheet.mealPlanId,
        locationSeasonalPeriodId: sheet.locationSeasonalPeriodId,
        occupancyPrices,
        applySplit: true,
        deleteMissingOccupancies: true,
      });
      toast.success("Pricing sheet saved");
      onSave();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save pricing sheet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-blue-50/50 space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {occupancyTypes.map((ot) => (
                <TableHead key={ot.id} className="text-center min-w-[120px]">
                  {ot.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {occupancyTypes.map((ot) => (
                <TableCell key={ot.id} className="p-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="—"
                    value={prices[ot.id] ?? ""}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, [ot.id]: e.target.value }))
                    }
                    className="text-center"
                    disabled={disabled || saving}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="% adjust"
            value={percentInput}
            onChange={(e) => setPercentInput(e.target.value)}
            className="w-24"
            disabled={disabled || saving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyPercent}
            disabled={disabled || saving || !percentInput}
          >
            <Percent className="h-3 w-3 mr-1" />
            Apply
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={disabled || saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Sheet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
