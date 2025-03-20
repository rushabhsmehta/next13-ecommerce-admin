"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface GSTOverviewTabProps {
  gstMetrics: {
    totalOutputGst: number;
    totalInputGst: number;
    netGstLiability: number;
    totalSalesAmount: number;
    totalPurchasesAmount: number;
    taxSlabSummary: Array<{
      id: string;
      name: string;
      rate: number;
      outputTax: number;
      inputTax: number;
      netTax: number;
      salesAmount: number;
      purchasesAmount: number;
    }>;
  };
}

export function GSTOverviewTab({ gstMetrics }: GSTOverviewTabProps) {
  return (
    <>
      {/* GST Summary Chart */}
      <Card>
        <CardHeader>
          <CardTitle>GST Overview by Tax Rate</CardTitle>
          <CardDescription>Breakdown of input and output GST by tax rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gstMetrics.taxSlabSummary}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
                <Legend />
                <Bar dataKey="outputTax" name="Output GST (Sales)" fill="#8884d8" />
                <Bar dataKey="inputTax" name="Input GST (Purchases)" fill="#82ca9d" />
                <Bar dataKey="netTax" name="Net GST" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tax Slab Summary Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>GST Summary by Tax Rate</CardTitle>
          <CardDescription>Detailed breakdown of GST by different tax rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">Tax Rate</th>
                  <th className="p-2 text-right">Sales Value (₹)</th>
                  <th className="p-2 text-right">Output GST (₹)</th>
                  <th className="p-2 text-right">Purchase Value (₹)</th>
                  <th className="p-2 text-right">Input GST (₹)</th>
                  <th className="p-2 text-right">Net GST (₹)</th>
                </tr>
              </thead>
              <tbody>
                {gstMetrics.taxSlabSummary.map((slab, index) => (
                  <tr key={slab.id} className={index % 2 ? "bg-muted/30" : ""}>
                    <td className="p-2">{slab.name}</td>
                    <td className="p-2 text-right">{slab.salesAmount.toFixed(2)}</td>
                    <td className="p-2 text-right">{slab.outputTax.toFixed(2)}</td>
                    <td className="p-2 text-right">{slab.purchasesAmount.toFixed(2)}</td>
                    <td className="p-2 text-right">{slab.inputTax.toFixed(2)}</td>
                    <td className={cn(
                      "p-2 text-right font-medium",
                      slab.netTax >= 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {slab.netTax.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted">
                  <td className="p-2 font-bold">Total</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalSalesAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalOutputGst.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalPurchasesAmount.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalInputGst.toFixed(2)}</td>
                  <td className={cn(
                    "p-2 text-right font-bold",
                    gstMetrics.netGstLiability >= 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {gstMetrics.netGstLiability.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
