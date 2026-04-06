"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  type: "sale" | "purchase" | "receipt" | "payment" | "income" | "expense" | "sale-return" | "purchase-return";
  organization?: any;
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

  useEffect(() => {
    if (organization?.logoUrl) {
      setOrgLogoUrl(organization.logoUrl);
    }
  }, [organization]);

  return (
    <Card
      className="print:shadow-none"
      id="voucher-content"
      data-pdf-footer-label={organization?.name ?? ""}
      data-pdf-footer-primary={[organization?.phone ? `Phone: ${organization.phone}` : "", organization?.email ? `Email: ${organization.email}` : ""].filter(Boolean).join("  ·  ")}
      data-pdf-footer-secondary={organization?.address ?? ""}
      data-pdf-footer-website={organization?.website ?? ""}
      data-pdf-footer-logo={organization?.logoUrl ?? ""}
      data-pdf-footer-tagline="Crafting journeys with care and expertise."
    >
      <CardContent className="p-6">
        <div className="space-y-3">

          {/* ── Organization Header ── */}
          {organization && (
            <div className="flex items-center gap-4 pb-3 border-b">
              {orgLogoUrl && (
                <div className="relative h-14 w-24 shrink-0">
                  <Image
                    src={orgLogoUrl}
                    alt="Organization Logo"
                    fill
                    style={{ objectFit: "contain", objectPosition: "left" }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-tight">{organization.name}</p>
                {organization.address && (
                  <p className="text-xs text-muted-foreground mt-0.5">{organization.address}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {organization.phone && <span className="mr-3">Phone: {organization.phone}</span>}
                  {organization.email && <span className="mr-3">Email: {organization.email}</span>}
                  {organization.website && <span>Web: {organization.website}</span>}
                </p>
                {(organization.gstNumber || organization.panNumber) && (
                  <p className="text-xs text-muted-foreground">
                    {organization.gstNumber && <span className="mr-3">GST: {organization.gstNumber}</span>}
                    {organization.panNumber && <span>PAN: {organization.panNumber}</span>}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Document Title ── */}
          <div className="text-center py-1">
            <h1 className="text-lg font-bold tracking-widest uppercase">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {/* ── Voucher No + Date on same row ── */}
          <div className="flex justify-between items-start border-y py-2 bg-muted/30 px-2 rounded-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Voucher No.&nbsp;</span>
              <span className="font-semibold text-sm">{voucherNo}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Date&nbsp;</span>
              <span className="font-semibold text-sm">{date}</span>
              {dueDate && (
                <div className="text-xs text-muted-foreground">Due: {dueDate}</div>
              )}
            </div>
          </div>

          {/* ── Two-column Info (fixed, no md: breakpoint) ── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="space-y-2">
              {leftInfo.map((info, index) => (
                <div key={`left-${index}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {info.label}
                  </div>
                  <div className="text-sm mt-0.5">{info.content}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {rightInfo.map((info, index) => (
                <div key={`right-${index}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {info.label}
                  </div>
                  <div className="text-sm mt-0.5">{info.content}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Children (items table / amount block) ── */}
          {children}

          {/* ── Fallback total when no children ── */}
          {!children && totalAmount !== undefined && (
            <div className="flex justify-between items-center bg-muted/40 px-3 py-2 rounded-md">
              <span className="font-medium text-sm">Total Amount</span>
              <span className="text-base font-bold">{formatPrice(totalAmount)}</span>
            </div>
          )}

          {/* ── Footer box: Notes + Signatures ── */}
          {(additionalNotes || signatures) && (
            <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-3 mt-1">
              {additionalNotes && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{additionalNotes}</p>
                </div>
              )}
              {signatures && (
                <div className="grid grid-cols-2 gap-6 border-t border-dashed pt-3">
                  <div className="text-center">
                    <div className="h-8 border-b border-dashed mb-1" />
                    <div className="text-xs text-muted-foreground">{signatures.left}</div>
                  </div>
                  <div className="text-center">
                    <div className="h-8 border-b border-dashed mb-1" />
                    <div className="text-xs text-muted-foreground">{signatures.right}</div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
