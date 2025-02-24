"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

interface SummaryItem {
  status: string;
  _count: {
    id: number;
  };
}

export default function InquirySummaryPage() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      const response = await fetch('/api/inquiries/summary');
      const data = await response.json();
      setSummary(data.summary);
      setTotal(data.total);
    };

    fetchSummary();
  }, []);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading title="Inquiry Summary" description="Overview of all inquiries" />
        <Separator />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {summary.map((item) => (
            <Card key={item.status} className="p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">{item.status}</p>
                <p className="text-2xl font-bold">{item._count.id}</p>
              </div>
            </Card>
          ))}
          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">Total Inquiries</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
