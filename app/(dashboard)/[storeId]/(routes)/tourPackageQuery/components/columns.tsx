"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

import { format, parseISO } from 'date-fns';

export type TourPackageQueryColumn = {
  id: string;
  tourPackageQueryNumber : string;
  customerName: string;
  tourPackageQueryName : string;
  assignedTo : string;
  customerNumber : string;
  location : string;
  period : string;
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
  accessorKey: "period",
  header: "Period",
  cell: (info) => {
    try {
      const { from, to } = JSON.parse(info.getValue() as string);
      const fromDate = format(parseISO(from), 'dd-MM-yyyy');
      const toDate = format(parseISO(to), 'dd-MM-yyyy');
      return `${fromDate} To ${toDate}`;
    } catch (error) {
      console.error("Error parsing period:", error);
      return info.getValue(); // Return the original value if parsing fails
    }
  },
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
