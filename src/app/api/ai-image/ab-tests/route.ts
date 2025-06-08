import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch AB tests from database
    const abTests = await prismadb.aiGeneratedImage.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        prompt: true,
        generatedImageUrl: true,
        createdAt: true,
        // Add AB test specific fields when schema is updated
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(abTests);
  } catch (error) {
    console.log('[AB_TESTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    // Handle AB test creation logic here
    
    return NextResponse.json({ message: "AB test endpoint - implementation pending" });
  } catch (error) {
    console.log('[AB_TESTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}