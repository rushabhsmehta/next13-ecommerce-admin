"use client";
import { useState } from 'react';
import { TdsForm } from './components/tds-form';
import { tdsColumns, TdsRow } from './components/columns';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';

interface Props { initialRows: TdsRow[] }

const TdsClient: React.FC<Props> = ({ initialRows }) => {
  const [editing, setEditing] = useState<TdsRow | null>(null);
  const [filterMode, setFilterMode] = useState<'active' | 'historical' | 'all'>('active');
  const now = new Date();
  const filtered = initialRows.filter(r => {
    if (filterMode === 'all') return true;
    const to = r.effectiveTo ? new Date(r.effectiveTo) : null;
    const from = new Date(r.effectiveFrom);
    const active = from <= now && (!to || to >= now);
    return filterMode === 'active' ? active : !active;
  });

  async function handleDelete(row: TdsRow) {
    if (!confirm(`Delete section ${row.sectionCode}?`)) return;
    await fetch(`/api/settings/tds-sections/${row.id}`, { method: 'DELETE' });
    window.location.reload();
  }

  function exportCsv() {
    const headers = ['Section','Description','RateWithPAN','RateWithoutPAN','Threshold','From','To','Type'];
    const lines = filtered.map(r => [r.sectionCode, JSON.stringify(r.description||''), r.rateWithPan ?? '', r.rateWithoutPan ?? '', r.thresholdAmount ?? '', r.effectiveFrom, r.effectiveTo ?? '', r.isGstTds ? 'GST' : 'IncomeTax'].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tds_sections.csv'; a.click(); URL.revokeObjectURL(url);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tds_sections.json'; a.click(); URL.revokeObjectURL(url);
  }
  function triggerImport() { document.getElementById('tds-import-input')?.click(); }
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(1);
    for (const line of lines) {
      const [section, desc, rateWithPan, rateWithoutPan, threshold, from, to, type] = line.split(',');
      if (!section) continue;
      await fetch('/api/settings/tds-sections', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ sectionCode: section, description: desc?JSON.parse(desc):'', rateWithPan: rateWithPan?Number(rateWithPan):null, rateWithoutPan: rateWithoutPan?Number(rateWithoutPan):null, thresholdAmount: threshold?Number(threshold):null, effectiveFrom: from?new Date(from).toISOString():new Date().toISOString(), effectiveTo: to?new Date(to).toISOString():null, isGstTds: type==='GST', isIncomeTaxTds: type!=='GST' }) });
    }
    window.location.reload();
  }

  const toolbar = (
    <div className="flex gap-2 items-center flex-wrap">
      <select value={filterMode} onChange={e=>setFilterMode(e.target.value as any)} className="border rounded px-2 py-1 text-xs">
        <option value="active">Active</option>
        <option value="historical">Historical</option>
        <option value="all">All</option>
      </select>
      <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      <Button variant="outline" size="sm" onClick={exportJson}>Export JSON</Button>
      <Button variant="outline" size="sm" onClick={triggerImport}>Import CSV</Button>
      <input id="tds-import-input" type="file" accept=".csv" className="hidden" onChange={onImportFile} />
    </div>
  );

  return (
    <div className="grid gap-8 md:grid-cols-5">
      <div className="md:col-span-2 space-y-4">
        <h3 className="text-sm font-medium">{editing ? `Edit Section: ${editing.sectionCode}` : 'Add / Update Section'}</h3>
        <TdsForm editing={editing as any} onFinishEdit={()=>setEditing(null)} />
      </div>
      <div className="md:col-span-3 space-y-4">
        <h3 className="text-sm font-medium">Configured Sections ({filtered.length})</h3>
        <DataTable columns={tdsColumns} data={filtered} searchKey="sectionCode" onEditRow={(r:any)=>setEditing(r)} onDeleteRow={handleDelete} toolbar={toolbar} />
      </div>
    </div>
  );
};

export default TdsClient;
