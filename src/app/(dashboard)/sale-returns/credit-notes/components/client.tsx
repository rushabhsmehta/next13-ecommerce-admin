"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BadgeCheck, Clock, AlertCircle, Pencil } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { formatPrice } from "@/lib/utils";
import { EditCreditNoteAmountDialog } from "@/components/forms/edit-credit-note-amount-dialog";

interface CreditNoteRow {
  id: string;
  creditNoteNumber: string;
  customerName: string;
  originalTour: string;
  returnDate: Date;
  expiryDate: Date | null;
  amount: number;
  usedAmount: number;
  availableCredit: number;
  status: string;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  returnReason: string;
  saleReturnId: string;
}

interface CreditNotesClientProps {
  data: CreditNoteRow[];
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

interface EditDialogState {
  saleReturnId: string;
  creditNoteNumber: string;
  currentAmount: number;
  usedAmount: number;
}

export const CreditNotesClient: React.FC<CreditNotesClientProps> = ({ data }) => {
  const router = useRouter();
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);

  const columns: ColumnDef<CreditNoteRow>[] = [
    {
      accessorKey: "creditNoteNumber",
      header: "CN Number",
      cell: ({ row }) => (
        <div className="font-mono font-semibold text-green-700">{row.original.creditNoteNumber}</div>
      )
    },
    {
      accessorKey: "customerName",
      header: "Customer",
    },
    {
      accessorKey: "originalTour",
      header: "Original Tour",
      cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.originalTour}</span>
    },
    {
      accessorKey: "returnDate",
      header: "Issued On",
      cell: ({ row }) => format(new Date(row.original.returnDate), "dd MMM yyyy")
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry",
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.original.expiryDate && (
            <div className="text-sm">{format(new Date(row.original.expiryDate), "dd MMM yyyy")}</div>
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
        <span className={row.original.availableCredit > 0.01 ? "font-bold text-green-700" : "text-gray-400"}>
          {formatPrice(row.original.availableCredit)}
        </span>
      )
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
        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => router.push(`/sale-returns/${row.original.saleReturnId}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => router.push(`/sale-returns/${row.original.saleReturnId}/voucher`)}
          >
            Voucher
          </Button>
          {/* Only allow editing if not fully redeemed */}
          {row.original.status !== 'redeemed' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() =>
                setEditDialog({
                  saleReturnId: row.original.saleReturnId,
                  creditNoteNumber: row.original.creditNoteNumber,
                  currentAmount: row.original.amount,
                  usedAmount: row.original.usedAmount,
                })
              }
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit Amount
            </Button>
          )}
        </div>
      )
    }
  ];

  const totalCredit = data.reduce((sum, cn) => sum + cn.amount, 0);
  const totalAvailable = data.reduce((sum, cn) => sum + cn.availableCredit, 0);
  const expiringSoon = data.filter(cn => !cn.isExpired && cn.daysUntilExpiry !== null && cn.daysUntilExpiry <= 30).length;

  return (
    <div className="space-y-4">
      {editDialog && (
        <EditCreditNoteAmountDialog
          open={!!editDialog}
          onClose={() => setEditDialog(null)}
          saleReturnId={editDialog.saleReturnId}
          creditNoteNumber={editDialog.creditNoteNumber}
          currentAmount={editDialog.currentAmount}
          usedAmount={editDialog.usedAmount}
        />
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <BadgeCheck className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-green-700">Total Credit Issued</p>
            <p className="text-xl font-bold text-green-800">{formatPrice(totalCredit)}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-blue-700">Available Credit</p>
            <p className="text-xl font-bold text-blue-800">{formatPrice(totalAvailable)}</p>
          </div>
        </div>
        {expiringSoon > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-700">Expiring in 30 Days</p>
              <p className="text-xl font-bold text-amber-800">{expiringSoon} note{expiringSoon !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <DataTable columns={columns} data={data} searchKey="customerName" />
    </div>
  );
};
