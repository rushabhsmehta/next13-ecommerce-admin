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
import { AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [error, setError] = useState<string | null>(null);

  // Add inquiry status options with correct mappings
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "PENDING", label: "Pending" },     // maps to 'pending' in database
    { value: "CONFIRMED", label: "Confirmed" }, // maps to 'converted' in database
    { value: "CANCELLED", label: "Cancelled" }, // maps to 'cancelled' in database
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch associated partners
        console.log("Fetching associated partners...");
        const partnersResponse = await fetch('/api/associate-partners');
        
        if (!partnersResponse.ok) {
          throw new Error(`Failed to fetch partners: ${partnersResponse.status} ${partnersResponse.statusText}`);
        }
        
        const partners = await partnersResponse.json();
        console.log("Partners fetched:", partners);
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

        const summaryUrl = `/api/inquiry-summary?${queryParams}`;
        console.log("Fetching inquiry summary from:", summaryUrl);
        
        const summaryResponse = await fetch(summaryUrl);
        
        if (!summaryResponse.ok) {
          throw new Error(`Failed to fetch inquiry summary: ${summaryResponse.status} ${summaryResponse.statusText}`);
        }
        
        const summaryData = await summaryResponse.json();
        console.log("Summary data received:", summaryData);

        if (!Array.isArray(summaryData)) {
          throw new Error(`Expected array of summary data but got: ${typeof summaryData}`);
        }

        // Transform summary data
        const transformedData: InquirySummaryData[] = summaryData.map((item: any) => ({
          associateId: item.associateId || '',
          associateName: item.associateName || 'Unknown',
          totalInquiries: item.totalInquiries || 0,
          pendingInquiries: item.pendingInquiries || 0,
          confirmedInquiries: item.confirmedInquiries || 0,
          cancelledInquiries: item.cancelledInquiries || 0,
          conversionRate: item.totalInquiries > 0 
            ? `${((item.confirmedInquiries / item.totalInquiries) * 100).toFixed(1)}%` 
            : '0%',
          averageResponseTime: item.averageResponseTime || 'N/A',
        }));

        console.log("Transformed data:", transformedData);
        setSummaryData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setSummaryData([]);
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

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
      // Add a Unicode font that supports the Rupee symbol
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
    // Add report title
    doc.setFontSize(18);
    doc.text("Inquiry Summary Report", 14, 22);
    
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
    
    // Add status filter info
    const statusLabel = statusOptions.find(s => s.value === selectedStatus)?.label || "All Status";
    doc.text(`Status Filter: ${statusLabel}`, 14, 42);
    
    // Add summary metrics
    doc.setFontSize(12);
    doc.text("Summary Metrics", 14, 52);
    
    doc.setFontSize(10);
    doc.text(`Total Inquiries: ${totalInquiries}`, 14, 60);
    doc.text(`Confirmed Inquiries: ${totalConfirmed}`, 80, 60);
    doc.text(`Overall Conversion Rate: ${overallConversion}%`, 160, 60);
    
    // Add table data
    const tableData = filteredData.map(item => [
      item.associateName,
      item.totalInquiries,
      item.pendingInquiries,
      item.confirmedInquiries,
      item.cancelledInquiries,
      item.conversionRate,
      item.averageResponseTime
    ]);
    
    // Add the table
    autoTable(doc, {
      head: [["Associate Name", "Total Inquiries", "Pending", "Confirmed", "Cancelled", "Conversion Rate", "Avg Response Time"]],
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
    doc.save("inquiry-summary-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Inquiry Summary Report"],
      [""],
      ["Date Range:", dateRange?.from && dateRange?.to 
        ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
        : "All Time"],
      ["Associate:", selectedAssociate === "all" 
        ? "All Associates" 
        : associatedPartners.find(p => p.id === selectedAssociate)?.name || "Unknown"],
      ["Status Filter:", statusOptions.find(s => s.value === selectedStatus)?.label || "All Status"],
      [""],
      ["Summary Metrics:"],
      ["Total Inquiries:", totalInquiries],
      ["Confirmed Inquiries:", totalConfirmed],
      ["Overall Conversion Rate:", `${overallConversion}%`],
      [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add data table starting after the summary (at row 13)
    const headers = [
      ["Associate Name", "Total Inquiries", "Pending", "Confirmed", "Cancelled", "Conversion Rate", "Avg Response Time"]
    ];
    
    const dataRows = filteredData.map(item => [
      item.associateName,
      item.totalInquiries,
      item.pendingInquiries,
      item.confirmedInquiries,
      item.cancelledInquiries,
      item.conversionRate,
      item.averageResponseTime
    ]);
    
    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A13" });
    XLSX.utils.sheet_add_json(worksheet, dataRows, { origin: "A14", skipHeader: true });
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Associate Name
      { wch: 15 }, // Total Inquiries
      { wch: 10 }, // Pending
      { wch: 10 }, // Confirmed
      { wch: 10 }, // Cancelled
      { wch: 15 }, // Conversion Rate
      { wch: 20 }, // Avg Response Time
    ];
    
    worksheet["!cols"] = columnWidths;
    
    // Add merge cells for the title
    if(!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      {s: {r: 0, c: 0}, e: {r: 0, c: 6}} // Merge cells for the title row
    );
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inquiry Summary");
    
    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `inquiry-summary-report-${today}.xlsx`;
    
    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Inquiry Summary Report</h1>
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
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
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
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          Loading data...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-gray-50">
          <p className="text-gray-500">No data available for the selected filters.</p>
          <p className="text-sm text-gray-400 mt-1">Try changing your filter criteria.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredData} searchKey="associateName" />
      )}
    </div>
  );
}