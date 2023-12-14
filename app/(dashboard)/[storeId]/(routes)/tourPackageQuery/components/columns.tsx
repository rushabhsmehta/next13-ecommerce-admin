"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type TourPackageQueryColumn = {
  id: string
  tourPackageQueryName : string;
  price: string;
  location : string;
  hotel : string;
  createdAt: string;
  isFeatured: boolean;
  isArchived: boolean;
}

export const columns: ColumnDef<TourPackageQueryColumn>[] = [
  {
    accessorKey: "tourPackageQueryName",
    header: "Tour Package Query Name",
  },
  {
    accessorKey: "isArchived",
    header: "Archived",
  },
  {
    accessorKey: "isFeatured",
    header: "Featured",
  },
  {
    accessorKey: "price",
    header: "Price",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "hotel",
    header: "Hotel",
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
