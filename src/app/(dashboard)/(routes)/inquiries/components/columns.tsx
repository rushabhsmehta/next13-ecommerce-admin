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
  // Helper function to get status styling
  const getStatusStyles = (status: string) => {
    switch(status) {
      case "CONFIRMED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      case "HOT_QUERY":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      default:
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }
  };
  return (
    <div className="flex items-center">
      <Select
        defaultValue={initialStatus}
        onValueChange={onStatusChange}
        disabled={loading}
      >
        <SelectTrigger className="p-0 h-auto border-0 bg-transparent shadow-none w-auto hover:bg-transparent focus:ring-0">          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyles(initialStatus)} flex items-center`}>
            <span>{statusOptions.find(s => s.value === initialStatus)?.label || "Unknown Status"}</span>
          </div>
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
    </div>
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
    <div className="space-y-2 max-w-[160px]">
      {latestActions.map((action: any, index: number) => (
        <div 
          key={index} 
          className={`
            text-xs rounded-md p-1.5 border-l-2
            ${getActionTypeColor(action.type)}
          `}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium text-xs">{action.type}</span>
            <span className="text-muted-foreground text-xs">
              {formatDate(action.timestamp)}
            </span>
          </div>
          {action.remarks && (
            <div className="text-muted-foreground mt-0.5 truncate text-xs">
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
    header: "Customer Details",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium">{customer.customerName}</div>
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>{customer.customerMobileNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{customer.location}</span>
            </div>
          </div>
        </div>
      );
    },
    size: 180,
  },
  {
    accessorKey: "associatePartner",
    header: "Associate Partner",
  },  {
    accessorKey: "status",
    header: ({ column }) => {
      const currentFilter = column.getFilterValue() as string;
      
      // Get label for the current filter
      const getCurrentStatusLabel = () => {
        if (!currentFilter) return "All Status";
        const option = statusOptions.find(s => s.value === currentFilter);
        return option ? option.label : "Filter status";
      };
      
      // Get styling for status badges
      const getStatusBadgeStyle = (status: string) => {
        switch(status) {
          case "CONFIRMED":
            return "bg-green-50 text-green-700 border border-green-200";
          case "CANCELLED":
            return "bg-red-50 text-red-700 border border-red-200";
          case "HOT_QUERY":
            return "bg-orange-50 text-orange-700 border border-orange-200";
          case "PENDING":
            return "bg-yellow-50 text-yellow-700 border border-yellow-200";
          default:
            return "";
        }
      };

      return (
        <Select
          value={currentFilter || "ALL"}
          onValueChange={(value) => {
            column.setFilterValue(value === "ALL" ? "" : value);
          }}
        >        <SelectTrigger className="w-[140px]">
            {currentFilter ? (
              <div className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${getStatusBadgeStyle(currentFilter)} flex items-center`}>
                <span>{getCurrentStatusLabel()}</span>
              </div>
            ) : (
              <SelectValue placeholder="Filter status" />
            )}
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
      );
    },
    cell: ({ row }) => <StatusCell row={row} />,
    filterFn: (row, id, value) => value ? row.getValue(id) === value : true
  },
  {
    accessorKey: "journeyDate",
    header: "Journey Date",
  },  {
    accessorKey: "actionHistory",
    header: "Recent Actions",
    cell: renderActionHistory,
    size: 160,  // Set a fixed width for this column
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
