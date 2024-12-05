"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type TourPackageColumn = {
  id: string
  tourPackageName: string;
  tourPackageType: string;
  price: string;
  location : string;
  //hotel : string;
  createdAt: string;
  updatedAt : string;
  isFeatured: boolean;
  isArchived: boolean;
}

export const columns: ColumnDef<TourPackageColumn>[] = [
  {
    accessorKey: "tourPackageName",
    header: "Tour Package Name",
  },
  {
    accessorKey: "tourPackageType",
    header: "Type",
  },
 /*  {
    accessorKey: "isArchived",
    header: "Archived",
  },
  {
    accessorKey: "isFeatured",
    header: "Featured",
  }, */
  /* {
    accessorKey: "price",
    header: "Price",
  }, */
  {
    accessorKey: "location",
    header: "Location",
  },
 /*  {
    accessorKey: "hotel",
    header: "Hotel",
  }, */
  
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
    cell: ({ row }) => <CellAction data={row.original} />
  },
];