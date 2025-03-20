"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

// Define the sale column structure
export type SaleColumn = {
  id: string;
  customerName: string;
  packageName: string;
  date: string;
  amount: number;
  hasItems: boolean;
};

export const columns: ColumnDef<SaleColumn>[] = [
  {
    accessorKey: "customerName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "packageName",
    header: "Tour Package",
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="justify-end"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      return <div className="text-right">{formatPrice(amount)}</div>;
    },
  },
  {
    accessorKey: "hasItems",
    header: "Type",
    cell: ({ row }) => {
      const hasItems = row.original.hasItems;
      return (
        <Badge variant={hasItems ? "default" : "secondary"}>
          {hasItems ? "Itemized" : "Simple"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];

