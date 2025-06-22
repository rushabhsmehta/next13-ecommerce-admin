import { useMemo } from 'react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';
import { DateRange } from "react-day-picker";

interface UseGSTDataProps {
  sales: Array<any>;
  purchases: Array<any>;
  taxSlabs: Array<any>;
  date?: DateRange;
  filterLocation: string;
  selectedTaxRate: string;
}

export const useGSTData = ({
  sales,
  purchases,
  taxSlabs,
  date,
  filterLocation,
  selectedTaxRate
}: UseGSTDataProps) => {
  // Extract unique locations for filter
  const locations = useMemo(() => {
    const locSet = new Set([
      ...sales.map(item => item.location?.label || 'Unknown'),
      ...purchases.map(item => item.location?.label || 'Unknown')
    ]);
    return Array.from(locSet).filter(loc => loc !== 'Unknown');
  }, [sales, purchases]);

  // Tax rates available in the data
  const taxRates = useMemo(() => {
    return taxSlabs.map(slab => ({
      value: slab.id,
      label: `${slab.name} (${slab.percentage}%)`,
      percentage: slab.percentage
    }));
  }, [taxSlabs]);

  // Filter data based on selected date range and location
  const filteredSales = useMemo(() => {
    return sales.filter(item => {
      const itemDate = new Date(item.saleDate || item.createdAt);
      const locationMatch = filterLocation === "all" || item.location?.label === filterLocation;
      const dateMatch = (!date?.from || isAfter(itemDate, date.from)) &&
        (!date?.to || isBefore(itemDate, date.to));
      
      // Filter by tax rate if not "all"
      const taxMatch = selectedTaxRate === "all" || item.items?.some((saleItem: any) => 
        saleItem.taxSlabId === selectedTaxRate
      );
      
      return locationMatch && dateMatch && taxMatch;
    });
  }, [sales, date, filterLocation, selectedTaxRate]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(item => {
      const itemDate = new Date(item.purchaseDate || item.createdAt);
      const locationMatch = filterLocation === "all" || item.location?.label === filterLocation;
      const dateMatch = (!date?.from || isAfter(itemDate, date.from)) &&
        (!date?.to || isBefore(itemDate, date.to));
      
      // Filter by tax rate if not "all"
      const taxMatch = selectedTaxRate === "all" || item.items?.some((purchaseItem: any) => 
        purchaseItem.taxSlabId === selectedTaxRate
      );
      
      return locationMatch && dateMatch && taxMatch;
    });
  }, [purchases, date, filterLocation, selectedTaxRate]);

  // Calculate GST metrics
  const gstMetrics = useMemo(() => {
    // Tax slab summaries
    const taxSlabSummary: Record<string, { 
      rate: number, 
      outputTax: number, 
      inputTax: number,
      netTax: number,
      salesAmount: number,
      purchasesAmount: number
    }> = {};
    
    // Initialize with all tax slabs
    taxSlabs.forEach(slab => {
      taxSlabSummary[slab.id] = {
        rate: slab.percentage,
        outputTax: 0,
        inputTax: 0,
        netTax: 0,
        salesAmount: 0,
        purchasesAmount: 0
      };
    });

    // Process sales (output GST)
    let totalOutputGst = 0;
    let totalSalesAmount = 0;
    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        if (item.taxSlabId && taxSlabSummary[item.taxSlabId]) {
          const taxAmount = item.taxAmount || 0;
          const totalAmount = item.totalAmount || 0;
          const baseAmount = totalAmount - taxAmount;
          
          taxSlabSummary[item.taxSlabId].outputTax += taxAmount;
          taxSlabSummary[item.taxSlabId].salesAmount += baseAmount;
          totalOutputGst += taxAmount;
          totalSalesAmount += baseAmount;
        }
      });
      
      // Include direct GST on sale if available
      if (sale.gstAmount) {
        // If there's a direct GST amount but no specific tax slab, use a catch-all "Others" category
        const slabId = 'others';
        if (!taxSlabSummary[slabId]) {
          taxSlabSummary[slabId] = {
            rate: sale.gstPercentage || 0,
            outputTax: 0,
            inputTax: 0,
            netTax: 0,
            salesAmount: 0,
            purchasesAmount: 0
          };
        }
        
        taxSlabSummary[slabId].outputTax += sale.gstAmount;
        // Estimate base amount by removing GST from total
        const baseAmount = sale.salePrice - sale.gstAmount;
        taxSlabSummary[slabId].salesAmount += baseAmount;
        totalOutputGst += sale.gstAmount;
        totalSalesAmount += baseAmount;
      }
    });

    // Process purchases (input GST)
    let totalInputGst = 0;
    let totalPurchasesAmount = 0;
    filteredPurchases.forEach(purchase => {
      purchase.items?.forEach((item: any) => {
        if (item.taxSlabId && taxSlabSummary[item.taxSlabId]) {
          const taxAmount = item.taxAmount || 0;
          const totalAmount = item.totalAmount || 0;
          const baseAmount = totalAmount - taxAmount;
          
          taxSlabSummary[item.taxSlabId].inputTax += taxAmount;
          taxSlabSummary[item.taxSlabId].purchasesAmount += baseAmount;
          totalInputGst += taxAmount;
          totalPurchasesAmount += baseAmount;
        }
      });
      
      // Include direct GST on purchase if available
      if (purchase.gstAmount) {
        // If there's a direct GST amount but no specific tax slab, use a catch-all "Others" category
        const slabId = 'others';
        if (!taxSlabSummary[slabId]) {
          taxSlabSummary[slabId] = {
            rate: purchase.gstPercentage || 0,
            outputTax: 0,
            inputTax: 0,
            netTax: 0,
            salesAmount: 0,
            purchasesAmount: 0
          };
        }
        
        taxSlabSummary[slabId].inputTax += purchase.gstAmount;
        // Estimate base amount by removing GST from total
        const baseAmount = purchase.price - purchase.gstAmount;
        taxSlabSummary[slabId].purchasesAmount += baseAmount;
        totalInputGst += purchase.gstAmount;
        totalPurchasesAmount += baseAmount;
      }
    });

    // Calculate net tax for each slab
    Object.keys(taxSlabSummary).forEach(slabId => {
      taxSlabSummary[slabId].netTax = taxSlabSummary[slabId].outputTax - taxSlabSummary[slabId].inputTax;
    });

    // Monthly GST data
    const monthlyGstData: Record<string, {
      month: string,
      outputTax: number,
      inputTax: number,
      netTax: number
    }> = {};    // Process monthly sales GST
    filteredSales.forEach(sale => {
      const monthYear = formatLocalDate(sale.saleDate || sale.createdAt, "MMM yyyy");
      if (!monthlyGstData[monthYear]) {
        monthlyGstData[monthYear] = {
          month: monthYear,
          outputTax: 0,
          inputTax: 0,
          netTax: 0
        };
      }

      // Add GST from items
      sale.items?.forEach((item: any) => {
        const taxAmount = item.taxAmount || 0;
        monthlyGstData[monthYear].outputTax += taxAmount;
      });
      
      // Add direct GST if available
      if (sale.gstAmount) {
        monthlyGstData[monthYear].outputTax += sale.gstAmount;
      }
    });    // Process monthly purchase GST
    filteredPurchases.forEach(purchase => {
      const monthYear = formatLocalDate(purchase.purchaseDate || purchase.createdAt, "MMM yyyy");
      if (!monthlyGstData[monthYear]) {
        monthlyGstData[monthYear] = {
          month: monthYear,
          outputTax: 0,
          inputTax: 0,
          netTax: 0
        };
      }

      // Add GST from items
      purchase.items?.forEach((item: any) => {
        const taxAmount = item.taxAmount || 0;
        monthlyGstData[monthYear].inputTax += taxAmount;
      });
      
      // Add direct GST if available
      if (purchase.gstAmount) {
        monthlyGstData[monthYear].inputTax += purchase.gstAmount;
      }
    });

    // Calculate monthly net tax
    Object.keys(monthlyGstData).forEach(month => {
      monthlyGstData[month].netTax = monthlyGstData[month].outputTax - monthlyGstData[month].inputTax;
    });

    // Convert to sorted array
    const monthlyGstArray = Object.values(monthlyGstData).sort((a, b) => {
      // Parse the month string to Date objects for comparison
      const dateA = new Date(`01 ${a.month}`);
      const dateB = new Date(`01 ${b.month}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate net GST liability
    const netGstLiability = totalOutputGst - totalInputGst;

    // Convert tax slab summary to array for charts and tables
    const taxSlabSummaryArray = Object.entries(taxSlabSummary)
      .map(([id, data]) => ({
        id,
        ...data,
        name: id === 'others' ? 'Others' : (taxSlabs.find(slab => slab.id === id)?.name || `${data.rate}%`)
      }))
      .filter(slab => slab.outputTax > 0 || slab.inputTax > 0)
      .sort((a, b) => a.rate - b.rate);

    return {
      totalOutputGst,
      totalInputGst,
      netGstLiability,
      totalSalesAmount,
      totalPurchasesAmount,
      taxSlabSummary: taxSlabSummaryArray,
      monthlyGst: monthlyGstArray,
      transactionCount: {
        sales: filteredSales.length,
        purchases: filteredPurchases.length
      }
    };
  }, [filteredSales, filteredPurchases, taxSlabs]);

  return {
    locations,
    taxRates,
    filteredSales,
    filteredPurchases,
    gstMetrics
  };
};
