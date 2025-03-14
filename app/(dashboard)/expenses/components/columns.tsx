"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { ExpenseCategory } from "@prisma/client";

export type ExpensesColumn = {
  id: string;
  expenseDate: string;
  formattedDate: string;
  amount: number;
  formattedAmount: string;
  expenseCategory: ExpenseCategory; // This is now an object from the relation
  description: string;
  accountName: string;
};

export const columns: ColumnDef<ExpensesColumn>[] = [
  {
    accessorKey: "formattedDate",
    header: "Date",
  },
  {
    accessorKey: "formattedAmount",
    header: "Amount",
  },
  {
    accessorKey: "expenseCategory.name", // Access the name property of the category object
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.expenseCategory;
      return category?.name || "Uncategorized";
    }
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "accountName",
    header: "Account",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
