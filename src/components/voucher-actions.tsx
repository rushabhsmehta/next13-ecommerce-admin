"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { toast } from "react-hot-toast";

interface VoucherActionsProps {
  id: string;
  type: "receipt" | "payment" | "sale" | "purchase" | "income" | "expense";
}

export const VoucherActions: React.FC<VoucherActionsProps> = ({ id, type }) => {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    const content = document.getElementById('voucher-content');
    if (!content) {
      toast.error('Could not find voucher content to convert');
      return;
    }

    // Set loading state
    setLoading(true);
    
    // Display loading toast
    const loadingToast = toast.loading('Generating PDF...');

    try {
      // For purchase vouchers, use a different approach with more optimizations
      const isPurchase = type === 'purchase';
      
      // Different settings based on voucher type
      const scale = isPurchase ? 1.5 : 2; // Lower scale for purchase vouchers
      const quality = isPurchase ? 0.8 : 1; // Lower quality for purchase vouchers to improve performance
      
      // Create a clone of the element for processing to avoid UI blocking
      const clone = content.cloneNode(true) as HTMLElement;
      clone.style.width = `${content.offsetWidth}px`;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      document.body.appendChild(clone);
      
      // Apply specific styles for PDF rendering
      const elementsToHide = clone.querySelectorAll('.print\\:hidden');
      elementsToHide.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Generate canvas with optimized settings
      const canvas = await html2canvas(clone, {
        scale: scale,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 30000, // Longer timeout for images
        onclone: (document, element) => {
          // Any additional modifications to the cloned content if needed
        }
      });

      // Remove the clone from DOM after processing
      document.body.removeChild(clone);
      
      const imgData = canvas.toDataURL('image/jpeg', quality); // Use JPEG for better performance with quality setting
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Calculate the height of the image in the PDF based on its aspect ratio
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable compression for smaller file size
      });
      
      // Add the image to the PDF
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 1;

      // Add first page
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed for long content
      while (heightLeft > 0) {
        position = -pageHeight * pageCount;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageCount++;
      }

      // Save the PDF
      doc.save(`${type}-voucher-${id.substring(0, 8)}.pdf`);
      toast.dismiss(loadingToast);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to generate PDF. Try using the print option instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline"
        onClick={() => window.print()}
        className="flex items-center gap-2 print:hidden"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <Button 
        variant="default"
        onClick={generatePDF}
        disabled={loading}
        className="flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        {loading ? 'Processing...' : 'Download PDF'}
      </Button>
    </div>
  );
};

