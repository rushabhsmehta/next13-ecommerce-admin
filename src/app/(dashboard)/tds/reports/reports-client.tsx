"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { FileDown, RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SummaryRow { tdsType: string; totalBase: number; totalTds: number; count: number; }

export default function TdsReportsClient(){
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [range, setRange] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });

  const load = useCallback(async () => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      const res = await fetch('/api/report/tds/summary?' + qs.toString());
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      setSummary(data.rows || []);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [range?.from, range?.to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const csv = ['tdsType,totalBase,totalTds,count'];
    summary.forEach(r => csv.push([r.tdsType, r.totalBase, r.totalTds, r.count].join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tds-summary.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const totalTds = summary.reduce((a,c)=>a+c.totalTds,0); const totalBase = summary.reduce((a,c)=>a+c.totalBase,0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">TDS Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCcw className="h-4 w-4 mr-1"/>Refresh</Button>
          <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-1"/>Export CSV</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Total TDS</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalTds.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Total Base</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalBase.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Records</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.reduce((a,c)=>a+c.count,0)}</p></CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {summary.map(r => (
          <Card key={r.tdsType}><CardHeader><CardTitle>{r.tdsType}</CardTitle></CardHeader><CardContent>
            <div className="text-sm space-y-1">
              <div>Base: {r.totalBase.toFixed(2)}</div>
              <div>TDS: {r.totalTds.toFixed(2)}</div>
              <div>Count: {r.count}</div>
              <div>Avg Rate: {r.totalBase>0 ? ((r.totalTds/r.totalBase)*100).toFixed(2)+'%' : '-'}</div>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
