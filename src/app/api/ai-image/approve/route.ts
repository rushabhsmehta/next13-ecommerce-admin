import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb"; // Adjust import path if needed

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { generatedImageUrl, prompt, referenceImageUrl } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!generatedImageUrl || !prompt) {
      return new NextResponse("Missing required fields (generatedImageUrl, prompt)", { status: 400 });
    }

    // Save the approved image details to the database
    const newImageRecord = await prismadb.aiGeneratedImage.create({
      data: {
        prompt: prompt,
        referenceImageUrl: referenceImageUrl, // Will be null if not provided
        generatedImageUrl: generatedImageUrl,
        isApproved: true, // Mark as approved
        // Add user association if needed: userId: userId
      },
    });

    // TODO: Optional - Trigger background job for social media sharing here
    // Example: await triggerSocialMediaShare(newImageRecord.id);

    return NextResponse.json(newImageRecord);

  } catch (error) {
    console.error('[AI_IMAGE_APPROVE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
