"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Plus, RefreshCcw, Link as LinkIcon, CheckCircle2, FileDown, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

const challanSchema = z.object({
  challanNumber: z.string().min(1),
  depositDate: z.string().optional(),
});

interface TdsTransaction {
  id: string;
  tdsType: string;
  sectionId: string | null;
  baseAmount: number;
  appliedRate: number;
  tdsAmount: number;
  financialYear: string;
  quarter: string;
  status: string;
  pan: string | null;
  notes: string | null;
  supplierId?: string | null;
  customerId?: string | null;
  paymentDetailId?: string | null;
  receiptDetailId?: string | null;
  challanId?: string | null;
  createdAt?: string;
}

interface Challan {
  id: string;
  challanNumber: string;
  depositDate: string | null;
  totalTdsAmount: number;
  transactionCount: number;
  deposited: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  transactions?: TdsTransaction[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
};

export default function ChallansClient() {
  const [loading, setLoading] = useState(false);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [pendingTxns, setPendingTxns] = useState<TdsTransaction[]>([]);
  const [attachSelection, setAttachSelection] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user role (simple API you can implement later). For now attempt /api/me/role else default VIEWER
    (async () => {
      try {
        const res = await fetch('/api/me/role');
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role || 'VIEWER');
        } else setUserRole('VIEWER');
      } catch { setUserRole('VIEWER'); }
    })();
  }, []);

  const canManage = userRole === 'FINANCE' || userRole === 'ADMIN' || userRole === 'OWNER';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetcher('/api/tds/challans');
      setChallans(data || []);
      const tx = await fetcher('/api/tds/transactions?status=pending');
      setPendingTxns(tx || []);
    } catch (e: any) {
      toast.error(e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createChallan = async () => {
    setCreating(true);
    try {
  const res = await fetch('/api/tds/challans', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ depositDate: new Date().toISOString() }) });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Challan created');
      await loadData();
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  };

  const attachTransactions = async (challanId: string) => {
    if (attachSelection.length === 0) return toast.error('Select transactions first');
    try {
  const res = await fetch('/api/tds/challans', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ challanId, action: 'attachTransactions', transactionIds: attachSelection }) });
      if (!res.ok) throw new Error('Attach failed');
      toast.success('Transactions attached');
      setAttachSelection([]);
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const markDeposited = async (challanId: string) => {
    try {
  const res = await fetch('/api/tds/challans', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ challanId, action: 'markDeposited', depositDate: new Date().toISOString() }) });
      if (!res.ok) throw new Error('Mark deposited failed');
      toast.success('Marked deposited');
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteChallan = async (id: string) => {
    if (!confirm('Delete challan? (soft delete)')) return;
    try {
      const res = await fetch(`/api/tds/challans?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Challan deleted');
      await loadData();
    } catch (e:any) { toast.error(e.message); }
  };

  const challanColumns = [
    { accessorKey: 'challanNumber', header: 'Challan #' },
    { accessorKey: 'transactionCount', header: 'Txn Count' },
    { accessorKey: 'totalTdsAmount', header: 'Total TDS', cell: ({ row }: any) => row.original.totalTdsAmount?.toFixed(2) },
    { accessorKey: 'depositDate', header: 'Deposit Date', cell: ({ row }: any) => row.original.depositDate ? format(new Date(row.original.depositDate), 'dd-MMM') : '-' },
  { accessorKey: 'deposited', header: 'Status', cell: ({ row }: any) => row.original.deposited ? 'Deposited' : 'Pending' },
    { accessorKey: 'updatedBy', header: 'Updated By', cell: ({ row }: any) => row.original.updatedBy ? <span title={`Last touched by ${row.original.updatedBy} at ${format(new Date(row.original.updatedAt),'dd-MMM HH:mm')}`}>{row.original.updatedBy}</span> : '-' },
    { id: 'actions', header: 'Actions', cell: ({ row }: any) => {
      const ch = row.original as Challan;
      if (!canManage) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/>Read only</span>;
      return <div className="flex gap-2">
        {!ch.deposited && <Button size="sm" variant="outline" onClick={() => attachTransactions(ch.id)} disabled={attachSelection.length===0}><LinkIcon className="h-3 w-3 mr-1"/>Attach</Button>}
        {!ch.deposited && <Button size="sm" variant="secondary" onClick={() => markDeposited(ch.id)}><CheckCircle2 className="h-3 w-3 mr-1"/>Deposit</Button>}
        {!ch.deposited && <Button size="sm" variant="destructive" onClick={() => deleteChallan(ch.id)}><Trash2 className="h-3 w-3 mr-1"/>Delete</Button>}
      </div>;
    } }
  ];

  const pendingColumns = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'tdsType', header: 'Type' },
    { accessorKey: 'baseAmount', header: 'Base', cell: ({ row }: any) => row.original.baseAmount.toFixed(2) },
    { accessorKey: 'appliedRate', header: 'Rate %' },
    { accessorKey: 'tdsAmount', header: 'TDS', cell: ({ row }: any) => row.original.tdsAmount.toFixed(2) },
    { accessorKey: 'financialYear', header: 'FY' },
    { accessorKey: 'quarter', header: 'Q' },
  ];

  return (
    <div className="p-6 space-y-6">
      {userRole === null && (
        <div className="rounded border p-3 text-sm bg-muted/30">Determining your access…</div>
      )}
      {userRole !== null && !canManage && (
        <div className="rounded border p-3 text-xs bg-yellow-50 text-yellow-800">You have read-only access. Request FINANCE or ADMIN role to manage challans.</div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">TDS Challans</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}><RefreshCcw className="h-4 w-4 mr-1"/>Refresh</Button>
          {canManage && <Button onClick={createChallan} disabled={creating}><Plus className="h-4 w-4 mr-1"/>New Challan</Button>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <h3 className="font-medium">Pending Transactions</h3>
          <DataTable columns={pendingColumns as any} data={pendingTxns} enableRowSelection={canManage} onRowSelectionChange={(sel: any) => {
            const ids = Object.keys(sel || {}).filter(k => sel[k]);
            setAttachSelection(ids);
          }} />
          <p className="text-xs text-muted-foreground">Select transactions then click Attach on a challan row.</p>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium">Challans</h3>
          <DataTable columns={challanColumns as any} data={challans} />
        </div>
      </div>
      <div>
        <Button variant="outline" onClick={() => {
          const csv = ['challanNumber,totalTdsAmount,transactionCount,deposited,depositDate'];
          challans.forEach(c => csv.push([c.challanNumber, c.totalTdsAmount, c.transactionCount, c.deposited, c.depositDate || ''].join(',')));
          const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'challans.csv'; a.click();
          URL.revokeObjectURL(url);
        }}><FileDown className="h-4 w-4 mr-1"/>Export CSV</Button>
      </div>
    </div>
  );
}
