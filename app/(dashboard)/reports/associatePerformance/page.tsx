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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface PerformanceData {
  associateId: string;
  associateName: string;
  totalBookings: number;
  confirmedBookings: number;
  cancellations: number;
  revenue: string;
  commission: string;
  performance: string;
  totalInquiries: number;
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
    accessorKey: "totalBookings",
    header: "Total Bookings",
  },
  {
    accessorKey: "confirmedBookings",
    header: "Confirmed Bookings",
  },
  {
    accessorKey: "cancellations",
    header: "Cancellations",
  },
  {
    accessorKey: "revenue",
    header: "Revenue Generated",
  },
  {
    accessorKey: "commission",
    header: "Commission Earned",
  },
  {
    accessorKey: "performance",
    header: "Performance Rating",
  },
  {
    accessorKey: "totalInquiries",
    header: "Total Inquiries",
  },
  {
    id: "actions",
    cell: ({ row }: { row: { original: { associateId: string } } }) => <ActionCell associateId={row.original.associateId} />
  }
];

export default function AssociatePerformancePage() {
  const [dateRange, setDateRange] = useState<any>();
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all");
  const [associatedPartners, setAssociatedPartners] = useState<AssociatePartner[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch associated partners
        const partnersResponse = await fetch('/api/associatedPartners');
        const partners = await partnersResponse.json();
        setAssociatedPartners(partners);

        // Transform partners data into performance data
        const transformedData: PerformanceData[] = partners.map((partner: AssociatePartner) => ({
          associateId: partner.id,
          associateName: partner.name,
          totalBookings: 0, // TODO: Implement real booking counts
          confirmedBookings: 0,
          cancellations: 0,
          revenue: "$0", // TODO: Implement real revenue calculation
          commission: "$0", // TODO: Implement real commission calculation
          performance: "Good", // TODO: Implement real performance rating
          totalInquiries: 0, // TODO: Implement real inquiry counts
        }));

        setPerformanceData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Filter data based on selected associate
  const filteredData = selectedAssociate === "all"
    ? performanceData
    : performanceData.filter(item => item.associateId === selectedAssociate);

  // Calculate summary statistics based on filtered data
  const totalRevenue = filteredData.reduce((sum, item) => 
    sum + parseInt(item.revenue.replace(/\$|,/g, '')), 0);
  const totalBookings = filteredData.reduce((sum, item) => 
    sum + item.totalBookings, 0);
  const avgPerformance = filteredData.reduce((sum, item) => 
    sum + (item.performance === "Excellent" ? 5 : item.performance === "Good" ? 4 : 3), 0) / filteredData.length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Associate Performance Report</h1>

      <div className="flex gap-4 items-center">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Revenue</h3>
          <p className="text-2xl">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Bookings</h3>
          <p className="text-2xl">{totalBookings}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Average Performance</h3>
          <p className="text-2xl">{avgPerformance.toFixed(1)}/5.0</p>
        </Card>
      </div>

      <DataTable columns={columns} data={filteredData} searchKey="associateName" />
    </div>
  );
}
