"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    cell: ({ row }: { row: { original: { associateId: string } } }) => {
      const router = useRouter();
      return (
        <Button
          onClick={() => router.push(`/inquiries?associateId=${row.original.associateId}`)}
          variant="outline"
          size="sm"
        >
          View/Update Inquiries
        </Button>
      )
    }
  }
];

// Mock associates data
const associates = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Mike Johnson" },
  { id: "4", name: "Sarah Williams" },
];

// Mock performance data
const performanceData = [
  {
    associateId: "1",
    associateName: "John Doe",
    totalBookings: 45,
    confirmedBookings: 38,
    cancellations: 7,
    revenue: "$52,000",
    commission: "$5,200",
    performance: "Excellent",
    totalInquiries: 25,
  },
  {
    associateId: "2",
    associateName: "Jane Smith",
    totalBookings: 38,
    confirmedBookings: 32,
    cancellations: 6,
    revenue: "$43,000",
    commission: "$4,300",
    performance: "Good",
    totalInquiries: 18,
  },
  // Add more associate data as needed
];

export default function AssociatePerformancePage() {
  const [dateRange, setDateRange] = useState<any>();
  const [selectedAssociate, setSelectedAssociate] = useState<string>("all");

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
            {associates.map((associate) => (
              <SelectItem key={associate.id} value={associate.id}>
                {associate.name}
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
