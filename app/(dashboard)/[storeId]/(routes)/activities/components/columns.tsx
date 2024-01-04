"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type ActivityColumn = {
  id: string
  activityTitle : string | null;
  locationLabel: string;
  createdAt: string;
}

export const columns: ColumnDef<ActivityColumn>[] = [
  {
    accessorKey: "activityTitle",
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
