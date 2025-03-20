"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface GSTSectionProps {
  data: {
    purchases: Array<any>;
    sales: Array<any>;
  };
}

export function GSTSection({ data }: GSTSectionProps) {
  const router = useRouter();

  // Calculate GST metrics for the profit report
  const gstMetrics = useMemo(() => {
    // Calculate output GST (from sales)
    let outputGST = 0;
    let salesBase = 0;

    data.sales.forEach(sale => {
      // Add GST from item level
      sale.items?.forEach((item: any) => {
        if (item.taxAmount) {
          outputGST += item.taxAmount;
          salesBase += (item.totalAmount - item.taxAmount);
        }
      });

      // Also add any direct GST on the sale
      if (sale.gstAmount) {
        outputGST += sale.gstAmount;
        salesBase += (sale.salePrice - sale.gstAmount);
      }
    });

    // Calculate input GST (from purchases)
    let inputGST = 0;
    let purchasesBase = 0;

    data.purchases.forEach(purchase => {
      // Add GST from item level
      purchase.items?.forEach((item: any) => {
        if (item.taxAmount) {
          inputGST += item.taxAmount;
          purchasesBase += (item.totalAmount - item.taxAmount);
        }
      });

      // Also add any direct GST on the purchase
      if (purchase.gstAmount) {
        inputGST += purchase.gstAmount;
        purchasesBase += (purchase.price - purchase.gstAmount);
      }
    });

    // Calculate net GST position
    const netGST = outputGST - inputGST;

    // Group by tax rate (simplified version)
    const taxRates: Record<string, { rate: string, input: number, output: number }> = {};
    
    // Process sales by tax rate
    data.sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        if (item.taxSlab && item.taxAmount) {
          const rate = `${item.taxSlab.name} (${item.taxSlab.percentage}%)`;
          if (!taxRates[rate]) {
            taxRates[rate] = { rate, input: 0, output: 0 };
          }
          taxRates[rate].output += item.taxAmount;
        }
      });
    });

    // Process purchases by tax rate
    data.purchases.forEach(purchase => {
      purchase.items?.forEach((item: any) => {
        if (item.taxSlab && item.taxAmount) {
          const rate = `${item.taxSlab.name} (${item.taxSlab.percentage}%)`;
          if (!taxRates[rate]) {
            taxRates[rate] = { rate, input: 0, output: 0 };
          }
          taxRates[rate].input += item.taxAmount;
        }
      });
    });

    // Convert to array for chart
    const taxRatesArray = Object.values(taxRates);

    return {
      outputGST,
      inputGST,
      netGST,
      salesBase,
      purchasesBase,
      taxRates: taxRatesArray,
      transactionCount: {
        sales: data.sales.length,
        purchases: data.purchases.length
      }
    };
  }, [data.sales, data.purchases]);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>GST Summary</CardTitle>
          <CardDescription>GST collected vs. GST paid for the selected period</CardDescription>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="ml-auto" 
          onClick={() => router.push('/reports/gst')}
        >
          View Detailed GST Report
          <ArrowUpRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Output GST (Collected)</div>
            <div className="text-2xl font-bold">₹{gstMetrics.outputGST.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              On sales of ₹{gstMetrics.salesBase.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Input GST (Paid)</div>
            <div className="text-2xl font-bold">₹{gstMetrics.inputGST.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              On purchases of ₹{gstMetrics.purchasesBase.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Net GST Position</div>
            <div className={cn(
              "text-2xl font-bold",
              gstMetrics.netGST >= 0 ? "text-red-500" : "text-green-500"
            )}>
              ₹{gstMetrics.netGST.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {gstMetrics.netGST >= 0 ? "Payable to Government" : "Refundable from Government"}
            </div>
          </div>
        </div>
        
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { 
                  name: 'GST Collected', 
                  value: gstMetrics.outputGST,
                  fillColor: '#0088FE'
                },
                { 
                  name: 'GST Paid', 
                  value: gstMetrics.inputGST,
                  fillColor: '#00C49F'
                },
                { 
                  name: 'Net GST', 
                  value: Math.abs(gstMetrics.netGST),
                  fillColor: gstMetrics.netGST >= 0 ? '#FF8042' : '#82ca9d'
                }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value}`, undefined]} />
              <Legend />
              <Bar dataKey="value" name="Amount (₹)" fill="#8884d8">
                {[0, 1, 2].map((index) => (
                  <Cell key={`cell-${index}`} fill={gstMetrics.netGST >= 0 && index === 2 ? '#FF8042' : ['#0088FE', '#00C49F', '#82ca9d'][index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {gstMetrics.taxRates.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">GST by Tax Rate</h4>
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left">Tax Rate</th>
                    <th className="p-2 text-right">Input GST (₹)</th>
                    <th className="p-2 text-right">Output GST (₹)</th>
                    <th className="p-2 text-right">Net GST (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {gstMetrics.taxRates.map((rate, index) => {
                    const netAmount = rate.output - rate.input;
                    return (
                      <tr key={rate.rate} className={index % 2 ? "bg-muted/30" : ""}>
                        <td className="p-2">{rate.rate}</td>
                        <td className="p-2 text-right">{rate.input.toFixed(2)}</td>
                        <td className="p-2 text-right">{rate.output.toFixed(2)}</td>
                        <td className={cn(
                          "p-2 text-right font-medium",
                          netAmount >= 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {netAmount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
