export type TdsType = 'INCOME_TAX' | 'GST';

export function computeBaseAmount(gross: number, gstComponent: number, tdsType: string) {
  if (!gross || gross <= 0) return 0;
  return tdsType === 'GST' ? gross - (gstComponent || 0) : gross;
}

export function getFinancialYear(d: Date) {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
}

export function getQuarter(d: Date) {
  const m = d.getMonth();
  if (m < 3) return 'Q4';
  if (m < 6) return 'Q1';
  if (m < 9) return 'Q2';
  return 'Q3';
}

export function calcTdsAmount(base: number, rate: number) {
  return +((base * (rate / 100)).toFixed(2));
}

export function pickApplicableRate(opts: any) {
  const {
    overrideRate,
    supplierLowerRate,
    supplierLowerValidFrom,
    supplierLowerValidTo,
    tdsMaster,
    supplierHasPan,
    onDate
  } = opts;
  if (overrideRate != null) return overrideRate;
  if (supplierLowerRate && onDate && supplierLowerValidFrom && supplierLowerValidTo) {
    const od = new Date(onDate);
    if (od >= new Date(supplierLowerValidFrom) && od <= new Date(supplierLowerValidTo)) return supplierLowerRate;
  }
  if (tdsMaster) {
    if (supplierHasPan && tdsMaster.rateWithPan != null) return tdsMaster.rateWithPan;
    if (!supplierHasPan && tdsMaster.rateWithoutPan != null) return tdsMaster.rateWithoutPan;
    if (tdsMaster.rateIndividual != null) return tdsMaster.rateIndividual;
    if (tdsMaster.rateCompany != null) return tdsMaster.rateCompany;
  }
  return null;
}
