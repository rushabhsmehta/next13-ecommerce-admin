import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import fetch from 'node-fetch';

/**
 * Social Media Service for handling image sharing to different platforms
 */

// Initialize Twitter client
export const getTwitterClient = () => {
  const appKey = process.env.X_API_KEY || '';
  const appSecret = process.env.X_API_SECRET_KEY || '';
  const accessToken = process.env.X_ACCESS_TOKEN || '';
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET || '';

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials are not configured.');
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
};

// Download image as Buffer
export const downloadImage = async (url: string): Promise<Buffer> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

// Share to Twitter/X
export const shareToTwitter = async (imageUrl: string, text: string): Promise<string> => {
  try {
    const client = getTwitterClient();
    const imageBuffer = await downloadImage(imageUrl);
    
    // Upload the media
    const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' });
    
    // Create the tweet with the media
    const tweet = await client.v2.tweet({
      text,
      media: { media_ids: [mediaId] },
    });
    
    return tweet.data.id;
  } catch (error) {
    console.error('Error sharing to Twitter/X:', error);
    throw error;
  }
};

// Share to Facebook
export const shareToFacebook = async (
  imageUrl: string, 
  caption: string
): Promise<string> => {
  try {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    if (!accessToken || !pageId) {
      throw new Error('Facebook credentials are not configured');
    }

    // Using Facebook Graph API
    const apiUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`;
    const response = await axios.post(apiUrl, {
      url: imageUrl, // Facebook can download from URL directly
      caption,
      access_token: accessToken,
    });

    return response.data.id;
  } catch (error) {
    console.error('Error sharing to Facebook:', error);
    throw error;
  }
};

// Share to Instagram (requires Facebook Business API integration)
export const shareToInstagram = async (
  imageUrl: string, 
  caption: string
): Promise<string> => {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    
    if (!accessToken || !igUserId) {
      throw new Error('Instagram credentials are not configured');
    }

    // Step 1: Create a container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }
    );
    
    const containerId = containerResponse.data.id;
    
    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        creation_id: containerId,
        access_token: accessToken,
      }
    );

    return publishResponse.data.id;
  } catch (error) {
    console.error('Error sharing to Instagram:', error);
    throw error;
  }
};

// Share to LinkedIn
export const shareToLinkedIn = async (
  imageUrl: string,
  text: string
): Promise<string> => {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('LinkedIn API credentials are not configured');
    }

    // LinkedIn requires a more complex flow with URNs
    // This is a simplified version and would need to be expanded with proper asset registration
    const authorUrn = process.env.LINKEDIN_AUTHOR_URN; // person or organization URN
    
    // Register the image as an asset
    const registerImageResponse = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    // The rest of LinkedIn posting implementation...
    // This would include uploading to the provided upload URL and then creating the share
    
    return "linkedin-post-id"; // Actual implementation would return the real post ID
  } catch (error) {
    console.error('Error sharing to LinkedIn:', error);
    throw error;
  }
};

// Share to Pinterest
export const shareToPinterest = async (
  imageUrl: string,
  description: string,
  link: string = 'https://yourwebsite.com'
): Promise<string> => {
  try {
    const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
    const boardId = process.env.PINTEREST_BOARD_ID;
    
    if (!accessToken || !boardId) {
      throw new Error('Pinterest API credentials are not configured');
    }

    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      {
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: imageUrl
        },
        description,
        link
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data.id;
  } catch (error) {
    console.error('Error sharing to Pinterest:', error);
    throw error;
  }
};

// Share to WhatsApp Business
export const shareToWhatsAppBusiness = async (
  imageUrl: string,
  caption: string,
  phoneNumber: string
): Promise<string> => {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp API credentials are not configured');
    }

    // WhatsApp Cloud API endpoint
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await axios.post(
      apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data.messages[0].id;
  } catch (error) {
    console.error('Error sharing to WhatsApp Business:', error);
    throw error;
  }
};
