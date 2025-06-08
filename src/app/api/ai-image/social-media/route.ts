import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// Define our own enums temporarily until Prisma client is updated
enum SocialMediaPlatform {
  TWITTER = 'TWITTER',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  LINKEDIN = 'LINKEDIN',
  PINTEREST = 'PINTEREST',
  WHATSAPP_BUSINESS = 'WHATSAPP_BUSINESS'
}

enum SocialMediaPostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  DELETED = 'DELETED'
}

// Temporary in-memory storage for connections (in production, this would be in database)
const connectionStore = new Map<string, Array<any>>();

// Mock social media API clients (for demonstration)
const mockSocialMediaAPI = {
  instagram: {
    async post(imageUrl: string, caption: string) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        postId: `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://instagram.com/p/${Math.random().toString(36).substr(2, 9)}`,
        platform: 'instagram',
        status: 'posted',
      };
    },
    async getAnalytics(postId: string) {
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
    const { action, platform, imageId, platforms, caption, scheduleTime } = body;    // Handle connection management
    if (action === 'connect_platform') {
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get or create user connections
      let userConnections = connectionStore.get(userId) || [
        { platform: 'instagram', connected: false },
        { platform: 'twitter', connected: false },
        { platform: 'linkedin', connected: false },
        { platform: 'facebook', connected: false },
      ];

      // Update the specific platform connection
      userConnections = userConnections.map(conn => 
        conn.platform === platform 
          ? {
              ...conn,
              connected: true,
              accountName: `@user_${platform}`,
              lastSync: new Date().toISOString(),
            }
          : conn
      );

      // Store updated connections
      connectionStore.set(userId, userConnections);
      
      const mockConnection = {
        platform,
        connected: true,
        accountName: `@user_${platform}`,
        lastSync: new Date().toISOString(),
        accessToken: `mock_token_${platform}`, // In real app, store securely
      };

      console.log(`Successfully connected to ${platform} for user ${userId}`);

      return NextResponse.json({
        success: true,
        connection: mockConnection,
        message: `Successfully connected to ${platform}`,
      });
    }    if (action === 'disconnect_platform') {
      // Get user connections
      let userConnections = connectionStore.get(userId) || [
        { platform: 'instagram', connected: false },
        { platform: 'twitter', connected: false },
        { platform: 'linkedin', connected: false },
        { platform: 'facebook', connected: false },
      ];

      // Update the specific platform connection
      userConnections = userConnections.map(conn => 
        conn.platform === platform 
          ? { ...conn, connected: false, accountName: undefined, lastSync: undefined }
          : conn
      );

      // Store updated connections
      connectionStore.set(userId, userConnections);

      console.log(`Successfully disconnected from ${platform} for user ${userId}`);

      return NextResponse.json({
        success: true,
        message: `Successfully disconnected from ${platform}`,
      });
    }

    // For posting actions, we need imageId and platforms
    if (!action || (action !== 'connect_platform' && action !== 'disconnect_platform')) {
      if (!imageId || !platforms || platforms.length === 0) {
        return new NextResponse("Image ID and platforms are required", { status: 400 });
      }
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
      }      try {
        // Check if user has connection to this platform (from memory store)
        const userConnections = connectionStore.get(userId) || [];
        const connection = userConnections.find(conn => 
          conn.platform === platform && conn.connected
        );

        if (!connection) {
          postResults.push({
            platform,
            status: 'error',
            error: `Not connected to ${platform}`,
          });
          continue;
        }

        // If scheduleTime is provided, this would normally schedule the post
        if (scheduleTime) {
          postResults.push({
            platform,
            status: 'scheduled',
            scheduledFor: scheduleTime,
            message: `Post scheduled for ${new Date(scheduleTime).toLocaleString()}`,
          });
          continue;
        }        // Post immediately
        const result = await mockSocialMediaAPI[platform as keyof typeof mockSocialMediaAPI].post(
          image.generatedImageUrl, 
          caption || image.prompt
        );        // Create social media post record
        const socialMediaPost = await prismadb.socialMediaPost.create({
          data: {
            aiGeneratedImageId: image.id,
            socialMediaConnectionId: connection.id,
            platform: platform as SocialMediaPlatform,
            platformPostId: result.postId,
            caption: caption || image.prompt,
            postUrl: result.url,
            status: SocialMediaPostStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        // Update the image record with the post ID (for backward compatibility)
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
          socialMediaPostId: socialMediaPost.id,
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

    // Handle get_connections request
    if (action === "get_connections") {
      // Get user connections from database
      const connections = await prismadb.socialMediaConnection.findMany({
        where: {
          userId,
        },
        orderBy: {
          platform: 'asc',
        },
      });

      // Create a complete list with all platforms
      const allPlatforms = ['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'FACEBOOK'];
      const userConnections = allPlatforms.map(platformName => {
        const connection = connections.find(c => c.platform === platformName);
        return {
          platform: platformName.toLowerCase(),
          connected: connection?.isActive || false,
          accountName: connection?.platformUsername,
          lastSync: connection?.lastSyncAt?.toISOString(),
          id: connection?.id,
        };
      });

      console.log(`Fetching connections for user ${userId}:`, userConnections);

      return NextResponse.json({
        connections: userConnections,
        totalConnections: userConnections.filter(c => c.connected).length,
      });
    }

    if (action === "get_posts") {
      // Get actual posts from database
      const posts = await prismadb.socialMediaPost.findMany({
        where: {
          socialMediaConnection: {
            userId,
          },
        },
        include: {
          aiGeneratedImage: {
            select: {
              id: true,
              prompt: true,
              generatedImageUrl: true,
            },
          },
          socialMediaConnection: {
            select: {
              platform: true,
              platformUsername: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Limit to recent posts
      });

      const formattedPosts = posts.map(post => ({
        id: post.id,
        platform: post.platform.toLowerCase(),
        content: post.caption,
        status: post.status.toLowerCase(),
        postedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
        imageUrl: post.aiGeneratedImage.generatedImageUrl,
        postUrl: post.postUrl,
        metrics: {
          views: post.views,
          likes: post.likes,
          shares: post.shares,
          comments: post.comments,
          impressions: post.impressions,
          engagementRate: post.engagementRate,
        },
      }));

      return NextResponse.json({
        posts: formattedPosts,
        total: formattedPosts.length,
      });
    }

    if (action === "analytics" && imageId) {
      // Get analytics for a specific image across all platforms
      const posts = await prismadb.socialMediaPost.findMany({
        where: {
          aiGeneratedImageId: imageId,
          socialMediaConnection: {
            userId,
          },
        },
        include: {
          socialMediaConnection: {
            select: {
              platform: true,
            },
          },
        },
      });

      const analyticsData: any = {};

      // Process each post
      for (const post of posts) {
        const platformName = post.socialMediaConnection.platform.toLowerCase();
        
        try {
          // Get fresh analytics from the platform API
          const platformAnalytics = await mockSocialMediaAPI[platformName as keyof typeof mockSocialMediaAPI]?.getAnalytics(post.platformPostId);
          
          analyticsData[platformName] = {
            ...platformAnalytics,
            postId: post.platformPostId,
            postUrl: post.postUrl,
            publishedAt: post.publishedAt,
          };          // Update the database with fresh metrics
          const updateData: any = {
            views: platformAnalytics?.views || post.views,
            comments: platformAnalytics?.comments || post.comments,
            impressions: platformAnalytics?.impressions || post.impressions,
            lastSyncAt: new Date(),
          };

          // Handle platform-specific analytics fields
          if ('likes' in platformAnalytics) {
            updateData.likes = platformAnalytics.likes;
          } else if ('saves' in platformAnalytics) {
            updateData.likes = platformAnalytics.saves; // Pinterest uses saves instead of likes
          } else {
            updateData.likes = post.likes;
          }

          if ('shares' in platformAnalytics) {
            updateData.shares = platformAnalytics.shares;
          } else if ('retweets' in platformAnalytics) {
            updateData.shares = platformAnalytics.retweets; // Twitter uses retweets
          } else if ('saves' in platformAnalytics) {
            updateData.shares = platformAnalytics.saves; // Pinterest uses saves
          } else {
            updateData.shares = post.shares;
          }

          await prismadb.socialMediaPost.update({
            where: { id: post.id },
            data: updateData,
          });
        } catch (error) {
          analyticsData[platformName] = { 
            error: `Failed to fetch ${platformName} analytics`,
            postId: post.platformPostId,
            postUrl: post.postUrl,
          };
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
        socialMediaPosts: {
          some: {
            socialMediaConnection: {
              userId,
            },
          },
        },
      },
      include: {
        socialMediaPosts: {
          include: {
            socialMediaConnection: {
              select: {
                platform: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const socialMediaPosts = images.map((image) => {
      const platforms = image.socialMediaPosts.map(post => 
        post.socialMediaConnection.platform.toLowerCase()
      );

      return {
        id: image.id,
        prompt: image.prompt,
        generatedImageUrl: image.generatedImageUrl,
        isApproved: image.isApproved,
        createdAt: image.createdAt,
        platforms,
        totalPlatforms: platforms.length,
        hasAnalytics: platforms.length > 0,
        views: image.views,
        likes: image.likes,
        shares: image.shares,
        comments: image.comments,
        impressions: image.impressions,
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
