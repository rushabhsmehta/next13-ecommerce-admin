"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type HotelColumn = {
  id: string
  name: string;
  locationLabel: string;
  destinationName: string;
  createdAt: string;
}

export const columns: ColumnDef<HotelColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => row.original.locationLabel,
  },
  {
    accessorKey: "destination",
    header: "Destination",
    cell: ({ row }) => (
      <span className={row.original.destinationName === "No destination" ? "text-muted-foreground italic" : ""}>
        {row.original.destinationName}
      </span>
    ),
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

