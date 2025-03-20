"use client"

import { ColumnDef } from "@tanstack/react-table"

import { CellAction } from "./cell-action"

export type CustomerColumn = {
  id: string;
  name: string;
  contact: string;
  email: string;
  associatePartner: string;
  createdAt: string;
}

export const columns: ColumnDef<CustomerColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "contact",
    header: "Contact",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "associatePartner",
    header: "Associate Partner",
  },
  {
    accessorKey: "createdAt",
    header: "Date Added",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];

