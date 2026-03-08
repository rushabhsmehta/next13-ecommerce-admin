"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"

export type BankAccountColumn = {
  id: string
  accountName: string;
  accountNumber: string;
  bankName: string;
  currentBalance: number;
  createdAt: string;
}

export const columns: ColumnDef<BankAccountColumn>[] = [
  {
    accessorKey: "accountName",
    header: "Account Name",
  },
  {
    accessorKey: "accountNumber",
    header: "Account Number",
  },
  {
    accessorKey: "bankName",
    header: "Bank Name",
  },
  {
    accessorKey: "currentBalance",
    header: "Current Balance",
    cell: ({ row }) => {
      const balance = Number(row.getValue("currentBalance"));
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
      }).format(balance);
    }
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
