'use client'

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { QueryLink } from "./query-link"
import { ChevronDown, ChevronRight, UserRound } from "lucide-react"
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
import { CompactStaffAssignment } from "@/components/compact-staff-assignment"

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "HOT_QUERY", label: "Hot Query" },
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
              status.value === "HOT_QUERY" ? "text-orange-600" :
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

  // Show only the latest 2 actions
  const latestActions = [...history]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 2);

  const getActionTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CALL':
        return 'border-green-500 bg-green-50';
      case 'MESSAGE':
        return 'border-blue-500 bg-blue-50';
      case 'EMAIL':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-2 min-w-[200px]">
      {latestActions.map((action: any, index: number) => (
        <div 
          key={index} 
          className={`
            text-xs rounded-md p-2 border-l-2
            ${getActionTypeColor(action.type)}
          `}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{action.type}</span>
            <span className="text-muted-foreground">
              {formatDate(action.timestamp)}
            </span>
          </div>
          {action.remarks && (
            <div className="text-muted-foreground mt-1 truncate">
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
  assignedToStaffId: string | null
  assignedStaffName: string | null
  assignedStaffAt: string | null
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
                status.value === "HOT_QUERY" ? "text-orange-600" :
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
    accessorKey: "actionHistory",
    header: "Recent Actions",
    cell: renderActionHistory
  },
  {
    accessorKey: "tourPackageQueries",
    header: "Tour Package Queries",
    cell: ({ row }) => {
      const queries = row.original.tourPackageQueries;
      if (!queries || queries.length === 0) return "No queries";

      return (
        <ol className="list-decimal pl-4">
          {queries.map((query) => (
            <li key={query.id} className="my-1">
              <QueryLink query={query} url={`/tourPackageQuery/${query.id}`} />
            </li>
          ))}
        </ol>
      );
    }
  },  {
    accessorKey: "assignedStaffName",
    header: "Assigned Staff",
    cell: ({ row }) => {
      const inquiry = row.original;
      return (
        <div className="flex items-center gap-2">
          {inquiry.assignedStaffName && (
            <span className="text-sm text-slate-700 flex items-center">
              <UserRound className="h-3 w-3 mr-1.5 text-slate-500" />
              {inquiry.assignedStaffName}
            </span>
          )}
          <CompactStaffAssignment
            inquiryId={inquiry.id}
            assignedStaffId={inquiry.assignedToStaffId}
            onAssignmentComplete={() => {
              toast.success("Staff assignment updated");
              // Refresh the page to update the data
              window.location.reload();
            }}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  }
]
