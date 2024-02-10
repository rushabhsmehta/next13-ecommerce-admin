"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type TourPackageQueryColumn = {
  id: string;
  tourPackageQueryNumber : string;
  customerName: string;
  tourPackageQueryName : string;
  assignedTo : string;
  price: string;
  location : string;
  //hotel : string;
  createdAt: string;
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
    accessorKey: "price",
    header: "Price",
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
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
