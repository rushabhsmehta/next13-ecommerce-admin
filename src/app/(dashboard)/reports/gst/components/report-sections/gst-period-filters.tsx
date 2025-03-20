"use client";

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGSTReportContext } from '../gst-report';

interface GSTPeriodFiltersProps {
  onRangeChange: (range: { from: Date; to: Date }) => void;
}

export function GSTPeriodFilters({ onRangeChange }: GSTPeriodFiltersProps) {
  const { setDate } = useGSTReportContext();
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly" | "annual" | "custom">("monthly");
  const [currentPeriod, setCurrentPeriod] = useState<Date>(new Date());
  
  // Handle period type change
  const handlePeriodTypeChange = (value: "monthly" | "quarterly" | "annual" | "custom") => {
    setPeriodType(value);
    
    // Update date range based on the new period type
    const now = new Date();
    let from: Date;
    let to: Date;
    
    switch (value) {
      case "monthly":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
        
      case "quarterly":
        // Current month and the previous two
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
        
      case "annual":
        // Last 12 months
        from = subMonths(now, 11);
        from = new Date(from.getFullYear(), from.getMonth(), 1); // Start of month
        to = endOfMonth(now);
        break;
        
      case "custom":
        // Default to last 3 months for custom
        from = subMonths(now, 3);
        to = now;
        break;
    }
    
    setDate({ from, to });
    setCurrentPeriod(now);
    if (onRangeChange) {
      onRangeChange({ from, to });
    }
  };
  
  // Handle period navigation (prev/next)
  const handlePeriodChange = (direction: 'prev' | 'next') => {
    let newPeriod: Date;
    let from: Date;
    let to: Date;
    
    if (direction === 'prev') {
      switch (periodType) {
        case "monthly":
          newPeriod = subMonths(currentPeriod, 1);
          break;
        case "quarterly":
          newPeriod = subMonths(currentPeriod, 3);
          break;
        case "annual":
          newPeriod = subMonths(currentPeriod, 12);
          break;
        default:
          return;
      }
    } else {
      switch (periodType) {
        case "monthly":
          newPeriod = addMonths(currentPeriod, 1);
          break;
        case "quarterly":
          newPeriod = addMonths(currentPeriod, 3);
          break;
        case "annual":
          newPeriod = addMonths(currentPeriod, 12);
          break;
        default:
          return;
      }
    }
    
    // Don't allow future periods
    if (newPeriod > new Date()) {
      return;
    }
    
    setCurrentPeriod(newPeriod);
    
    // Update the date range based on new period
    switch (periodType) {
      case "monthly":
        from = startOfMonth(newPeriod);
        to = endOfMonth(newPeriod);
        break;
      case "quarterly":
        from = startOfMonth(subMonths(newPeriod, 2));
        to = endOfMonth(newPeriod);
        break;
      case "annual":
        from = subMonths(newPeriod, 11);
        from = new Date(from.getFullYear(), from.getMonth(), 1);
        to = endOfMonth(newPeriod);
        break;
      default:
        return;
    }
    
    setDate({ from, to });
    if (onRangeChange) {
      onRangeChange({ from, to });
    }
  };

  // Format period label based on period type
  const getPeriodLabel = () => {
    switch (periodType) {
      case "monthly":
        return format(currentPeriod, "MMMM yyyy");
      case "quarterly": {
        const start = subMonths(currentPeriod, 2);
        return `${format(start, "MMM")} - ${format(currentPeriod, "MMM yyyy")}`;
      }
      case "annual": {
        const start = subMonths(currentPeriod, 11);
        return `${format(start, "MMM yyyy")} - ${format(currentPeriod, "MMM yyyy")}`;
      }
      default:
        return "Custom Period";
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-[180px]">
          <Label htmlFor="period-type" className="mb-1 block">Period Type</Label>
          <Select value={periodType} onValueChange={(val: any) => handlePeriodTypeChange(val)}>
            <SelectTrigger id="period-type">
              <SelectValue placeholder="Select period type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {periodType !== "custom" && (
          <div className="flex-1">
            <Label className="mb-1 block">Current Period</Label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePeriodChange('prev')}
              >
                &lt; Previous
              </Button>
              <div className="flex-1 text-center border rounded-md py-2">
                {getPeriodLabel()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePeriodChange('next')}
                disabled={periodType === "monthly" 
                  ? currentPeriod >= new Date() 
                  : addMonths(currentPeriod, 1) > new Date()}
              >
                Next &gt;
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
