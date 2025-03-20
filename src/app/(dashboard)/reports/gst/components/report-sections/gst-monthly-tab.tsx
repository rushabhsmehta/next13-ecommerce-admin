"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface GSTMonthlyTabProps {
  gstMetrics: {
    totalOutputGst: number;
    totalInputGst: number;
    netGstLiability: number;
    monthlyGst: Array<{
      month: string;
      outputTax: number;
      inputTax: number;
      netTax: number;
    }>;
  };
}

export function GSTMonthlyTab({ gstMetrics }: GSTMonthlyTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Monthly GST Trends</CardTitle>
          <CardDescription>GST trends over the selected time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={gstMetrics.monthlyGst}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, undefined]} />
                <Legend />
                <Line type="monotone" dataKey="outputTax" stroke="#8884d8" name="Output GST" />
                <Line type="monotone" dataKey="inputTax" stroke="#82ca9d" name="Input GST" />
                <Line type="monotone" dataKey="netTax" stroke="#ffc658" name="Net GST" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly GST Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Monthly GST Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">Month</th>
                  <th className="p-2 text-right">Output GST (₹)</th>
                  <th className="p-2 text-right">Input GST (₹)</th>
                  <th className="p-2 text-right">Net GST (₹)</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {gstMetrics.monthlyGst.map((month, index) => (
                  <tr key={index} className={index % 2 ? "bg-muted/30" : ""}>
                    <td className="p-2">{month.month}</td>
                    <td className="p-2 text-right">{month.outputTax.toFixed(2)}</td>
                    <td className="p-2 text-right">{month.inputTax.toFixed(2)}</td>
                    <td className={cn(
                      "p-2 text-right font-medium",
                      month.netTax >= 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {month.netTax.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs",
                        month.netTax >= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      )}>
                        {month.netTax >= 0 ? "Payable" : "Refundable"}
                      </span>
                    </td>
                  </tr>
                ))}
                {gstMetrics.monthlyGst.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted">
                  <td className="p-2 font-bold">Total</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalOutputGst.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">{gstMetrics.totalInputGst.toFixed(2)}</td>
                  <td className={cn(
                    "p-2 text-right font-bold",
                    gstMetrics.netGstLiability >= 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {gstMetrics.netGstLiability.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs",
                      gstMetrics.netGstLiability >= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    )}>
                      {gstMetrics.netGstLiability >= 0 ? "Payable" : "Refundable"}
                    </span>
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
