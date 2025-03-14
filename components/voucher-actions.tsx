"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

interface VoucherActionsProps {
  id: string;
  type: "receipt" | "payment" | "sale" | "purchase";
}

export const VoucherActions: React.FC<VoucherActionsProps> = ({ id, type }) => {
  const generatePDF = async () => {
    const content = document.getElementById('voucher-content');
    if (!content) return;

    // Display loading state
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.zIndex = '9999';
    loadingOverlay.innerText = 'Generating PDF...';
    document.body.appendChild(loadingOverlay);

    try {
      // Higher quality scaling
      const scale = 2;
      const canvas = await html2canvas(content, {
        scale: scale,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      const doc = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      let position = 0;
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

      // Check if there are more pages needed
      while (imgHeight > pageHeight) {
        position = position - pageHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      }

      doc.save(`${type}-voucher-${id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      document.body.removeChild(loadingOverlay);
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
        className="flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
    </div>
  );
};
