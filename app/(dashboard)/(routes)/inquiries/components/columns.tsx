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
import { TourPackageQuery } from "@prisma/client"
import { QueryLink } from "./query-link"

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
      // Use the new status-specific endpoint
      await axios.patch(`/api/inquiries/${row.original.id}/status`, {
        status: newStatus
      });
      toast.success("Status updated");
      // Optionally refresh the page or update the UI
     // window.location.relroad();
    } catch (error) {
      toast.error("Failed to update status");
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
  journeyDate: string
  tourPackageQueries: TourPackageQuery[];  // Add this line
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
    header: ({ column }) => {
      return (
        <Select
          onValueChange={(value) => {
            if (value === "ALL") {
              column.setFilterValue("")
            } else {
              column.setFilterValue(value)
            }
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
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
      )
    },
    cell: ({ row }) => <StatusCell row={row} />,
    filterFn: (row, id, value) => {
      return value ? row.getValue(id) === value : true
    }
  },
  {
    accessorKey: "journeyDate",
    header: "Journey Date",
  },
  {
    accessorKey: "tourPackageQueries",
    header: "Tour Package Queries",
    cell: ({ row }) => {
      const queries = row.original.tourPackageQueries;
      if (!queries || queries.length === 0) return "No queries";
      
      return (
        <div className="space-y-1">
          {queries.map((query, index) => (
            <span key={query.id}>
              <QueryLink query={query} />
              {index < queries.length - 1 && ", "}
            </span>
          ))}
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
]
