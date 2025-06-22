"use client";

import { format } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

interface GSTPurchasesTabProps {
  gstMetrics: {
    taxSlabSummary: Array<{
      id: string;
      name: string;
      inputTax: number;
    }>;
  };
  filteredPurchases: Array<any>;
  taxSlabs: Array<any>;
}

export function GSTPurchasesTab({ gstMetrics, filteredPurchases, taxSlabs }: GSTPurchasesTabProps) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Input GST by Tax Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Input GST Distribution</CardTitle>
          <CardDescription>Breakdown of input GST by tax rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gstMetrics.taxSlabSummary
                    .filter(slab => slab.inputTax > 0)
                    .map(slab => ({ 
                      name: slab.name, 
                      value: slab.inputTax 
                    }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {gstMetrics.taxSlabSummary
                    .filter(slab => slab.inputTax > 0)
                    .map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Transactions with GST */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases with GST</CardTitle>
          <CardDescription>Last 10 purchase transactions with GST details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Bill Number</th>
                  <th className="p-2 text-right">Base Amount (₹)</th>
                  <th className="p-2 text-right">GST (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No purchase transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases
                    .sort((a, b) => new Date(b.purchaseDate || b.createdAt).getTime() - 
                                    new Date(a.purchaseDate || a.createdAt).getTime())
                    .slice(0, 10)
                    .map((purchase, index) => {
                      // Calculate purchase GST total
                      const baseAmount = purchase.items?.reduce((sum: number, item: any) =>
                        sum + ((item.totalAmount || 0) - (item.taxAmount || 0)), 0) || 0;
                      const gstAmount = purchase.items?.reduce((sum: number, item: any) =>
                        sum + (item.taxAmount || 0), 0) || purchase.gstAmount || 0;

                      return (
                        <tr key={purchase.id} className={index % 2 ? "bg-muted/30" : ""}>
                          <td className="p-2">{formatLocalDate(purchase.purchaseDate || purchase.createdAt, "dd MMM yyyy")}</td>
                          <td className="p-2">{purchase.billNumber || "-"}</td>
                          <td className="p-2 text-right">{baseAmount.toFixed(2)}</td>
                          <td className="p-2 text-right">{gstAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
