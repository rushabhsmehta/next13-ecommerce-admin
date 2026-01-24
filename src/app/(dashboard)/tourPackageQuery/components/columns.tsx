"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

import { format, parseISO } from 'date-fns';
import { ArrowUpDown, MoreHorizontal, FileText } from "lucide-react"
import { Button } from "@/components/ui/button";
import Link from "next/link";


export type TourPackageQueryColumn = {
  id: string;
  tourPackageQueryNumber: string;
  customerName: string;
  tourPackageQueryName: string;
  tourPackageQueryType: string;
  assignedTo: string;
  customerNumber: string;
  location: string;
  tourStartsFrom: string;
  updatedAt: string;
  isFeatured: boolean;
  isArchived: boolean;
}

export const columns: ColumnDef<TourPackageQueryColumn>[] = [
  {
    accessorKey: "tourPackageQueryNumber",
    header: "Query Number",
  },
  {
    accessorKey: "tourPackageQueryType",
    header: "Type",
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
  },
  {
    accessorKey: "tourPackageQueryName",
    header: "Tour Package Query Name",
    cell: ({ row }) => {
      const { id, tourPackageQueryName } = row.original;
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/tourPackageQuery/${id}`}
            className="text-blue-600 hover:underline"
            title="Open update page"
          >
            {tourPackageQueryName}
          </Link>
          <Link
            href={`/tourPackageQueryDisplay/${id}?search=AH`}
            target="_blank"
            aria-label="Open Tour Package Display (AH)"
            title="Open Tour Package Display (AH)"
            className="text-gray-500 hover:text-red-600"
          >
            <FileText className="h-4 w-4" />
          </Link>
        </div>
      );
    }
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
  {
    accessorKey: "isFeatured",
    header: "Confirmed",
    cell: (info) => info.getValue() ? "Yes" : "No",
    enableSorting: true, // Ensure that sorting is enabled for this column  
  },
  {
    accessorKey: "tourStartsFrom",
    header: "Tour Starts From",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
  },

  // {
  //   accessorKey: "createdAt",
  //   header: "Date",
  // },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];

