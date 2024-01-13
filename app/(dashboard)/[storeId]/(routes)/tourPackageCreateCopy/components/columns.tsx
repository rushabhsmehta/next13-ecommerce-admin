"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type TourPackageColumn = {
  id: string
  tourPackageName : string;
  price: string;
  location : string;
  //hotel : string;
  createdAt: string;
  isFeatured: boolean;
  isArchived: boolean;
}

export const columns: ColumnDef<TourPackageColumn>[] = [
  {
    accessorKey: "tourPackageName",
    header: "Tour Package  Name",
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
  // {
  //   accessorKey: "hotel",
  //   header: "Hotel",
  // },
  
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
