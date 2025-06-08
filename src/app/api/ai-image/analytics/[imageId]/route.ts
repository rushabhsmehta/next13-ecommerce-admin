import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.imageId) {
      return new NextResponse("Image ID is required", { status: 400 });
    }

    // Get the image with analytics data
    const image = await prismadb.aiGeneratedImage.findFirst({
      where: {
        id: params.imageId,
      },
      select: {
        id: true,
        prompt: true,
        generatedImageUrl: true,
        platform: true,
        purpose: true,
        style: true,
        views: true,
        likes: true,
        shares: true,
        comments: true,
        impressions: true,
        clickThroughRate: true,
        engagementRate: true,
        createdAt: true,
        updatedAt: true,
        campaignId: true,
        version: true,
        isTestVariant: true,
      },
    });

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Calculate additional analytics
    const analytics = {
      ...image,
      totalEngagements: image.likes + image.shares + image.comments,
      impressionRate: image.impressions > 0 ? (image.views / image.impressions) * 100 : 0,
      shareRate: image.views > 0 ? (image.shares / image.views) * 100 : 0,
      likeRate: image.views > 0 ? (image.likes / image.views) * 100 : 0,
      commentRate: image.views > 0 ? (image.comments / image.views) * 100 : 0,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[IMAGE_ANALYTICS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.imageId) {
      return new NextResponse("Image ID is required", { status: 400 });
    }    const body = await req.json();
    const { 
      views, 
      likes, 
      shares, 
      comments, 
      impressions, 
      clickThroughRate, 
      engagementRate 
    } = body;

    // Verify the image exists (no userId check as this might be called by social media webhooks)
    const existingImage = await prismadb.aiGeneratedImage.findFirst({
      where: {
        id: params.imageId,
      },
    });

    if (!existingImage) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Update the analytics data
    const updatedImage = await prismadb.aiGeneratedImage.update({
      where: {
        id: params.imageId,
      },
      data: {
        views: views !== undefined ? views : existingImage.views,
        likes: likes !== undefined ? likes : existingImage.likes,
        shares: shares !== undefined ? shares : existingImage.shares,
        comments: comments !== undefined ? comments : existingImage.comments,
        impressions: impressions !== undefined ? impressions : existingImage.impressions,
        clickThroughRate: clickThroughRate !== undefined ? clickThroughRate : existingImage.clickThroughRate,
        engagementRate: engagementRate !== undefined ? engagementRate : existingImage.engagementRate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error("[IMAGE_ANALYTICS_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
