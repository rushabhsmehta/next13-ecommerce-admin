import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthenticated', { status: 403 });

    const body = await req.json();
    const {
      sectionCode,
      description,
      thresholdAmount,
      rateIndividual,
      rateCompany,
      rateWithPan,
      rateWithoutPan,
      effectiveFrom,
      effectiveTo,
      isIncomeTaxTds = true,
      isGstTds = false,
      surchargeApplicable = false,
      cessApplicable = false,
    } = body;

    if (!sectionCode) return new NextResponse('sectionCode is required', { status: 400 });
    if (!effectiveFrom) return new NextResponse('effectiveFrom is required', { status: 400 });

    const tds = await prismadb.tDSMaster.create({
      data: {
        sectionCode,
        description,
        thresholdAmount: thresholdAmount ?? null,
        rateIndividual: rateIndividual ?? null,
        rateCompany: rateCompany ?? null,
        rateWithPan: rateWithPan ?? null,
        rateWithoutPan: rateWithoutPan ?? null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isIncomeTaxTds,
        isGstTds,
        surchargeApplicable,
        cessApplicable,
      }
    });

    return NextResponse.json(tds);
  } catch (error) {
    console.error('[TDS_SECTIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function GET() {
  try {
    const sections = await prismadb.tDSMaster.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
    return NextResponse.json(sections);
  } catch (error) {
    console.error('[TDS_SECTIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
