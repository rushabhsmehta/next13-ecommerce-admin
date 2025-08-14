import prismadb from '@/lib/prismadb';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { tdsColumns, TdsRow } from './components/columns';
// import TdsClient from './tds-client';
const TdsClient = (require('./tds-client') as any).default;

const TdsSettingsPage = async () => {
  const sections = await (prismadb as any).tDSMaster.findMany({ orderBy: { effectiveFrom: 'desc' } });
  const rows: TdsRow[] = sections.map((s: any) => ({
    id: s.id,
    sectionCode: s.sectionCode,
    description: s.description,
    thresholdAmount: s.thresholdAmount,
    rateIndividual: s.rateIndividual,
    rateCompany: s.rateCompany,
    rateWithPan: s.rateWithPan,
    rateWithoutPan: s.rateWithoutPan,
    effectiveFrom: s.effectiveFrom?.toISOString?.() || s.effectiveFrom,
    effectiveTo: s.effectiveTo ? (s.effectiveTo?.toISOString?.() || s.effectiveTo) : null,
    isIncomeTaxTds: s.isIncomeTaxTds,
    isGstTds: s.isGstTds,
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Heading title="TDS Settings" description="Manage TDS sections (Income Tax & GST)" />
        <Separator />
        <TdsClient initialRows={rows} />
      </div>
    </div>
  );
};

export default TdsSettingsPage;
