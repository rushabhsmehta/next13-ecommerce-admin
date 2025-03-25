import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InquiryColumn } from './columns';

// Function to download data as Excel
export const downloadAsExcel = (data: InquiryColumn[], filename = 'inquiries') => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(item => ({
      'Customer Name': item.customerName,
      'Mobile Number': item.customerMobileNumber,
      'Location': item.location,
      'Associate Partner': item.associatePartner,
      'Status': item.status,
      'Journey Date': item.journeyDate,
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries');
  
  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Function to download data as PDF
export const downloadAsPDF = (data: InquiryColumn[], filename = 'inquiries') => {
  const doc = new jsPDF();
  
  const tableColumn = ["Customer Name", "Mobile", "Location", "Associate", "Status", "Journey Date"];
  const tableRows: any[][] = [];

  data.forEach(item => {
    const rowData = [
      item.customerName,
      item.customerMobileNumber,
      item.location,
      item.associatePartner,
      item.status,
      item.journeyDate,
    ];
    tableRows.push(rowData);
  });

  // Add title to the PDF
  doc.text("Inquiries Report", 14, 15);
  
  // Add the current date
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
  
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 135, 245] }
  });

  doc.save(`${filename}.pdf`);
};
