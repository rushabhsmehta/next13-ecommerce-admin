'use client'

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"

export type InquiryColumn = {
  id: string
  customerName: string
  customerMobileNumber: string
  location: string
  associatePartner: string
  status: string
  numAdults: number
  numChildren: number
  createdAt: string
}

export const columns: ColumnDef<InquiryColumn>[] = [
  {
    accessorKey: "customerName",
    header: "Customer Name",
  },
  {
    accessorKey: "customerMobileNumber",
    header: "Mobile Number",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => row.original.location,

  },
  {
    accessorKey: "associatePartner",
    header: "Associate Partner",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "numAdults",
    header: "Adults",
  },
  {
    accessorKey: "numChildren",
    header: "Children",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },

  {
      id: "actions",
      cell: ({ row }) => <CellAction data={row.original} />
    },
]
