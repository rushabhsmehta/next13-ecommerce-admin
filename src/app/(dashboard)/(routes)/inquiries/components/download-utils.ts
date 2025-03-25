import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InquiryColumn } from './columns';

// Helper function to load image as base64 data URL
const loadImage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    throw error;
  }
};

// Function to download data as Excel
export const downloadAsExcel = async (data: InquiryColumn[], filename = 'inquiries', organization: any) => {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  
  // Create organization details headers
  const orgHeaders = [];
  
  // Add organization info if available
  if (organization) {
    orgHeaders.push(
      ['Organization Name:', organization.name || ''],
      ['Address:', organization.address || ''],
      ['Phone:', organization.phone || ''],
      ['Email:', organization.email || ''],
      ['Website:', organization.website || ''],
      ['GST Number:', organization.gstNumber || ''],
      ['PAN Number:', organization.panNumber || ''],
      ['', ''] // Empty row for spacing
    );
  }
  
  // Add report title
  orgHeaders.push(
    ['Inquiries Report', ''],
    [`Generated on: ${new Date().toLocaleDateString()}`, ''],
    ['', ''] // Empty row
  );
  
  // Convert inquiry data to worksheet format
  const inquiryData = data.map((item) => ({
    'Customer Name': item.customerName,
    'Mobile Number': item.customerMobileNumber,
    'Location': item.location,
    'Associate Partner': item.associatePartner,
    'Status': item.status,
    'Journey Date': item.journeyDate
  }));
  
  // First create the worksheet from inquiry data without specifying origin
  const worksheet = XLSX.utils.json_to_sheet(inquiryData);
  
  // Calculate the number of rows for the header section
  const headerRowCount = orgHeaders.length;
  
  // Shift the inquiry data down to make room for the header
  XLSX.utils.sheet_add_json(worksheet, inquiryData, { 
    origin: { r: headerRowCount, c: 0 },
    skipHeader: false 
  });
  
  // Add organization headers to the top of the sheet
  XLSX.utils.sheet_add_aoa(worksheet, orgHeaders, { origin: 'A1' });
  
  // Set column widths
  const colWidths = [
    { wch: 20 }, // Customer Name
    { wch: 15 }, // Mobile Number
    { wch: 15 }, // Location
    { wch: 20 }, // Associate Partner
    { wch: 12 }, // Status
    { wch: 15 }  // Journey Date
  ];
  worksheet['!cols'] = colWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries');
  
  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Function to download data as PDF
export const downloadAsPDF = async (data: InquiryColumn[], filename = 'inquiries', organization: any) => {
  // Create PDF document
  const doc = new jsPDF();
  
  let logoHeight = 0;
  let yPosition = 15;
  
  // Add organization logo if available
  if (organization?.logoUrl) {
    try {
      // Convert the logo to a data URL for embedding in PDF
      const logoDataUrl = await loadImage(organization.logoUrl);
      
      // Add the logo to the PDF
      // Scale the logo to reasonable size (max 40mm width)
      const maxWidth = 40;
      let imgWidth = maxWidth;
      let imgHeight = 20; // Default height if we can't calculate ratio
      
      // Calculate height based on aspect ratio
      const img = new Image();
      img.src = logoDataUrl;
      await new Promise((resolve) => {
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          imgHeight = imgWidth / aspectRatio;
          resolve(null);
        };
        img.onerror = () => resolve(null);
        
        // Fallback if image takes too long to load
        setTimeout(resolve, 1000); 
      });
      
      // Add image to document
      doc.addImage(logoDataUrl, 'JPEG', 14, yPosition, imgWidth, imgHeight);
      logoHeight = imgHeight;
      yPosition += logoHeight + 10;
    } catch (error) {
      console.error("Error adding logo to PDF:", error);
      // Continue without the logo
    }
  }
  
  // Set font for organization name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(organization?.name || 'Inquiries Report', 14, yPosition);
  yPosition += 8;
  
  // Add organization details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  if (organization) {
    if (organization.address) {
      doc.text(`Address: ${organization.address}`, 14, yPosition);
      yPosition += 5;
      
      // Add city, state, pincode if available
      const location = [
        organization.city,
        organization.state,
        organization.pincode
      ].filter(Boolean).join(', ');
      
      if (location) {
        doc.text(location, 14, yPosition);
        yPosition += 5;
      }
    }
    
    // Add contact information
    if (organization.phone) {
      doc.text(`Phone: ${organization.phone}`, 14, yPosition);
      yPosition += 5;
    }
    
    if (organization.email) {
      doc.text(`Email: ${organization.email}`, 14, yPosition);
      yPosition += 5;
    }
    
    if (organization.website) {
      doc.text(`Website: ${organization.website}`, 14, yPosition);
      yPosition += 5;
    }
    
    // Add tax information if available
    const taxInfo = [];
    if (organization.gstNumber) taxInfo.push(`GST: ${organization.gstNumber}`);
    if (organization.panNumber) taxInfo.push(`PAN: ${organization.panNumber}`);
    
    if (taxInfo.length > 0) {
      doc.text(taxInfo.join(' | '), 14, yPosition);
      yPosition += 5;
    }
  }
  
  // Add title and generated date
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Inquiries Report', 14, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);
  yPosition += 10;
  
  // Define table columns
  const tableColumn = [
    "Customer Name", 
    "Mobile", 
    "Location", 
    "Associate", 
    "Status", 
    "Journey Date"
  ];
  
  // Prepare table rows
  const tableRows = data.map(item => [
    item.customerName,
    item.customerMobileNumber,
    item.location,
    item.associatePartner,
    item.status,
    item.journeyDate
  ]);
  
  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPosition,
    styles: { 
      fontSize: 8, 
      cellPadding: 2 
    },
    headStyles: { 
      fillColor: [66, 135, 245],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });
  
  // Save the PDF
  doc.save(`${filename}.pdf`);
};
