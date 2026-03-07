"use client";

import { useEffect, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, RefreshCw } from "lucide-react";

export interface OpenSale {
  saleId: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  saleDate: string;
  tourPackageQueryId: string;
  tourPackageQueryName: string | null;
  totalInvoiceAmount: number;
  totalAllocated: number;
  totalReturns: number;
  balanceDue: number;
  isGst: boolean;
  status: string | null;
}

interface SaleAllocationPanelProps {
  form: UseFormReturn<any>;
  customerId: string | null | undefined;
  tourPackageQueryId?: string | null;
  receiptAmount: number;
  receiptId?: string | null;
}

export function SaleAllocationPanel({
  form,
  customerId,
  tourPackageQueryId,
  receiptAmount,
  receiptId
}: SaleAllocationPanelProps) {
  const [openSales, setOpenSales] = useState<OpenSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const allocations: Array<{ saleDetailId: string; allocatedAmount: number; note?: string }> =
    useWatch({ control: form.control, name: "saleAllocations" }) || [];

  useEffect(() => {
    if (!customerId) {
      setOpenSales([]);
      form.setValue("saleAllocations", []);
      return;
    }

    setLoading(true);
    const urlParams = new URLSearchParams();
    if (tourPackageQueryId && !showAll) {
      urlParams.set("tourPackageQueryId", tourPackageQueryId);
    }
    if (receiptId) {
      urlParams.set("excludeReceiptId", receiptId);
    }

    fetch(`/api/customers/${customerId}/open-sales?${urlParams}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const sales: OpenSale[] = data.openSales || [];
        setOpenSales(sales);
        // Initialize allocations array preserving any existing values
        const currentAllocs = form.getValues("saleAllocations") || [];
        const newAllocs = sales.map((sale: OpenSale) => {
          const existing = currentAllocs.find((a: any) => a.saleDetailId === sale.saleId);
          return {
            saleDetailId: sale.saleId,
            allocatedAmount: existing?.allocatedAmount ?? 0,
            note: existing?.note || ""
          };
        });
        form.setValue("saleAllocations", newAllocs);
      })
      .catch(() => setOpenSales([]))
      .finally(() => setLoading(false));
  }, [customerId, tourPackageQueryId, showAll, receiptId]);

  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);
  const unallocated = receiptAmount - totalAllocated;

  const handleAutoAllocate = () => {
    let remaining = receiptAmount;
    const newAllocs = openSales.map((sale, idx) => {
      if (remaining <= 0) return { ...allocations[idx], allocatedAmount: 0 };
      const apply = Math.min(remaining, sale.balanceDue);
      remaining -= apply;
      return {
        saleDetailId: sale.saleId,
        allocatedAmount: Math.round(apply * 100) / 100,
        note: allocations[idx]?.note || ""
      };
    });
    form.setValue("saleAllocations", newAllocs);
  };

  const updateAllocation = (index: number, amount: number) => {
    const current = form.getValues("saleAllocations") || [];
    current[index] = { ...current[index], allocatedAmount: amount };
    form.setValue("saleAllocations", [...current]);
  };

  if (!customerId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading open sales...
      </div>
    );
  }

  if (openSales.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">No open invoices found</p>
          <p className="text-xs text-blue-600 mt-1">
            This receipt will be recorded as an advance/unallocated payment.
            {tourPackageQueryId && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="ml-1 underline hover:no-underline"
              >
                Show all customer invoices
              </button>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Apply this receipt to specific invoices:
        </p>
        <div className="flex gap-2">
          {tourPackageQueryId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs h-7"
            >
              {showAll ? "Show for this trip only" : "Show all invoices"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoAllocate}
            className="text-xs h-7"
          >
            Auto-allocate (oldest first)
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Tour / Package</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Invoice Total</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Received</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Apply Amount</th>
            </tr>
          </thead>
          <tbody>
            {openSales.map((sale, index) => {
              const currentAlloc = Number(allocations[index]?.allocatedAmount) || 0;
              return (
                <tr key={sale.saleId} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">
                      {sale.invoiceNumber || `Sale #${sale.saleId.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sale.saleDate).toLocaleDateString('en-IN')}
                    </div>
                    {sale.isGst && (
                      <Badge variant="outline" className="text-xs mt-1 text-green-700 border-green-300">GST</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate">
                    {sale.tourPackageQueryName || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatPrice(sale.totalInvoiceAmount)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {formatPrice(sale.totalAllocated)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-orange-600">
                    {formatPrice(sale.balanceDue)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={Math.min(sale.balanceDue, receiptAmount)}
                      step={0.01}
                      value={currentAlloc || ""}
                      onChange={e => updateAllocation(index, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-8 w-28 text-right ml-auto"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3 text-sm">
        <div className="text-gray-600">
          Receipt Amount: <span className="font-semibold text-gray-900">{formatPrice(receiptAmount)}</span>
        </div>
        <div className="flex gap-6">
          <div className="text-gray-600">
            Allocated: <span className="font-semibold text-green-700">{formatPrice(totalAllocated)}</span>
          </div>
          <div className={unallocated < -0.01 ? "text-red-600" : "text-gray-600"}>
            Unallocated: <span className={`font-semibold ${unallocated < -0.01 ? "text-red-600" : unallocated > 0 ? "text-orange-600" : "text-green-700"}`}>
              {formatPrice(Math.max(0, unallocated))}
            </span>
          </div>
        </div>
      </div>
      {unallocated < -0.01 && (
        <p className="text-xs text-red-600">Total allocated exceeds receipt amount. Please reduce allocations.</p>
      )}
    </div>
  );
}
