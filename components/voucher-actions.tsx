"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";

interface VoucherActionsProps {
  id: string;
  type: "receipt" | "payment" | "sale" | "purchase";
}

export const VoucherActions: React.FC<VoucherActionsProps> = ({ id, type }) => {
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
        onClick={() => {
          const doc = new jsPDF();
          // Capture the HTML content
          const content = document.getElementById('voucher-content');
          if (content) {
            doc.html(content, {
              callback: function(doc) {
                doc.save(`${type}-voucher-${id}.pdf`);
              },
              x: 15,
              y: 15,
              width: 170,
              windowWidth: 650
            });
          }
        }}
        className="flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
    </div>
  );
};
