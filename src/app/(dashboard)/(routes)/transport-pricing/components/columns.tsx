"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";

export type TransportPricingColumn = {
  id: string;
  location: string;
  vehicleType: string;
  capacity: string;
  transportType: string;
  price: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export const columns: ColumnDef<TransportPricingColumn>[] = [
  {
    accessorKey: "location",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "vehicleType",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Vehicle Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
  },
  {
    accessorKey: "transportType",
    header: "Price Type",
    cell: ({ row }) => (
      <Badge variant={row.original.transportType === 'PerDay' ? 'default' : 'outline'}>
        {row.original.transportType === 'PerDay' ? 'Per Day' : 'Per Trip'}
      </Badge>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "startDate",
    header: "Valid From",
  },
  {
    accessorKey: "endDate",
    header: "Valid Until",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'destructive'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];