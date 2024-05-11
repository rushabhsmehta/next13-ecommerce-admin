"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

import { format, parseISO } from 'date-fns';
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button";


export type TourPackageQueryColumn = {
  id: string;
  tourPackageQueryNumber: string;
  customerName: string;
  tourPackageQueryName: string;
  assignedTo: string;
  customerNumber: string;
  location: string;
 // period: string;
  tourStartsFrom: string;
  //hotel : string;
 // createdAt: string;
  isFeatured: boolean;
  isArchived: boolean;
}

export const columns: ColumnDef<TourPackageQueryColumn>[] = [
  {
    accessorKey: "tourPackageQueryNumber",
    header: "Query Number",
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
  },
  {
    accessorKey: "tourPackageQueryName",
    header: "Tour Package Query Name",
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
  },
  {
    accessorKey: "customerNumber",
    header: "Customer Number",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  // {
  //   accessorKey: "hotel",
  //   header: "Hotel",
  // },
  // {
  //   accessorKey: "isFeatured",
  //   header: "Confirmed",
  //   cell: (info) => info.getValue() ? "Yes" : "No",
  //   enableSorting: true, // Ensure that sorting is enabled for this column  
  // },

  {
    accessorKey: "tourStartsFrom",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tour Starts From
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },

  /* {
    accessorKey: "createdAt",
    header: "Date",
  }, */

  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
