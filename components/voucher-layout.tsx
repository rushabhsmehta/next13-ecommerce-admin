"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoucherLayoutProps {
  type: "receipt" | "payment" | "sale" | "purchase";
  title: string;
  subtitle: string;
  voucherNo: string;
  date: string;
  leftInfo: { label: string; content: React.ReactNode }[];
  rightInfo: { label: string; content: React.ReactNode }[];
  tableHeaders: string[];
  tableRows: React.ReactNode[];
  totalAmount: number;
  additionalNotes?: string;
  signatures?: { left: string; right: string };
}

export const VoucherLayout: React.FC<VoucherLayoutProps> = ({
  type,
  title,
  subtitle,
  voucherNo,
  date,
  leftInfo,
  rightInfo,
  tableHeaders,
  tableRows,
  totalAmount,
  additionalNotes,
  signatures = { left: "Prepared By", right: "Authorized Signature" }
}) => {
  // Map type to color scheme
  const colorScheme = {
    receipt: "border-green-500 bg-gradient-to-r from-green-50 to-white",
    payment: "border-blue-500 bg-gradient-to-r from-blue-50 to-white",
    sale: "border-amber-500 bg-gradient-to-r from-amber-50 to-white",
    purchase: "border-purple-500 bg-gradient-to-r from-purple-50 to-white",
  };

  const headerBg = {
    receipt: "bg-green-500",
    payment: "bg-blue-500",
    sale: "bg-amber-500",
    purchase: "bg-purple-500",
  };

  return (
    <div id="voucher-content" className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200 print:shadow-none">
      {/* Logo & Header */}
      <div className={cn("py-4 px-8 text-white text-center", headerBg[type])}>
        <div className="flex justify-center items-center mb-2">
          <div className="bg-white rounded-full p-2 w-12 h-12 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="Company Logo" 
              width={40} 
              height={40}
              className="object-contain"
              onError={(e) => {
                // Fallback if logo doesn't exist
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="opacity-90">{subtitle}</p>
      </div>

      {/* Voucher Content */}
      <div className={cn("p-8", colorScheme[type])}>
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            {leftInfo.map((info, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{info.label}</h3>
                <div className="text-base">{info.content}</div>
              </div>
            ))}
          </div>
          <div className="text-right space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">VOUCHER DETAILS</h3>
              <p><span className="font-medium">Voucher No:</span> {voucherNo}</p>
              <p><span className="font-medium">Date:</span> {date}</p>
              {rightInfo.map((info, idx) => (
                <p key={idx}><span className="font-medium">{info.label}:</span> {info.content}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md overflow-hidden border border-slate-200 mb-8">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                {tableHeaders.map((header, index) => (
                  <th key={index} className={cn(
                    "py-3 px-4 text-sm font-medium text-slate-700",
                    index === tableHeaders.length - 1 ? "text-right" : "text-left"
                  )}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={tableHeaders.length - 1} className="py-3 px-4 text-right font-semibold">Total:</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">{formatPrice(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-16 mb-6">
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-center text-sm text-slate-600">{signatures.left}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-center text-sm text-slate-600">{signatures.right}</p>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        {additionalNotes && (
          <div className="mt-8 text-center text-sm text-slate-500 pt-4 border-t border-slate-200">
            <p>{additionalNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          <p className="mt-1">This is an electronically generated document and doesn&apos;t require a physical signature.</p>
        </div>
      </div>
    </div>
  );
};
