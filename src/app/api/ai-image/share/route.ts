import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { 
  shareToTwitter, 
  shareToFacebook, 
  shareToInstagram, 
  shareToLinkedIn, 
  shareToPinterest,
  shareToWhatsAppBusiness
} from "@/lib/social-media";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { 
      aiGeneratedImageId, 
      platforms,   // Array of platforms to share to ['twitter', 'facebook', 'instagram', 'linkedin', 'pinterest', 'whatsapp']
      phoneNumber, // For WhatsApp sharing
      customText   // Optional custom text override
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!aiGeneratedImageId) {
      return new NextResponse("Missing required field (aiGeneratedImageId)", { status: 400 });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return new NextResponse("Please specify at least one platform to share to", { status: 400 });
    }

    // Fetch the approved image record
    const imageRecord = await prismadb.aiGeneratedImage.findUnique({
      where: {
        id: aiGeneratedImageId,
        isApproved: true, // Ensure it's approved
      },
    });

    if (!imageRecord) {
      return new NextResponse("Approved image record not found", { status: 404 });
    }    const { generatedImageUrl, prompt } = imageRecord;
    const shareText = customText || prompt || "Check out this AI-generated image!";
    
    // Define proper types for our objects
    interface ShareResult {
      success: boolean;
      postId?: string;
      messageId?: string;
      error?: string;
    }
    
    interface ShareResults {
      [key: string]: ShareResult;
    }
    
    interface Updates {
      [key: string]: string;
    }
    
    const shareResults: ShareResults = {}; // Store results for each platform
    const updates: Updates = {}; // For database updates

    // Share to selected platforms
    const sharePromises = platforms.map(async (platform) => {
      try {
        switch (platform.toLowerCase()) {
          case 'twitter':
          case 'x':
            const tweetId = await shareToTwitter(generatedImageUrl, shareText);
            shareResults.twitter = { success: true, postId: tweetId };
            updates['xPostId'] = tweetId;
            break;
            
          case 'facebook':
            const fbPostId = await shareToFacebook(generatedImageUrl, shareText);
            shareResults.facebook = { success: true, postId: fbPostId };
            // No specific field in database for Facebook posts yet
            break;
            
          case 'instagram':
            const igPostId = await shareToInstagram(generatedImageUrl, shareText);
            shareResults.instagram = { success: true, postId: igPostId };
            updates['instagramPostId'] = igPostId;
            break;
            
          case 'linkedin':
            const liPostId = await shareToLinkedIn(generatedImageUrl, shareText);
            shareResults.linkedin = { success: true, postId: liPostId };
            updates['linkedInPostId'] = liPostId;
            break;
            
          case 'pinterest':
            const pinId = await shareToPinterest(generatedImageUrl, shareText);
            shareResults.pinterest = { success: true, postId: pinId };
            updates['pinterestPinId'] = pinId;
            break;
            
          case 'whatsapp':
            if (!phoneNumber) {
              throw new Error("Phone number is required for WhatsApp sharing");
            }
            const msgId = await shareToWhatsAppBusiness(generatedImageUrl, shareText, phoneNumber);
            shareResults.whatsapp = { success: true, messageId: msgId };
            break;
            
          default:
            shareResults[platform] = { success: false, error: "Unsupported platform" };
        }      } catch (error: unknown) {
        console.error(`Error sharing to ${platform}:`, error);
        shareResults[platform] = { 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error occurred" 
        };
      }
    });

    // Wait for all sharing operations to complete
    await Promise.allSettled(sharePromises);

    // Update the database record with post IDs if any were successful
    if (Object.keys(updates).length > 0) {
      await prismadb.aiGeneratedImage.update({
        where: { id: aiGeneratedImageId },
        data: updates
      });
    }

    return NextResponse.json({ 
      message: "Sharing process completed", 
      results: shareResults 
    });
  } catch (error: unknown) {
    console.error('[AI_IMAGE_SHARE_POST]', error);
    return new NextResponse(JSON.stringify({
      error: "Failed to share image",
      details: error instanceof Error ? error.message : "Unknown error"
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
