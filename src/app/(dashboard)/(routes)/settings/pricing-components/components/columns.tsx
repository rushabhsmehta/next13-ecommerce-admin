"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CellAction } from "./cell-action";

export type PricingComponentColumn = {
  id: string;
  pricingAttributeId: string;
  attributeName: string;
  attributeDescription: string;
  price: string;
  purchasePrice: string;
  createdAt: string;
};

export const columns: ColumnDef<PricingComponentColumn>[] = [
  {
    accessorKey: "attributeName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Pricing Attribute
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sales Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(amount);

      return <div className="font-medium">{formatted}</div>
    }
  },
  {
    accessorKey: "purchasePrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Purchase Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("purchasePrice"));
      if (isNaN(amount) || amount === 0) {
        return <div className="text-gray-400">-</div>;
      }
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(amount);

      return <div className="font-medium">{formatted}</div>
    }
  },
  {
    accessorKey: "attributeDescription",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("attributeDescription") as string;
      return (
        <div className="max-w-[200px] truncate" title={description}>
          {description || "-"}
        </div>
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
