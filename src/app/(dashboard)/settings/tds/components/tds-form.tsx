"use client";
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export interface TdsSectionInput {
  id?: string;
  sectionCode: string;
  description?: string;
  thresholdAmount?: number | null;
  rateIndividual?: number | null;
  rateCompany?: number | null;
  rateWithPan?: number | null;
  rateWithoutPan?: number | null;
  effectiveFrom: string; // ISO
  effectiveTo?: string | null;
  isIncomeTaxTds?: boolean;
  isGstTds?: boolean;
  surchargeApplicable?: boolean;
  cessApplicable?: boolean;
}

export const TdsForm: React.FC<{ onCreated?: () => void; initial?: Partial<TdsSectionInput>; editing?: TdsSectionInput | null; onFinishEdit?: () => void; }> = ({ onCreated, initial, editing, onFinishEdit }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TdsSectionInput>({
    sectionCode: initial?.sectionCode || '',
    description: initial?.description || '',
    thresholdAmount: initial?.thresholdAmount ?? null,
    rateIndividual: initial?.rateIndividual ?? null,
    rateCompany: initial?.rateCompany ?? null,
    rateWithPan: initial?.rateWithPan ?? null,
    rateWithoutPan: initial?.rateWithoutPan ?? null,
    effectiveFrom: initial?.effectiveFrom || new Date().toISOString().slice(0,10),
    effectiveTo: initial?.effectiveTo || null,
    isIncomeTaxTds: initial?.isIncomeTaxTds ?? true,
    isGstTds: initial?.isGstTds ?? false,
    surchargeApplicable: initial?.surchargeApplicable ?? false,
    cessApplicable: initial?.cessApplicable ?? false,
  });

  useEffect(()=>{
    if (editing) {
      setForm({
        sectionCode: editing.sectionCode,
        description: editing.description || '',
        thresholdAmount: editing.thresholdAmount ?? null,
        rateIndividual: editing.rateIndividual ?? null,
        rateCompany: editing.rateCompany ?? null,
        rateWithPan: editing.rateWithPan ?? null,
        rateWithoutPan: editing.rateWithoutPan ?? null,
        effectiveFrom: editing.effectiveFrom?.slice(0,10) || new Date().toISOString().slice(0,10),
        effectiveTo: editing.effectiveTo ? editing.effectiveTo.slice(0,10) : null,
        isIncomeTaxTds: editing.isIncomeTaxTds ?? true,
        isGstTds: editing.isGstTds ?? false,
        surchargeApplicable: editing.surchargeApplicable ?? false,
        cessApplicable: editing.cessApplicable ?? false,
        id: editing.id
      });
    }
  }, [editing]);

  const update = (k: keyof TdsSectionInput, v: any) => setForm(f => ({ ...f, [k]: v }));
  const reset = () => { onFinishEdit?.(); setForm({ sectionCode: '', description: '', thresholdAmount: null, rateIndividual: null, rateCompany: null, rateWithPan: null, rateWithoutPan: null, effectiveFrom: new Date().toISOString().slice(0,10), effectiveTo: null, isIncomeTaxTds: true, isGstTds: false, surchargeApplicable: false, cessApplicable: false }); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const toNumOrNull = (v: any) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; };
    try {
      const payload = { ...form, thresholdAmount: toNumOrNull(form.thresholdAmount as any), rateIndividual: toNumOrNull(form.rateIndividual as any), rateCompany: toNumOrNull(form.rateCompany as any), rateWithPan: toNumOrNull(form.rateWithPan as any), rateWithoutPan: toNumOrNull(form.rateWithoutPan as any), effectiveFrom: new Date(form.effectiveFrom).toISOString(), effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : null };
      let res: Response;
      if (form.id) {
        res = await fetch(`/api/settings/tds-sections/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/settings/tds-sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (!res.ok) throw new Error(await res.text());
      onCreated?.();
      router.refresh();
      reset();
    } catch (err) {
      console.error('TDS section save error', err); alert('Failed: '+ (err as any).message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border rounded-md p-4 bg-card">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="flex flex-col text-xs gap-1">Section Code
          <input required value={form.sectionCode} onChange={e=>update('sectionCode', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Effective From
          <input type="date" required value={form.effectiveFrom} onChange={e=>update('effectiveFrom', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Effective To
          <input type="date" value={form.effectiveTo ?? ''} onChange={e=>update('effectiveTo', e.target.value || null)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex items-center gap-2 text-xs mt-5"><input type="checkbox" checked={form.isIncomeTaxTds} onChange={e=>update('isIncomeTaxTds', e.target.checked)} /> Income Tax</label>
        <label className="flex items-center gap-2 text-xs mt-5"><input type="checkbox" checked={form.isGstTds} onChange={e=>update('isGstTds', e.target.checked)} /> GST TDS</label>
        <label className="flex items-center gap-2 text-xs mt-5"><input type="checkbox" checked={form.surchargeApplicable} onChange={e=>update('surchargeApplicable', e.target.checked)} /> Surcharge</label>
        <label className="flex items-center gap-2 text-xs mt-5"><input type="checkbox" checked={form.cessApplicable} onChange={e=>update('cessApplicable', e.target.checked)} /> Cess</label>
        <label className="flex flex-col text-xs gap-1">Threshold
          <input type="number" step="0.01" value={form.thresholdAmount ?? ''} onChange={e=>update('thresholdAmount', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Rate Individual
          <input type="number" step="0.001" value={form.rateIndividual ?? ''} onChange={e=>update('rateIndividual', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Rate Company
          <input type="number" step="0.001" value={form.rateCompany ?? ''} onChange={e=>update('rateCompany', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Rate With PAN
          <input type="number" step="0.001" value={form.rateWithPan ?? ''} onChange={e=>update('rateWithPan', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
        <label className="flex flex-col text-xs gap-1">Rate Without PAN
          <input type="number" step="0.001" value={form.rateWithoutPan ?? ''} onChange={e=>update('rateWithoutPan', e.target.value)} className="input input-sm border px-2 py-1 rounded" />
        </label>
      </div>
      <label className="flex flex-col text-xs gap-1">Description
        <textarea value={form.description} onChange={e=>update('description', e.target.value)} className="border rounded p-2 text-xs h-20" />
      </label>
      <div className="flex gap-2 justify-end">
        {form.id && <button type="button" onClick={reset} className="px-3 py-1 rounded border text-xs">Cancel</button>}
        <button type="submit" disabled={loading} className="px-4 py-1 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">{loading ? (form.id ? 'Updating...' : 'Saving...') : (form.id ? 'Update Section' : 'Add Section')}</button>
      </div>
    </form>
  );
};
