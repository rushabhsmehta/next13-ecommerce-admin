"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Users, Building2, BarChart3 } from "lucide-react";
import axios from "axios";

interface FinancialSummary {
  queryId: string;
  sales: {
    count: number;
    invoiced: number;
    received: number;
    returns: number;
    balance: number;
  };
  purchases: {
    count: number;
    billed: number;
    paid: number;
    returns: number;
    balance: number;
  };
  grossProfit: number;
  grossMargin: number;
  receiptsCount: number;
  paymentsCount: number;
}

interface FinancialSummaryPanelProps {
  queryId: string;
}

export function FinancialSummaryPanel({ queryId }: FinancialSummaryPanelProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queryId) return;
    setLoading(true);
    setError(null);
    axios
      .get(`/api/tourPackageQuery/${queryId}/financial-summary`)
      .then(res => setSummary(res.data))
      .catch(() => setError("Failed to load financial summary"))
      .finally(() => setLoading(false));
  }, [queryId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">{error || "No data"}</div>
        </CardContent>
      </Card>
    );
  }

  const isProfitable = summary.grossProfit >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sales Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Customer Sales ({summary.sales.count})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded p-2">
              <p className="text-xs text-blue-600">Invoiced</p>
              <p className="text-sm font-bold text-blue-900">{formatPrice(summary.sales.invoiced)}</p>
            </div>
            <div className="bg-green-50 rounded p-2">
              <p className="text-xs text-green-600">Received</p>
              <p className="text-sm font-bold text-green-900">{formatPrice(summary.sales.received)}</p>
            </div>
            {summary.sales.returns > 0 && (
              <div className="bg-red-50 rounded p-2">
                <p className="text-xs text-red-600">Returns</p>
                <p className="text-sm font-bold text-red-900">{formatPrice(summary.sales.returns)}</p>
              </div>
            )}
            <div className={`rounded p-2 ${summary.sales.balance > 0.01 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <p className={`text-xs ${summary.sales.balance > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                {summary.sales.balance > 0.01 ? 'Balance Due' : 'Fully Received'}
              </p>
              <p className={`text-sm font-bold ${summary.sales.balance > 0.01 ? 'text-orange-900' : 'text-green-900'}`}>
                {formatPrice(summary.sales.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Purchases Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">Supplier Purchases ({summary.purchases.count})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-purple-50 rounded p-2">
              <p className="text-xs text-purple-600">Billed</p>
              <p className="text-sm font-bold text-purple-900">{formatPrice(summary.purchases.billed)}</p>
            </div>
            <div className="bg-green-50 rounded p-2">
              <p className="text-xs text-green-600">Paid</p>
              <p className="text-sm font-bold text-green-900">{formatPrice(summary.purchases.paid)}</p>
            </div>
            {summary.purchases.returns > 0 && (
              <div className="bg-red-50 rounded p-2">
                <p className="text-xs text-red-600">Returns</p>
                <p className="text-sm font-bold text-red-900">{formatPrice(summary.purchases.returns)}</p>
              </div>
            )}
            <div className={`rounded p-2 ${summary.purchases.balance > 0.01 ? 'bg-orange-50' : 'bg-green-50'}`}>
              <p className={`text-xs ${summary.purchases.balance > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                {summary.purchases.balance > 0.01 ? 'Balance Due' : 'Fully Paid'}
              </p>
              <p className={`text-sm font-bold ${summary.purchases.balance > 0.01 ? 'text-orange-900' : 'text-green-900'}`}>
                {formatPrice(summary.purchases.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Profit Summary */}
        <div className={`rounded-lg p-3 border ${isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProfitable ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                Gross {isProfitable ? 'Profit' : 'Loss'}
              </span>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${isProfitable ? 'text-green-900' : 'text-red-900'}`}>
                {formatPrice(Math.abs(summary.grossProfit))}
              </p>
              <p className={`text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {summary.grossMargin}% margin
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
