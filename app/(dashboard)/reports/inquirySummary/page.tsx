"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssociatePartner } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface InquirySummaryData {
  associateId: string;
  associateName: string;
  totalInquiries: number;
  pendingInquiries: number;
  confirmedInquiries: number;
  cancelledInquiries: number;
  conversionRate: string;
  averageResponseTime: string;
}

// Create a separate component for the action cell
const ActionCell = ({ associateId }: { associateId: string }) => {
  const router = useRouter();
  
  return (
    <Button
      onClick={() => router.push(`/inquiries?associateId=${associateId}`)}
      variant="outline"
      size="sm"
    >
      View/Update Inquiries
    </Button>
  );
};

const columns = [
  {
    accessorKey: "associateName",
    header: "Associate Name",
  },
  {
    accessorKey: "totalInquiries",
    header: "Total Inquiries",
  },
  {
    accessorKey: "pendingInquiries",
    header: "Pending",
  },
  {
    accessorKey: "confirmedInquiries",
    header: "Confirmed",
  },
  {
    accessorKey: "cancelledInquiries",
    header: "Cancelled",
  },
  {
    accessorKey: "conversionRate",
    header: "Conversion Rate",
  },
  {
    accessorKey: "averageResponseTime",
    header: "Avg. Response Time",
  },
  {
    id: "actions",
    cell: ({ row }: { row: { original: { associateId: string } } }) => <ActionCell associateId={row.original.associateId} />
  }
];

export default function InquirySummaryPage() {
  const [dateRange, setDateRange] = useState<any>();
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all");
  const [associatedPartners, setAssociatedPartners] = useState<AssociatePartner[]>([]);
  const [summaryData, setSummaryData] = useState<InquirySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Add inquiry status options
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch associated partners
        const partnersResponse = await fetch('/api/associate-partners');
        const partners = await partnersResponse.json();
        setAssociatedPartners(partners);

        // Fetch inquiry summary data
        const queryParams = new URLSearchParams();
        if (selectedAssociate !== "all") {
          queryParams.append("associateId", selectedAssociate);
        }
        if (selectedStatus !== "all") {
          queryParams.append("status", selectedStatus);
        }
        if (dateRange?.from && dateRange?.to) {
          queryParams.append("startDate", dateRange.from.toISOString());
          queryParams.append("endDate", dateRange.to.toISOString());
        }

        const summaryResponse = await fetch(`/api/inquiry-summary?${queryParams}`);
        const summaryData = await summaryResponse.json();

        // Transform summary data
        const transformedData: InquirySummaryData[] = summaryData.map((item: any) => ({
          associateId: item.associateId,
          associateName: item.associateName,
          totalInquiries: item.totalInquiries,
          pendingInquiries: item.pendingInquiries || 0,
          confirmedInquiries: item.confirmedInquiries || 0,
          cancelledInquiries: item.cancelledInquiries || 0,
          conversionRate: `${((item.confirmedInquiries / item.totalInquiries) * 100).toFixed(1)}%`,
          averageResponseTime: item.averageResponseTime || 'N/A',
        }));

        setSummaryData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAssociate, selectedStatus, dateRange]);

  // Update filtered data to include status filter
  const filteredData = summaryData
    .filter(item => selectedAssociate === "all" || item.associateId === selectedAssociate)
    .filter(item => {
      if (selectedStatus === "all") return true;
      switch (selectedStatus) {
        case "PENDING":
          return item.pendingInquiries > 0;
        case "CONFIRMED":
          return item.confirmedInquiries > 0;
        case "CANCELLED":
          return item.cancelledInquiries > 0;
        default:
          return true;
      }
    });

  // Calculate summary metrics
  const totalInquiries = filteredData.reduce((sum, item) => sum + item.totalInquiries, 0);
  const totalConfirmed = filteredData.reduce((sum, item) => sum + item.confirmedInquiries, 0);
  const overallConversion = totalInquiries ? ((totalConfirmed / totalInquiries) * 100).toFixed(1) : "0";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Inquiry Summary Report</h1>

      <div className="flex gap-4 items-center flex-wrap">
        <DateRangePicker  dateRange={dateRange}  onDateRangeChange={setDateRange} />
        <Select value={selectedAssociate} onValueChange={setSelectedAssociate}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Associate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Associates</SelectItem>
            {associatedPartners?.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Inquiries</h3>
          <p className="text-2xl">{totalInquiries}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Confirmed Inquiries</h3>
          <p className="text-2xl">{totalConfirmed}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Overall Conversion Rate</h3>
          <p className="text-2xl">{overallConversion}%</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          Loading data...
        </div>
      ) : (
        <DataTable columns={columns} data={filteredData} searchKey="associateName" />
      )}
    </div>
  );
}
