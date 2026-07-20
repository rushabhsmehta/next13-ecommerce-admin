"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  summarizeSupplierOutreach,
  type SupplierOutreachSummary,
} from "@/lib/inquiry-supplier-outreach";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";

interface SuppliersContactedPanelProps {
  inquiryId: string;
  actions: Array<{
    id: string;
    actionType: string;
    remarks: string;
    actionDate: Date | string;
    createdAt?: Date | string;
  }>;
}

export function SuppliersContactedPanel({
  inquiryId,
  actions,
}: SuppliersContactedPanelProps) {
  const router = useRouter();
  const [markingKey, setMarkingKey] = useState<string | null>(null);

  const outreach = useMemo(() => {
    const withCreated = actions.map((a) => ({
      ...a,
      createdAt: a.createdAt ?? a.actionDate,
    }));
    // Deduplicate by supplierId|contact|channel keeping latest
    const items = summarizeSupplierOutreach(withCreated);
    const map = new Map<string, SupplierOutreachSummary>();
    for (const item of items) {
      const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
      const existing = map.get(key);
      if (!existing || existing.createdAt < item.createdAt) {
        map.set(key, item);
      } else if (item.quoteReceivedAt && !existing.quoteReceivedAt) {
        map.set(key, { ...existing, quoteReceivedAt: item.quoteReceivedAt });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }, [actions]);

  async function markQuoteReceived(item: SupplierOutreachSummary) {
    const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
    setMarkingKey(key);
    try {
      const res = await fetch(
        `/api/inquiries/${inquiryId}/supplier-quote-received`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: item.supplierId,
            supplierName: item.supplierName,
            contact: item.contact,
            channel: item.channel,
            notes: "Quote received from supplier",
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Could not mark quote received");
        return;
      }
      toast.success("Marked quote received");
      router.refresh();
    } catch {
      toast.error("Could not mark quote received");
    } finally {
      setMarkingKey(null);
    }
  }

  if (outreach.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Suppliers contacted</CardTitle>
        <p className="text-xs text-muted-foreground">
          Email / WhatsApp outreach for follow-up. Mark when a quotation arrives.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {outreach.map((item) => {
          const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
          const quoteReceived = Boolean(item.quoteReceivedAt);
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-md border bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">{item.supplierName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.channel === "WHATSAPP" ? (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </span>
                    )}
                  </Badge>
                  {quoteReceived ? (
                    <Badge className="bg-emerald-600 text-[10px]">
                      Quote received
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Asked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.contact}
                  {" · "}
                  {format(new Date(item.actionDate), "PPP")}
                </p>
              </div>
              {!quoteReceived ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={markingKey === key}
                  onClick={() => void markQuoteReceived(item)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {markingKey === key ? "Saving…" : "Mark quote received"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
