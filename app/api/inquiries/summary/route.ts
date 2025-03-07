import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const inquirySummary = await prismadb.inquiry.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const totalInquiries = await prismadb.inquiry.count();

    return NextResponse.json({
      summary: inquirySummary,
      total: totalInquiries
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}