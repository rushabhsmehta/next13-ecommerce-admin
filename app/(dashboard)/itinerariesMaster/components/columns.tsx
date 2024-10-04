"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type ItineraryMasterColumn = {
  id: string
  itineraryMasterTitle : string;
  locationLabel: string;
  createdAt: string;
}

export const columns: ColumnDef<ItineraryMasterColumn>[] = [
  {
    accessorKey: "itineraryMasterTitle",
    header: "Title",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => row.original.locationLabel,
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
