import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb"; // Adjust import path if needed

export async function GET(req: Request) {
  try {
    const { userId } = auth();

    // Optional: Allow unauthenticated access if needed for specific use cases,
    // but generally admin features should be protected.
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch all approved AI-generated images, ordered by creation date
    const images = await prismadb.aiGeneratedImage.findMany({
      where: {
        isApproved: true, // Optionally filter by isApproved or add query params
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(images);

  } catch (error) {
    console.error('[AI_IMAGES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
