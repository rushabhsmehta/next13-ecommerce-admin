"use client";

import { useState, createContext, useContext } from 'react';
import { subMonths } from 'date-fns';
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GSTFilters } from './report-sections/gst-filters';
import { GSTPeriodFilters } from './report-sections/gst-period-filters';
import { GSTSummaryCards } from './report-sections/gst-summary-cards';
import { GSTOverviewTab } from './report-sections/gst-overview-tab';
import { GSTMonthlyTab } from './report-sections/gst-monthly-tab';
import { GSTSalesTab } from './report-sections/gst-sales-tab';
import { GSTPurchasesTab } from './report-sections/gst-purchases-tab';
import { useGSTData } from './hooks/use-gst-data';

// Define the context type
interface GSTReportContextType {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  selectedTaxRate: string;
  setSelectedTaxRate: (rate: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Create context
export const GSTReportContext = createContext<GSTReportContextType | undefined>(undefined);

// Context provider hook
export const useGSTReportContext = () => {
  const context = useContext(GSTReportContext);
  if (!context) {
    throw new Error('useGSTReportContext must be used within a GSTReportProvider');
  }
  return context;
};

interface GstReportProps {
  sales: Array<any>;
  purchases: Array<any>;
  taxSlabs: Array<any>;
}

export default function GstReport({ sales, purchases, taxSlabs }: GstReportProps) {
  // State for filters
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [selectedTaxRate, setSelectedTaxRate] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Use the custom hook to calculate GST data
  const { 
    locations, 
    filteredSales, 
    filteredPurchases, 
    gstMetrics, 
    taxRates 
  } = useGSTData({ 
    sales, 
    purchases, 
    taxSlabs, 
    date, 
    filterLocation, 
    selectedTaxRate 
  });

  // Create the context value
  const contextValue = {
    date,
    setDate,
    filterLocation,
    setFilterLocation,
    selectedTaxRate,
    setSelectedTaxRate,
    activeTab,
    setActiveTab
  };

  return (
    <GSTReportContext.Provider value={contextValue}>
      <div className="space-y-6">
        {/* Filters */}
        <GSTFilters 
          locations={locations} 
          taxRates={taxRates} 
        />
        
        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
            <TabsTrigger value="sales">Sales GST</TabsTrigger>
            <TabsTrigger value="purchases">Purchase GST</TabsTrigger>
          </TabsList>

          {/* Summary Cards - Show on every tab */}
          <GSTSummaryCards metrics={gstMetrics} />

          {/* Overview Tab */}
          <TabsContent value="overview">
            <GSTOverviewTab gstMetrics={gstMetrics} />
          </TabsContent>

          {/* Monthly Analysis Tab */}
          <TabsContent value="monthly">
            <GSTMonthlyTab gstMetrics={gstMetrics} />
          </TabsContent>

          {/* Sales GST Tab */}
          <TabsContent value="sales">
            <GSTSalesTab 
              gstMetrics={gstMetrics} 
              filteredSales={filteredSales}
              taxSlabs={taxSlabs}
            />
          </TabsContent>

          {/* Purchases GST Tab */}
          <TabsContent value="purchases">
            <GSTPurchasesTab 
              gstMetrics={gstMetrics} 
              filteredPurchases={filteredPurchases}
              taxSlabs={taxSlabs}
            />
          </TabsContent>
        </Tabs>
      </div>
    </GSTReportContext.Provider>
  );
}
