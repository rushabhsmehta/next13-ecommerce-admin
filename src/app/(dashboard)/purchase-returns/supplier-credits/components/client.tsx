"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Building2, Clock, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { formatPrice } from "@/lib/utils";

interface SupplierCreditRow {
  id: string;
  supplierName: string;
  originalTour: string;
  returnDate: Date;
  supplierCreditExpiry: Date | null;
  amount: number;
  usedAmount: number;
  availableCredit: number;
  status: string;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  returnReason: string;
  purchaseReturnId: string;
}

interface SupplierCreditsClientProps {
  data: SupplierCreditRow[];
}

function ExpiryBadge({ daysUntilExpiry, isExpired }: { daysUntilExpiry: number | null; isExpired: boolean }) {
  if (isExpired) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  if (daysUntilExpiry === null) return <Badge variant="outline" className="text-xs">No expiry</Badge>;
  if (daysUntilExpiry <= 30) return <Badge className="bg-amber-100 text-amber-800 text-xs">{daysUntilExpiry}d left</Badge>;
  return <Badge className="bg-green-100 text-green-800 text-xs">{daysUntilExpiry}d left</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    issued: "bg-blue-100 text-blue-800",
    partially_redeemed: "bg-amber-100 text-amber-800",
    redeemed: "bg-gray-100 text-gray-600",
    pending: "bg-yellow-100 text-yellow-800",
  };
  return (
    <Badge className={`text-xs capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export const SupplierCreditsClient: React.FC<SupplierCreditsClientProps> = ({ data }) => {
  const router = useRouter();

  const columns: ColumnDef<SupplierCreditRow>[] = [
    {
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="font-medium flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-blue-600" />
          {row.original.supplierName}
        </div>
      )
    },
    {
      accessorKey: "originalTour",
      header: "Original Tour",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.originalTour}</span>
    },
    {
      accessorKey: "returnDate",
      header: "Created On",
      cell: ({ row }) => format(new Date(row.original.returnDate), "dd MMM yyyy")
    },
    {
      accessorKey: "supplierCreditExpiry",
      header: "Valid Until",
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.supplierCreditExpiry && (
            <div className="text-sm">{format(new Date(row.original.supplierCreditExpiry), "dd MMM yyyy")}</div>
          )}
          <ExpiryBadge daysUntilExpiry={row.original.daysUntilExpiry} isExpired={row.original.isExpired} />
        </div>
      )
    },
    {
      accessorKey: "amount",
      header: "Credit Amount",
      cell: ({ row }) => <span className="font-semibold">{formatPrice(row.original.amount)}</span>
    },
    {
      accessorKey: "availableCredit",
      header: "Available",
      cell: ({ row }) => (
        <span className={row.original.availableCredit > 0.01 ? "font-bold text-blue-700" : "text-gray-400"}>
          {formatPrice(row.original.availableCredit)}
        </span>
      )
    },
    {
      accessorKey: "returnReason",
      header: "Reason",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.returnReason}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => router.push(`/purchase-returns/${row.original.purchaseReturnId}`)}
        >
          View
        </Button>
      )
    }
  ];

  const totalCredit = data.reduce((sum, sc) => sum + sc.amount, 0);
  const totalAvailable = data.reduce((sum, sc) => sum + sc.availableCredit, 0);
  const expiringSoon = data.filter(sc => !sc.isExpired && sc.daysUntilExpiry !== null && sc.daysUntilExpiry <= 30).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-blue-700">Total Supplier Credit</p>
            <p className="text-xl font-bold text-blue-800">{formatPrice(totalCredit)}</p>
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-indigo-600" />
          <div>
            <p className="text-sm text-indigo-700">Available to Use</p>
            <p className="text-xl font-bold text-indigo-800">{formatPrice(totalAvailable)}</p>
          </div>
        </div>
        {expiringSoon > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-700">Expiring in 30 Days</p>
              <p className="text-xl font-bold text-amber-800">{expiringSoon} credit{expiringSoon !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <DataTable columns={columns} data={data} searchKey="supplierName" />
    </div>
  );
};
