import prismadb from '@/lib/prismadb';

export type TdsType = 'INCOME_TAX' | 'GST';

export function getFinancialYear(date = new Date()): string {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-12
  // FY in India: Apr (4) - Mar (3)
  if (month >= 4) return `${year}-${(year + 1).toString().slice(-2)}`;
  return `${year - 1}-${year.toString().slice(-2)}`;
}

export function getQuarter(date = new Date()): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = new Date(date).getUTCMonth() + 1;
  if (m >= 4 && m <= 6) return 'Q1';
  if (m >= 7 && m <= 9) return 'Q2';
  if (m >= 10 && m <= 12) return 'Q3';
  return 'Q4'; // Jan-Mar
}

export function computeBaseAmount(priceExclGst: number, gstAmount: number | null | undefined, tdsType: TdsType): number {
  const p = Number(priceExclGst || 0);
  const g = Number(gstAmount || 0);
  if (tdsType === 'GST') return Number((p + g).toFixed(2));
  return Number(p.toFixed(2));
}

export function pickApplicableRate(params: {
  tdsType: TdsType;
  overrideRate?: number | null;
  supplierHasPan?: boolean;
  supplierLowerRate?: number | null;
  supplierLowerValidFrom?: Date | null;
  supplierLowerValidTo?: Date | null;
  tdsMaster?: {
    rateWithPan?: number | null;
    rateWithoutPan?: number | null;
    rateIndividual?: number | null;
    rateCompany?: number | null;
    isIncomeTaxTds: boolean;
    isGstTds: boolean;
  } | null;
  onDate?: Date;
}): number | null {
  const now = params.onDate || new Date();
  if (params.overrideRate != null) return Number(params.overrideRate);

  // Lower/NIL deduction certificate takes precedence when valid
  if (
    params.supplierLowerRate != null &&
    params.supplierLowerValidFrom &&
    params.supplierLowerValidTo &&
    now >= params.supplierLowerValidFrom &&
    now <= params.supplierLowerValidTo
  ) {
    return Number(params.supplierLowerRate);
  }

  const m = params.tdsMaster;
  if (!m) return null;

  // Prefer PAN-aware rates when available
  if (params.supplierHasPan && m.rateWithPan != null) return Number(m.rateWithPan);
  if (!params.supplierHasPan && m.rateWithoutPan != null) return Number(m.rateWithoutPan);

  // Fallback to individual/company generic rates
  if (m.rateIndividual != null) return Number(m.rateIndividual);
  if (m.rateCompany != null) return Number(m.rateCompany);

  return null;
}

export function calcTdsAmount(baseAmount: number, ratePercent: number): number {
  return Number(((baseAmount * ratePercent) / 100).toFixed(2));
}
