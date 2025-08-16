"use client";

import { ColumnDef } from "@tanstack/react-table";

import { CellAction } from "./cell-action";

export type DestinationColumn = {
  id: string;
  name: string;
  description: string;
  location: string;
  locationId: string;
  isActive: boolean;
  createdAt: string;
};

export const columns: ColumnDef<DestinationColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.description}>
        {row.original.description || "No description"}
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <div className={`font-medium ${row.original.isActive ? 'text-green-600' : 'text-red-600'}`}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
