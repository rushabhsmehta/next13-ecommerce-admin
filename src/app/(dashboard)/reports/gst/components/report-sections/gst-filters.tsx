"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useGSTReportContext } from '../gst-report';

interface GSTFiltersProps {
  locations: string[];
  taxRates: {
    value: string;
    label: string;
    percentage: number;
  }[];
}

export function GSTFilters({ locations, taxRates }: GSTFiltersProps) {
  const { 
    date, 
    setDate, 
    filterLocation, 
    setFilterLocation, 
    selectedTaxRate, 
    setSelectedTaxRate 
  } = useGSTReportContext();

  // Handle from date change
  const handleFromDateChange = (selectedDate: Date | undefined) => {
    setDate({
      from: selectedDate,
      to: date?.to
    });
  };

  // Handle to date change
  const handleToDateChange = (selectedDate: Date | undefined) => {
    setDate({
      from: date?.from,
      to: selectedDate
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>GST Report Filters</CardTitle>
        <CardDescription>Filter GST data by date range, location, and tax rate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="tax-rate">Tax Rate</Label>
            <Select value={selectedTaxRate} onValueChange={setSelectedTaxRate}>
              <SelectTrigger id="tax-rate">
                <SelectValue placeholder="Select Tax Rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tax Rates</SelectItem>
                {taxRates.map(rate => (
                  <SelectItem key={rate.value} value={rate.value}>
                    {rate.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date Picker */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="from-date">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="from-date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    format(date.from, "MMM dd, yyyy")
                  ) : (
                    <span>Select start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date?.from}
                  onSelect={handleFromDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To Date Picker */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="to-date">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="to-date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date?.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.to ? (
                    format(date.to, "MMM dd, yyyy")
                  ) : (
                    <span>Select end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date?.to}
                  onSelect={handleToDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
