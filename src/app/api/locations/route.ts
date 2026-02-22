import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();    const {
      label,
      imageUrl,
      tags,
      slug,
      inclusions,
      exclusions,
      importantNotes,
      paymentPolicy,
      usefulTip,
      cancellationPolicy,
      airlineCancellationPolicy,
      termsconditions,
      kitchenGroupPolicy,
    } = body;

    // Validation
    if (!label) return new NextResponse("Label is required", { status: 400 });
    if (!imageUrl) return new NextResponse("Image URL is required", { status: 400 });    // Ensure list fields are valid arrays or convert strings to arrays
    const processedInclusions = Array.isArray(inclusions) ? inclusions : inclusions ? [inclusions] : [];
    const processedExclusions = Array.isArray(exclusions) ? exclusions : exclusions ? [exclusions] : [];
    const processedImportantNotes = Array.isArray(importantNotes) ? importantNotes : importantNotes ? [importantNotes] : [];
    const processedPaymentPolicy = Array.isArray(paymentPolicy) ? paymentPolicy : paymentPolicy ? [paymentPolicy] : [];
    const processedUsefulTip = Array.isArray(usefulTip) ? usefulTip : usefulTip ? [usefulTip] : [];
    const processedCancellationPolicy = Array.isArray(cancellationPolicy) ? cancellationPolicy : cancellationPolicy ? [cancellationPolicy] : [];
    const processedAirlineCancellationPolicy = Array.isArray(airlineCancellationPolicy) ? airlineCancellationPolicy : airlineCancellationPolicy ? [airlineCancellationPolicy] : [];
    const processedTermsConditions = Array.isArray(termsconditions) ? termsconditions : termsconditions ? [termsconditions] : [];
    const processedKitchenGroupPolicy = Array.isArray(kitchenGroupPolicy) ? kitchenGroupPolicy : kitchenGroupPolicy ? [kitchenGroupPolicy] : [];    // Create new location entry
    const location = await prismadb.location.create({
      data: {
        label,
        imageUrl,
        tags,
        slug,
        inclusions: processedInclusions,
        exclusions: processedExclusions,
        importantNotes: processedImportantNotes,
        paymentPolicy: processedPaymentPolicy,
        usefulTip: processedUsefulTip,        cancellationPolicy: processedCancellationPolicy,
        airlineCancellationPolicy: processedAirlineCancellationPolicy,
        termsconditions: processedTermsConditions,
        kitchenGroupPolicy: processedKitchenGroupPolicy,
      } as any,
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[LOCATIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {    // Fetch all locations with all fields
    const locations = await prismadb.location.findMany();

    return NextResponse.json(locations);
  } catch (error) {
    console.log("[LOCATIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

