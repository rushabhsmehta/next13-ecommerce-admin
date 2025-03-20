"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type LocationColumn = {
  id: string
  label: string;
  slug : string;
  createdAt: string;
}

export const columns: ColumnDef<LocationColumn>[] = [
  {
    accessorKey: "label",
    header: "Label",
  },
  
  {
    accessorKey: "createdAt",
    header: "Date of Creation",
  },

  {
    accessorKey: "slug",
    header: "Slug",
  },

  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];

