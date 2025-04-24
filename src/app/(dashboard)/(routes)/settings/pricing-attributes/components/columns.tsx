"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";

export type PricingAttributeColumn = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
};

export const columns: ColumnDef<PricingAttributeColumn>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },  {
    accessorKey: "sortOrder",
    header: "Sort Order",
    cell: ({ row }) => (
      <div>{row.original.sortOrder}</div>
    )
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "destructive"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    )
  },
  {
    accessorKey: "isDefault",
    header: "Default",
    cell: ({ row }) => (
      <Badge variant={row.original.isDefault ? "secondary" : "outline"}>
        {row.original.isDefault ? "Default" : "No"}
      </Badge>
    )
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
