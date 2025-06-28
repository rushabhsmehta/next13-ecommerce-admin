"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

import { format, parseISO } from 'date-fns';
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button";

export type TourPackageQueryDisplayColumn = {
  id: string;
  tourPackageQueryNumber: string;
  tourPackageQueryName: string;
  customerName: string;
  assignedTo: string;
  location: string;
  totalPrice: string;
  createdAt: string;
  updatedAt: string;
}

export const createColumns = (readOnly: boolean = false): ColumnDef<TourPackageQueryDisplayColumn>[] => [
  {
    accessorKey: "tourPackageQueryNumber",
    header: "Query Number",
  },
  {
    accessorKey: "tourPackageQueryName",
    header: "Tour Package Query Name",
  },
  {
    accessorKey: "customerName",
    header: "Customer Name",
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "totalPrice",
    header: "Total Price",
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
  },
  {
    accessorKey: "updatedAt",
    header: "Updated Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} readOnly={readOnly} />
  },
];
