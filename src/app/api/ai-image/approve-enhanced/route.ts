import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { 
      generatedImageUrl, 
      prompt, 
      referenceImageUrl, 
      enhancedPrompt,
      platform,
      purpose,
      targetAudience,
      style,
      colorScheme,
      metadata,
      suggestedCaptions,
      hashtags,
      bestPostingTimes,
      engagementTips,
      campaignId,
      brandGuidelines
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!generatedImageUrl || !prompt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Create comprehensive image record with all metadata
    const newImageRecord = await prismadb.aiGeneratedImage.create({
      data: {
        prompt: prompt,
        enhancedPrompt: enhancedPrompt || prompt,
        referenceImageUrl: referenceImageUrl,
        generatedImageUrl: generatedImageUrl,
        platform: platform,
        purpose: purpose,
        targetAudience: targetAudience,
        style: style,
        colorScheme: colorScheme,
        isApproved: true,
        userId: userId,
        campaignId: campaignId,
        
        // Metadata as JSON
        metadata: metadata || {},
        suggestedCaptions: suggestedCaptions || [],
        hashtags: hashtags || [],
        bestPostingTimes: bestPostingTimes || [],
        engagementTips: engagementTips || [],
        brandGuidelines: brandGuidelines || {},
        
        // Performance tracking
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
        impressions: 0,
        clickThroughRate: 0,
        engagementRate: 0,
        
        // A/B testing
        version: "A",
        isTestVariant: false,
      },
    });

    return NextResponse.json(newImageRecord);

  } catch (error) {
    console.error('[AI_IMAGE_APPROVE_ENHANCED]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
