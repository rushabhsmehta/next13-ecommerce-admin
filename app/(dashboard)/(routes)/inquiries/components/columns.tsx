'use client'

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import axios from "axios"
import { toast } from "react-hot-toast"

// Add status options
const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Create StatusCell component
const StatusCell = ({ row }: { row: any }) => {
  const [loading, setLoading] = useState(false);
  const initialStatus = row.original.status;

  const onStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      await axios.patch(`/api/inquiries/${row.original.id}`, {
        status: newStatus
      });
      toast.success("Status updated");
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      defaultValue={initialStatus}
      onValueChange={onStatusChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[130px]">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem 
            key={status.value} 
            value={status.value}
            className={
              status.value === "CONFIRMED" ? "text-green-600" :
              status.value === "CANCELLED" ? "text-red-600" :
              "text-yellow-600"
            }
          >
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

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
    cell: ({ row }) => <StatusCell row={row} />
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
