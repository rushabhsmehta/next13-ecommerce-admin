"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";

export interface VoucherLayoutProps {
  title: string;
  subtitle: string;
  voucherNo: string;
  date: string;
  dueDate?: string | null;
  leftInfo: { label: string; content: ReactNode }[];
  rightInfo: { label: string; content: ReactNode }[];
  additionalNotes?: string;
  signatures?: { left: string; right: string };
  totalAmount?: number;
  type: "sale" | "purchase" | "receipt" | "payment" | "income" | "expense"; // Add new types
  organization?: any; // Add organization prop
  children?: ReactNode;
}

export function VoucherLayout({
  title,
  subtitle,
  voucherNo,
  date,
  dueDate,
  leftInfo,
  rightInfo,
  additionalNotes,
  signatures,
  totalAmount,
  type,
  organization,
  children,
}: VoucherLayoutProps) {
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);

  // Load organization logo if available
  useEffect(() => {
    if (organization?.logoUrl) {
      setOrgLogoUrl(organization.logoUrl);
    }
  }, [organization]);

  return (
    <Card className="print:shadow-none" id="voucher-content">
      <CardContent className="p-6 print:p-0">
        <div className="space-y-6 print:space-y-4">
          {/* Organization Header - Logo on left, details on right */}
          {organization && (
            <div className="flex items-start mb-6">
              {/* Logo on the left */}
              {orgLogoUrl && (
                <div className="w-1/3 pr-4">
                  <div className="relative h-24 w-full">
                    <Image
                      src={orgLogoUrl}
                      alt="Organization Logo"
                      fill
                      style={{ objectFit: "contain", objectPosition: "left" }}
                    />
                  </div>
                </div>
              )}
              
              {/* Organization details on the right */}
              <div className={`${orgLogoUrl ? 'w-2/3' : 'w-full'} space-y-1`}>
                <h2 className="text-xl font-bold">{organization.name}</h2>
                {organization.address && <p className="text-sm">{organization.address}</p>}
                <div className="text-xs text-muted-foreground">
                  {organization.phone && <span className="mr-2">Phone: {organization.phone}</span>}
                  {organization.email && <span className="mr-2">Email: {organization.email}</span>}
                  {organization.website && <span>Web: {organization.website}</span>}
                </div>
                {(organization.gstNumber || organization.panNumber) && (
                  <div className="text-xs">
                    {organization.gstNumber && <span className="mr-2">GST: {organization.gstNumber}</span>}
                    {organization.panNumber && <span>PAN: {organization.panNumber}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col items-center text-center border-b pb-4 print:pb-2">
            <h1 className="text-2xl font-bold tracking-tight print:text-xl">{title}</h1>
            <p className="text-muted-foreground print:text-sm">{subtitle}</p>
          </div>

          {/* Details Section */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Voucher No.</div>
              <div className="font-medium">{voucherNo}</div>
            </div>
            <div className="space-y-1 md:text-right">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{date}</div>
              {dueDate && (
                <div className="text-sm font-medium text-muted-foreground">
                  Due: {dueDate}
                </div>
              )}
            </div>
          </div>

          {/* Info Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Info */}
            <div className="space-y-4">
              {leftInfo.map((info, index) => (
                <div key={`left-${index}`} className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {info.label}
                  </div>
                  <div>{info.content}</div>
                </div>
              ))}
            </div>

            {/* Right Info */}
            <div className="space-y-4 md:text-right">
              {rightInfo.map((info, index) => (
                <div key={`right-${index}`} className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {info.label}
                  </div>
                  <div>{info.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Section - Now rendering children here */}
          {children}

          {/* Only render the totalAmount section if children are not provided and totalAmount exists */}
          {!children && totalAmount !== undefined && (
            <div className="bg-muted/40 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <div className="font-medium">Total Amount</div>
                <div className="text-xl font-bold">
                  {formatPrice(totalAmount)}
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {additionalNotes && (
            <div className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium">Notes</div>
              <p className="text-muted-foreground">{additionalNotes}</p>
            </div>
          )}

          {/* Signatures Section */}
          {signatures && (
            <div className="grid grid-cols-2 gap-6 border-t pt-6 mt-6">
              <div className="text-center">
                <div className="h-16 border-b mb-2" />
                <div className="text-sm text-muted-foreground">{signatures.left}</div>
              </div>
              <div className="text-center">
                <div className="h-16 border-b mb-2" />
                <div className="text-sm text-muted-foreground">{signatures.right}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

