"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type SaleReturnColumn = {
  id: string;
  date: string;
  customer: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  reference: string;
  reason: string;
  originalSale: {
    id: string;
    description?: string;
  };
};

export const columns: ColumnDef<SaleReturnColumn>[] = [
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "customer",
    header: "Customer",
  },
  {
    accessorKey: "reference",
    header: "Reference",
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">{row.original.reason}</div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Amount",
    cell: ({ row }) => formatPrice(row.original.totalAmount),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      let variant: "outline" | "default" | "secondary" | "destructive" = "outline";
      
      switch (row.original.status) {
        case "completed":
          variant = "default";
          break;
        case "pending":
          variant = "secondary";
          break;
        case "cancelled":
          variant = "destructive";
          break;
      }
      
      return <Badge variant={variant}>{row.original.status}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
