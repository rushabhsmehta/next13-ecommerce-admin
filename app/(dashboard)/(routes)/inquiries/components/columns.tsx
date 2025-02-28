'use client'

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { QueryLink } from "./query-link"
import { ChevronDown, ChevronRight } from "lucide-react"
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

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const StatusCell = ({ row }: { row: any }) => {
  const [loading, setLoading] = useState(false);
  const initialStatus = row.original.status;

  const onStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      await axios.patch(`/api/inquiries/${row.original.id}/status`, {
        status: newStatus
      });
      toast.success("Status updated");
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

const renderActionHistory = ({ row }: { row: any }) => {
  const history = row.original.actionHistory;
  if (!history || history.length === 0) return "No actions";

  const getActionTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CALL':
        return 'border-green-500';
      case 'MESSAGE':
        return 'border-blue-500';
      case 'EMAIL':
        return 'border-yellow-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div className="p-4 bg-muted/10 space-y-2">
      {history.map((action: any, index: number) => (
        <div 
          key={index} 
          className={`text-sm border-l-2 pl-2 ${getActionTypeColor(action.type)}`}
        >
          <div className="font-medium flex items-center gap-2">
            <span>{action.type}</span>
            <span className="text-xs text-muted-foreground">
              {action.timestamp}
            </span>
          </div>
          {action.remarks && (
            <div className="text-muted-foreground text-xs mt-1">
              {action.remarks}
            </div>
          )}
        </div>
      ))}
    </div>
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
  tourPackageQueries: TourPackageQuery[]
  actionHistory: {
    status: string
    remarks: string
    timestamp: string
    type: string
  }[]
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
    header: ({ column }) => (
      <Select
        onValueChange={(value) => {
          column.setFilterValue(value === "ALL" ? "" : value)
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
    ),
    cell: ({ row }) => <StatusCell row={row} />,
    filterFn: (row, id, value) => value ? row.getValue(id) === value : true
  },
  {
    accessorKey: "journeyDate",
    header: "Journey Date",
  },
  {
    id: 'expander',
    header: 'History',
    cell: ({ row }) => {
      return (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="flex items-center gap-2"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {row.original.actionHistory?.length || 0} Actions
        </button>
      )
    }
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
  }
]