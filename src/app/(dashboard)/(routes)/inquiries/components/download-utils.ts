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
    console.error('Error loading image:', error);
    throw error;
  }
};

// Function to download data as Excel
export const downloadAsExcel = async (data: InquiryColumn[], filename = 'inquiries', organization: any) => {
  const workbook = XLSX.utils.book_new();

  const worksheetRows: any[][] = [];
  const merges: any[] = [];
  const columnCount = 6;

  const addLabelValueRow = (label: string, value: string) => {
    const rowIndex = worksheetRows.length;
    worksheetRows.push([label, value, '', '', '', '']);
    merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: columnCount - 1 } });
  };

  const addFullWidthRow = (text: string) => {
    const rowIndex = worksheetRows.length;
    worksheetRows.push([text, '', '', '', '', '']);
    merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: columnCount - 1 } });
  };

  if (organization) {
    addLabelValueRow('Organization Name:', organization.name || '');
    addLabelValueRow('Address:', organization.address || '');
    addLabelValueRow('Phone:', organization.phone || '');
    addLabelValueRow('Email:', organization.email || '');
    addLabelValueRow('Website:', organization.website || '');
    addLabelValueRow('GST Number:', organization.gstNumber || '');
    addLabelValueRow('PAN Number:', organization.panNumber || '');
    worksheetRows.push(['', '', '', '', '', '']);
  }

  addFullWidthRow('Inquiries Report');
  addFullWidthRow(`Generated on: ${new Date().toLocaleDateString()}`);
  addFullWidthRow(`Total Records: ${data.length}`);
  worksheetRows.push(['', '', '', '', '', '']);

  const headerRowIndex = worksheetRows.length;
  const headers = [
    'Customer Name',
    'Mobile Number',
    'Location',
    'Associate Partner',
    'Status',
    'Journey Date',
  ];
  worksheetRows.push(headers);

  data.forEach((item) => {
    worksheetRows.push([
      item.customerName || '',
      item.customerMobileNumber || '',
      item.location || '',
      item.associatePartner || '',
      item.status || '',
      item.journeyDate || '',
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
  ];
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: headerRowIndex + data.length, c: headers.length - 1 },
    }),
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries');
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
      console.error('Error adding logo to PDF:', error);
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
      const location = [organization.city, organization.state, organization.pincode]
        .filter(Boolean)
        .join(', ');

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
  const tableColumn = ['Customer Name', 'Mobile', 'Location', 'Associate', 'Status', 'Journey Date'];

  // Prepare table rows
  const tableRows = data.map((item) => [
    item.customerName,
    item.customerMobileNumber,
    item.location,
    item.associatePartner,
    item.status,
    item.journeyDate,
  ]);

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 135, 245],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
  });

  // Save the PDF
  doc.save(`${filename}.pdf`);
};
