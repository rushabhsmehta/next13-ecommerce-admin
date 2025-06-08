import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// Mock social media API clients
const mockSocialMediaAPI = {
  instagram: {
    async post(imageUrl: string, caption: string) {
      // Mock Instagram API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        postId: `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://instagram.com/p/${Math.random().toString(36).substr(2, 9)}`,
        platform: 'instagram',
        status: 'posted',
      };
    },
    async getAnalytics(postId: string) {
      // Mock Instagram analytics
      return {
        views: Math.floor(Math.random() * 1000 + 100),
        likes: Math.floor(Math.random() * 200 + 20),
        comments: Math.floor(Math.random() * 50 + 5),
        shares: Math.floor(Math.random() * 30 + 3),
        impressions: Math.floor(Math.random() * 1500 + 200),
        reach: Math.floor(Math.random() * 800 + 150),
      };
    }
  },
  twitter: {
    async post(imageUrl: string, caption: string) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        postId: `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://twitter.com/user/status/${Math.random().toString().substr(2, 18)}`,
        platform: 'twitter',
        status: 'posted',
      };
    },
    async getAnalytics(postId: string) {
      return {
        views: Math.floor(Math.random() * 2000 + 200),
        likes: Math.floor(Math.random() * 100 + 10),
        comments: Math.floor(Math.random() * 25 + 2),
        retweets: Math.floor(Math.random() * 40 + 4),
        impressions: Math.floor(Math.random() * 3000 + 300),
        engagements: Math.floor(Math.random() * 150 + 15),
      };
    }
  },
  linkedin: {
    async post(imageUrl: string, caption: string) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        postId: `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://linkedin.com/posts/activity-${Math.random().toString().substr(2, 18)}`,
        platform: 'linkedin',
        status: 'posted',
      };
    },
    async getAnalytics(postId: string) {
      return {
        views: Math.floor(Math.random() * 500 + 50),
        likes: Math.floor(Math.random() * 80 + 8),
        comments: Math.floor(Math.random() * 20 + 2),
        shares: Math.floor(Math.random() * 15 + 1),
        impressions: Math.floor(Math.random() * 800 + 80),
        clicks: Math.floor(Math.random() * 30 + 3),
      };
    }
  },
  pinterest: {
    async post(imageUrl: string, caption: string) {
      await new Promise(resolve => setTimeout(resolve, 900));
      return {
        postId: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://pinterest.com/pin/${Math.random().toString().substr(2, 18)}`,
        platform: 'pinterest',
        status: 'posted',
      };
    },
    async getAnalytics(postId: string) {
      return {
        views: Math.floor(Math.random() * 800 + 80),
        saves: Math.floor(Math.random() * 60 + 6),
        comments: Math.floor(Math.random() * 15 + 1),
        clicks: Math.floor(Math.random() * 40 + 4),
        impressions: Math.floor(Math.random() * 1200 + 120),
        engagements: Math.floor(Math.random() * 100 + 10),
      };
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { imageId, platforms, caption, scheduleTime } = body;

    if (!imageId || !platforms || platforms.length === 0) {
      return new NextResponse("Image ID and platforms are required", { status: 400 });
    }

    // Get the image from database
    const image = await prismadb.aiGeneratedImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    if (!image.isApproved) {
      return new NextResponse("Image must be approved before posting", { status: 400 });
    }

    const postResults = [];

    // Post to each platform
    for (const platform of platforms) {
      if (!mockSocialMediaAPI[platform as keyof typeof mockSocialMediaAPI]) {
        postResults.push({
          platform,
          status: 'error',
          error: 'Platform not supported',
        });
        continue;
      }

      try {
        // If scheduleTime is provided, this would normally schedule the post
        if (scheduleTime) {
          postResults.push({
            platform,
            status: 'scheduled',
            scheduledFor: scheduleTime,
            message: `Post scheduled for ${new Date(scheduleTime).toLocaleString()}`,
          });
          continue;
        }

        // Post immediately
        const result = await mockSocialMediaAPI[platform as keyof typeof mockSocialMediaAPI].post(
          image.generatedImageUrl, 
          caption || image.prompt
        );

        // Update the image record with the post ID
        const updateData: any = {};
        switch (platform) {
          case 'instagram':
            updateData.instagramPostId = result.postId;
            break;
          case 'twitter':
            updateData.xPostId = result.postId;
            break;
          case 'linkedin':
            updateData.linkedInPostId = result.postId;
            break;
          case 'pinterest':
            updateData.pinterestPinId = result.postId;
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await prismadb.aiGeneratedImage.update({
            where: { id: imageId },
            data: {
              ...updateData,
              platform: platform,
            },
          });
        }

        postResults.push({
          platform,
          status: 'posted',
          postId: result.postId,
          url: result.url,
          message: `Successfully posted to ${platform}`,
        });

      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        postResults.push({
          platform,
          status: 'error',
          error: `Failed to post to ${platform}`,
        });
      }
    }

    return NextResponse.json({
      imageId,
      results: postResults,
      totalPlatforms: platforms.length,
      successfulPosts: postResults.filter(r => r.status === 'posted').length,
      scheduledPosts: postResults.filter(r => r.status === 'scheduled').length,
      errors: postResults.filter(r => r.status === 'error').length,
    });
  } catch (error) {
    console.error("[SOCIAL_MEDIA_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");
    const platform = searchParams.get("platform");
    const action = searchParams.get("action");

    if (action === "analytics" && imageId) {
      // Get analytics for a specific image across all platforms
      const image = await prismadb.aiGeneratedImage.findUnique({
        where: { id: imageId },
        select: {
          id: true,
          xPostId: true,
          instagramPostId: true,
          linkedInPostId: true,
          pinterestPinId: true,
          platform: true,
        },
      });

      if (!image) {
        return new NextResponse("Image not found", { status: 404 });
      }

      const analyticsData: any = {};

      // Get analytics from each platform where the image was posted
      if (image.instagramPostId) {
        try {
          analyticsData.instagram = await mockSocialMediaAPI.instagram.getAnalytics(image.instagramPostId);
          analyticsData.instagram.postId = image.instagramPostId;
        } catch (error) {
          analyticsData.instagram = { error: "Failed to fetch Instagram analytics" };
        }
      }

      if (image.xPostId) {
        try {
          analyticsData.twitter = await mockSocialMediaAPI.twitter.getAnalytics(image.xPostId);
          analyticsData.twitter.postId = image.xPostId;
        } catch (error) {
          analyticsData.twitter = { error: "Failed to fetch Twitter analytics" };
        }
      }

      if (image.linkedInPostId) {
        try {
          analyticsData.linkedin = await mockSocialMediaAPI.linkedin.getAnalytics(image.linkedInPostId);
          analyticsData.linkedin.postId = image.linkedInPostId;
        } catch (error) {
          analyticsData.linkedin = { error: "Failed to fetch LinkedIn analytics" };
        }
      }

      if (image.pinterestPinId) {
        try {
          analyticsData.pinterest = await mockSocialMediaAPI.pinterest.getAnalytics(image.pinterestPinId);
          analyticsData.pinterest.postId = image.pinterestPinId;
        } catch (error) {
          analyticsData.pinterest = { error: "Failed to fetch Pinterest analytics" };
        }
      }

      return NextResponse.json({
        imageId,
        analytics: analyticsData,
        summary: {
          totalPlatforms: Object.keys(analyticsData).length,
          totalViews: Object.values(analyticsData).reduce((sum: number, data: any) => 
            sum + (data.views || 0), 0),
          totalEngagements: Object.values(analyticsData).reduce((sum: number, data: any) => 
            sum + ((data.likes || 0) + (data.comments || 0) + (data.shares || data.retweets || data.saves || 0)), 0),
        },
      });
    }

    // Get all posted images with their social media status
    const images = await prismadb.aiGeneratedImage.findMany({
      where: {
        OR: [
          { xPostId: { not: null } },
          { instagramPostId: { not: null } },
          { linkedInPostId: { not: null } },
          { pinterestPinId: { not: null } },
        ],
      },
      select: {
        id: true,
        prompt: true,
        generatedImageUrl: true,
        isApproved: true,
        createdAt: true,
        xPostId: true,
        instagramPostId: true,
        linkedInPostId: true,
        pinterestPinId: true,
        platform: true,
        views: true,
        likes: true,
        shares: true,
        comments: true,
        impressions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const socialMediaPosts = images.map((image) => {
      const platforms = [];
      if (image.instagramPostId) platforms.push('instagram');
      if (image.xPostId) platforms.push('twitter');
      if (image.linkedInPostId) platforms.push('linkedin');
      if (image.pinterestPinId) platforms.push('pinterest');

      return {
        ...image,
        platforms,
        totalPlatforms: platforms.length,
        hasAnalytics: platforms.length > 0,
      };
    });

    // Filter by platform if specified
    const filteredPosts = platform 
      ? socialMediaPosts.filter((post) => post.platforms.includes(platform))
      : socialMediaPosts;

    return NextResponse.json({
      posts: filteredPosts,
      total: filteredPosts.length,
      platformBreakdown: {
        instagram: socialMediaPosts.filter(p => p.platforms.includes('instagram')).length,
        twitter: socialMediaPosts.filter(p => p.platforms.includes('twitter')).length,
        linkedin: socialMediaPosts.filter(p => p.platforms.includes('linkedin')).length,
        pinterest: socialMediaPosts.filter(p => p.platforms.includes('pinterest')).length,
      },
    });
  } catch (error) {
    console.error("[SOCIAL_MEDIA_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}