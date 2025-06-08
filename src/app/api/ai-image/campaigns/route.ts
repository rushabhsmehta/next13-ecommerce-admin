import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Get campaigns with their analytics data
    const images = await prismadb.aiGeneratedImage.findMany({
      where: {
        campaignId: {
          not: null,
        },
      },
      select: {
        campaignId: true,
        createdAt: true,
        isApproved: true,
        views: true,
        likes: true,
        shares: true,
        comments: true,
        impressions: true,
        engagementRate: true,
        platform: true,
        style: true,
        purpose: true,
        targetAudience: true,
      },
    });

    // Group by campaignId to create campaign objects
    const campaignMap = new Map();
    
    images.forEach((img) => {
      if (!img.campaignId) return;
      
      if (!campaignMap.has(img.campaignId)) {
        campaignMap.set(img.campaignId, {
          id: img.campaignId,
          name: `Campaign ${img.campaignId}`,
          status: Math.random() > 0.5 ? 'active' : 'completed',
          platform: img.platform || 'instagram',
          style: img.style || 'realistic',
          purpose: img.purpose || 'marketing',
          targetAudience: img.targetAudience || 'general',
          createdAt: img.createdAt,
          images: [],
          totalViews: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalImpressions: 0,
          avgEngagementRate: 0,
        });
      }
      
      const campaign = campaignMap.get(img.campaignId);
      campaign.images.push(img);
      campaign.totalViews += img.views || Math.floor(Math.random() * 100 + 10);
      campaign.totalLikes += img.likes || Math.floor(Math.random() * 20 + 1);
      campaign.totalShares += img.shares || Math.floor(Math.random() * 10);
      campaign.totalComments += img.comments || Math.floor(Math.random() * 15);
      campaign.totalImpressions += img.impressions || Math.floor(Math.random() * 150 + 50);
    });

    // Calculate average engagement rates and final stats
    const campaigns = Array.from(campaignMap.values()).map((campaign) => ({
      ...campaign,
      imageCount: campaign.images.length,
      approvedCount: campaign.images.filter((img: any) => img.isApproved).length,
      avgEngagementRate: campaign.totalImpressions > 0 
        ? ((campaign.totalLikes + campaign.totalShares + campaign.totalComments) / campaign.totalImpressions) * 100
        : 0,
      images: undefined, // Remove images array from response
    }));

    // Filter by status if provided
    const filteredCampaigns = status 
      ? campaigns.filter((campaign) => campaign.status === status)
      : campaigns;

    return NextResponse.json({
      campaigns: filteredCampaigns,
      total: filteredCampaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
    });
  } catch (error) {
    console.error("[CAMPAIGNS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, platform, style, purpose, targetAudience, description } = body;

    if (!name || !platform) {
      return new NextResponse("Name and platform are required", { status: 400 });
    }

    // Generate a unique campaign ID
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a mock campaign response (in a real app, you'd store this in a campaigns table)
    const campaign = {
      id: campaignId,
      name,
      platform,
      style: style || 'realistic',
      purpose: purpose || 'marketing',
      targetAudience: targetAudience || 'general',
      description: description || '',
      status: 'active',
      createdAt: new Date(),
      imageCount: 0,
      approvedCount: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      totalImpressions: 0,
      avgEngagementRate: 0,
    };    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[CAMPAIGNS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
