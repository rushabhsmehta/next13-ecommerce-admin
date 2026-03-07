"use client";

import { useEffect, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, RefreshCw } from "lucide-react";

export interface OpenPurchase {
  purchaseId: string;
  billNumber: string | null;
  billDate: string | null;
  purchaseDate: string;
  tourPackageQueryId: string;
  tourPackageQueryName: string | null;
  totalBillAmount: number;
  totalAllocated: number;
  totalReturns: number;
  balanceDue: number;
  isGst: boolean;
  status: string | null;
}

interface PurchaseAllocationPanelProps {
  form: UseFormReturn<any>;
  supplierId: string | null | undefined;
  tourPackageQueryId?: string | null;
  paymentAmount: number;
}

export function PurchaseAllocationPanel({
  form,
  supplierId,
  tourPackageQueryId,
  paymentAmount
}: PurchaseAllocationPanelProps) {
  const [openPurchases, setOpenPurchases] = useState<OpenPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const allocations: Array<{ purchaseDetailId: string; allocatedAmount: number; note?: string }> =
    useWatch({ control: form.control, name: "purchaseAllocations" }) || [];

  useEffect(() => {
    if (!supplierId) {
      setOpenPurchases([]);
      form.setValue("purchaseAllocations", []);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (tourPackageQueryId && !showAll) {
      params.set("tourPackageQueryId", tourPackageQueryId);
    }

    fetch(`/api/suppliers/${supplierId}/open-purchases?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const purchases: OpenPurchase[] = data.openPurchases || [];
        setOpenPurchases(purchases);
        const currentAllocs = form.getValues("purchaseAllocations") || [];
        const newAllocs = purchases.map((p: OpenPurchase) => {
          const existing = currentAllocs.find((a: any) => a.purchaseDetailId === p.purchaseId);
          return {
            purchaseDetailId: p.purchaseId,
            allocatedAmount: existing?.allocatedAmount || 0,
            note: existing?.note || ""
          };
        });
        form.setValue("purchaseAllocations", newAllocs);
      })
      .catch(() => setOpenPurchases([]))
      .finally(() => setLoading(false));
  }, [supplierId, tourPackageQueryId, showAll]);

  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);
  const unallocated = paymentAmount - totalAllocated;

  const handleAutoAllocate = () => {
    let remaining = paymentAmount;
    const newAllocs = openPurchases.map((purchase, idx) => {
      if (remaining <= 0) return { ...allocations[idx], allocatedAmount: 0 };
      const apply = Math.min(remaining, purchase.balanceDue);
      remaining -= apply;
      return {
        purchaseDetailId: purchase.purchaseId,
        allocatedAmount: Math.round(apply * 100) / 100,
        note: allocations[idx]?.note || ""
      };
    });
    form.setValue("purchaseAllocations", newAllocs);
  };

  const updateAllocation = (index: number, amount: number) => {
    const current = form.getValues("purchaseAllocations") || [];
    current[index] = { ...current[index], allocatedAmount: amount };
    form.setValue("purchaseAllocations", [...current]);
  };

  if (!supplierId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading open bills...
      </div>
    );
  }

  if (openPurchases.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-blue-800 font-medium">No open bills found</p>
          <p className="text-xs text-blue-600 mt-1">
            This payment will be recorded as an advance/unallocated payment.
            {tourPackageQueryId && !showAll && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="ml-1 underline hover:no-underline"
              >
                Show all supplier bills
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
        <p className="text-sm text-gray-600">Apply this payment to specific bills:</p>
        <div className="flex gap-2">
          {tourPackageQueryId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs h-7"
            >
              {showAll ? "Show for this trip only" : "Show all bills"}
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
              <th className="text-left px-3 py-2 font-medium text-gray-600">Bill</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Tour / Package</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Bill Total</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Paid</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Apply Amount</th>
            </tr>
          </thead>
          <tbody>
            {openPurchases.map((purchase, index) => {
              const currentAlloc = Number(allocations[index]?.allocatedAmount) || 0;
              return (
                <tr key={purchase.purchaseId} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">
                      {purchase.billNumber || `Bill #${purchase.purchaseId.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
                    </div>
                    {purchase.isGst && (
                      <Badge variant="outline" className="text-xs mt-1 text-green-700 border-green-300">GST</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate">
                    {purchase.tourPackageQueryName || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatPrice(purchase.totalBillAmount)}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {formatPrice(purchase.totalAllocated)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-orange-600">
                    {formatPrice(purchase.balanceDue)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={Math.min(purchase.balanceDue, paymentAmount)}
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

      <div className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3 text-sm">
        <div className="text-gray-600">
          Payment Amount: <span className="font-semibold text-gray-900">{formatPrice(paymentAmount)}</span>
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
        <p className="text-xs text-red-600">Total allocated exceeds payment amount. Please reduce allocations.</p>
      )}
    </div>
  );
}
