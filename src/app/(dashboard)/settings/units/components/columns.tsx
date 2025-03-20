"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { CellAction } from "./cell-action";

export type UnitColumn = {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

export const columns: ColumnDef<UnitColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "abbreviation",
    header: "Abbreviation",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
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

