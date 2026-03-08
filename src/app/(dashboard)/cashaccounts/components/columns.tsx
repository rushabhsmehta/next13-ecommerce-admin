"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"

export type CashAccountColumn = {
  id: string
  accountName: string;
  currentBalance: number;
  createdAt: string;
}

export const columns: ColumnDef<CashAccountColumn>[] = [
  {
    accessorKey: "accountName",
    header: "Account Name",
  },
  {
    accessorKey: "currentBalance",
    header: "Current Balance",
    cell: ({ row }) => {
      const balance = parseFloat(row.getValue("currentBalance"));
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(balance);
    }
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
