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
import { exportToCSV } from "@/lib/utils/csv-export";
import { AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface PerformanceData {
  associateId: string;
  associateName: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch associated partners
        const partnersResponse = await fetch('/api/associate-partners');
        
        if (!partnersResponse.ok) {
          throw new Error(`Failed to fetch partners: ${partnersResponse.status} ${partnersResponse.statusText}`);
        }
        
        const partners = await partnersResponse.json();
        setAssociatedPartners(partners);

        // Fetch performance data with filters
        const queryParams = new URLSearchParams();
        if (selectedAssociate !== "all") {
          queryParams.append("associateId", selectedAssociate);
        }
        if (dateRange?.from && dateRange?.to) {
          queryParams.append("startDate", dateRange.from.toISOString());
          queryParams.append("endDate", dateRange.to.toISOString());
        }

        const performanceUrl = `/api/associate-performance?${queryParams}`;
        const performanceResponse = await fetch(performanceUrl);
        
        if (!performanceResponse.ok) {
          throw new Error(`Failed to fetch performance data: ${performanceResponse.status} ${performanceResponse.statusText}`);
        }
        
        const performanceData = await performanceResponse.json();

        setPerformanceData(performanceData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setPerformanceData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAssociate, dateRange]);

  // Function to get current financial year (April 1 to March 31)
  const setCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // If current month is January to March, financial year started last year
    const financialYearStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    const financialYearEndYear = financialYearStartYear + 1;
    
    const from = new Date(financialYearStartYear, 3, 1); // April 1st
    const to = new Date(financialYearEndYear, 2, 31); // March 31st
    
    setDateRange({ from, to });
  };

  // Filter data based on selected associate
  const filteredData = selectedAssociate === "all"
    ? performanceData
    : performanceData.filter(item => item.associateId === selectedAssociate);

  // Calculate summary statistics based on filtered data
  const totalRevenue = filteredData.reduce((sum, item) => 
    sum + parseInt(item.revenue.replace(/\$|,/g, '') || '0'), 0);
  
  const avgPerformance = filteredData.length > 0 ? 
    filteredData.reduce((sum, item) => 
      sum + (item.performance === "Excellent" ? 5 : item.performance === "Good" ? 4 : 3), 0) / filteredData.length 
    : 0;

  const handleDownload = () => {
    // Format data for CSV export
    const exportData = filteredData.map(item => ({
      "Associate Name": item.associateName,
      "Confirmed Bookings": item.confirmedBookings,
      "Cancellations": item.cancellations,
      "Revenue Generated": item.revenue,
      "Commission Earned": item.commission,
      "Performance Rating": item.performance,
      "Total Inquiries": item.totalInquiries
    }));

    const dateRangeStr = dateRange?.from && dateRange?.to 
      ? `_${dateRange.from.toISOString().split('T')[0]}_to_${dateRange.to.toISOString().split('T')[0]}`
      : '';
    
    exportToCSV(exportData, `associate_performance_report${dateRangeStr}`);
  };

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
      // Add a Unicode font that supports the Rupee symbol
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
    // Add report title
    doc.setFontSize(18);
    doc.text("Associate Performance Report", 14, 22);
    
    // Add date range if selected
    doc.setFontSize(10);
    if (dateRange?.from && dateRange?.to) {
      const formattedStartDate = dateRange.from.toLocaleDateString();
      const formattedEndDate = dateRange.to.toLocaleDateString();
      doc.text(`Date Range: ${formattedStartDate} to ${formattedEndDate}`, 14, 30);
    } else {
      doc.text("Date Range: All Time", 14, 30);
    }
    
    // Add associate filter info
    const associateName = selectedAssociate === "all" 
      ? "All Associates" 
      : associatedPartners.find(p => p.id === selectedAssociate)?.name || "Unknown";
    doc.text(`Associate: ${associateName}`, 14, 36);
    
    // Add summary metrics
    doc.setFontSize(12);
    doc.text("Summary Metrics", 14, 52);
    
    doc.setFontSize(10);
    doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 14, 60);
    doc.text(`Average Performance: ${avgPerformance.toFixed(1)}/5.0`, 160, 60);
    
    // Add table data
    const tableData = filteredData.map(item => [
      item.associateName,
      item.confirmedBookings,
      item.cancellations,
      item.revenue,
      item.commission,
      item.performance,
      item.totalInquiries
    ]);
    
    // Add the table
    autoTable(doc, {
      head: [["Associate Name", "Confirmed", "Cancellations", "Revenue", "Commission", "Performance", "Inquiries"]],
      body: tableData,
      startY: 70,
    });
    
    // Add footer with date
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();
      
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }
    
    // Download the PDF
    doc.save("associate-performance-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Associate Performance Report"],
      [""],
      ["Date Range:", dateRange?.from && dateRange?.to 
        ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
        : "All Time"],
      ["Associate:", selectedAssociate === "all" 
        ? "All Associates" 
        : associatedPartners.find(p => p.id === selectedAssociate)?.name || "Unknown"],
      [""],
      ["Summary Metrics:"],
      ["Total Revenue:", `Rs. ${totalRevenue.toLocaleString()}`],
      ["Average Performance:", `${avgPerformance.toFixed(1)}/5.0`],
      [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add data table starting after the summary (at row 12)
    const headers = [
      ["Associate Name", "Confirmed Bookings", "Cancellations", "Revenue", "Commission", "Performance", "Total Inquiries"]
    ];
    
    const dataRows = filteredData.map(item => [
      item.associateName,
      item.confirmedBookings,
      item.cancellations,
      item.revenue,
      item.commission,
      item.performance,
      item.totalInquiries
    ]);
    
    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A12" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A13" });
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Associate Name
      { wch: 15 }, // Confirmed Bookings
      { wch: 15 }, // Cancellations
      { wch: 15 }, // Revenue
      { wch: 15 }, // Commission
      { wch: 15 }, // Performance
      { wch: 15 }, // Total Inquiries
    ];
    
    worksheet["!cols"] = columnWidths;
    
    // Add merge cells for the title
    if(!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      {s: {r: 0, c: 0}, e: {r: 0, c: 7}} // Merge cells for the title row
    );
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Associate Performance");
    
    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `associate-performance-report-${today}.xlsx`;
    
    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Associate Performance Report</h1>
        <div className="flex gap-2">
          <Button 
            onClick={generateExcel} 
            disabled={loading || filteredData.length === 0}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button 
            onClick={generatePDF} 
            disabled={loading || filteredData.length === 0}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <Download size={16} />
            PDF
          </Button>
          <Button onClick={handleDownload} variant="outline">
            Download CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        <Button 
          onClick={setCurrentFinancialYear} 
          variant="outline" 
          size="sm"
          className="whitespace-nowrap"
        >
          Financial Year
        </Button>
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Revenue</h3>
          <p className="text-2xl">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Average Performance</h3>
          <p className="text-2xl">{avgPerformance.toFixed(1)}/5.0</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Confirmed Bookings</h3>
          <p className="text-2xl">{filteredData.reduce((sum, item) => sum + item.confirmedBookings, 0)}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          Loading data...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-gray-50">
          <p className="text-gray-500">No performance data available for the selected filters.</p>
          <p className="text-sm text-gray-400 mt-1">Try changing your filter criteria.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredData} searchKey="associateName" />
      )}
    </div>
  );
}
