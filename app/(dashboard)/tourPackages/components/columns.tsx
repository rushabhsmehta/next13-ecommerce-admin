"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"
import { EditableCell } from "./EditableCell"
import axios from "axios"

export type TourPackageColumn = {
  id: string
  tourPackageName: string;
  tourPackageType: string;
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
    header: "Tour Package Name",
  },
  {
    accessorKey: "tourPackageType",
    header: "Type",
    cell: ({ row, column }) => (
      <EditableCell
        value={row.original.tourPackageType}
        onChange={async (newValue) => {

          const formattedData = {
            ...row.original,
            tourPackageType: newValue,
          };
          // Update the value in your data source
          await axios.patch(`/api/tourPackages/${row.original.id}`, formattedData);
        }}          // Optionally, trigger a re-render or save the change to the server

      />
    ),
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
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
