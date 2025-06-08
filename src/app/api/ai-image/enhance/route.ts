import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, style, platform, purpose, targetAudience, colorScheme, aspectRatio = "1024x1024" } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // Check if we should use mock mode (for testing without valid OpenAI API key)
    const useMockMode = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('*****');

    if (useMockMode) {
      // Return mock data for testing
      const enhancedPrompt = generateEnhancedPrompt({
        basePrompt: prompt,
        style,
        platform,
        purpose,
        targetAudience,
        colorScheme
      });

      const mockImageUrl = "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2664&q=80";
      
      return NextResponse.json({ 
        imageUrl: mockImageUrl,
        enhancedPrompt,
        metadata: await generateImageMetadata(enhancedPrompt, platform, purpose),
        suggestedCaptions: await generateSuggestedCaptions(prompt, platform, targetAudience),
        hashtags: await generateHashtags(prompt, platform),
        bestPostingTimes: getBestPostingTimes(platform),
        engagementTips: getEngagementTips(platform),
        isMockData: true
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    }

    // Enhanced prompt engineering for social media optimization
    const enhancedPrompt = generateEnhancedPrompt({
      basePrompt: prompt,
      style,
      platform,
      purpose,
      targetAudience,
      colorScheme
    });    // Platform-specific image sizes (using OpenAI-supported dimensions)
    const platformSizes = {
      instagram: ["1024x1024", "1024x1792"], // Square, Portrait/Story
      facebook: ["1024x1024", "1792x1024"], // Post, Cover-like
      twitter: ["1792x1024", "1024x1024"], // Header-like, Post
      linkedin: ["1792x1024", "1024x1024"], // Article-like, Post
      pinterest: ["1024x1792"], // Vertical Pin
      youtube: ["1792x1024"], // Thumbnail-like
      tiktok: ["1024x1792"], // Vertical
      snapchat: ["1024x1792"], // Vertical
    };

    const selectedSize = platformSizes[platform as keyof typeof platformSizes]?.[0] || aspectRatio;

    // Validate that the selected size is supported by OpenAI
    const supportedSizes = ['1024x1024', '1024x1792', '1792x1024'];
    const finalSize = supportedSizes.includes(selectedSize) ? selectedSize : '1024x1024';    try {
      // Generate multiple variations for A/B testing
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: finalSize as "1024x1024" | "1024x1792" | "1792x1024",
        quality: "hd",
        style: style === "photorealistic" ? "natural" : "vivid",
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
        return new NextResponse("Image generation failed - no URL returned", { status: 500 });
      }

      // Generate additional metadata for the image
      const metadata = await generateImageMetadata(enhancedPrompt, platform, purpose);

      return NextResponse.json({ 
        imageUrl,
        enhancedPrompt,
        metadata,
        suggestedCaptions: await generateSuggestedCaptions(prompt, platform, targetAudience),
        hashtags: await generateHashtags(prompt, platform),
        bestPostingTimes: getBestPostingTimes(platform),
        engagementTips: getEngagementTips(platform)
      });

    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      
      if (error?.status === 429) {
        return new NextResponse(JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          details: error?.error?.message || "Rate limit error"
        }), { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      return new NextResponse(JSON.stringify({
        error: "Failed to generate enhanced image",
        details: error?.error?.message || error?.message || "Unknown error"
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    console.error('[AI_IMAGE_ENHANCE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

function generateEnhancedPrompt({
  basePrompt,
  style,
  platform,
  purpose,
  targetAudience,
  colorScheme
}: {
  basePrompt: string;
  style?: string;
  platform?: string;
  purpose?: string;
  targetAudience?: string;
  colorScheme?: string;
}) {
  let enhanced = basePrompt;

  // Add style modifiers
  const styleModifiers = {
    minimalist: "clean, minimalist design, simple composition, plenty of white space",
    vibrant: "vibrant colors, high energy, dynamic composition, eye-catching",
    professional: "professional, clean, corporate, polished, modern",
    artistic: "artistic, creative, unique perspective, expressive",
    photorealistic: "photorealistic, high detail, natural lighting, crisp focus",
    abstract: "abstract, conceptual, geometric, modern art style",
    vintage: "vintage style, retro colors, nostalgic feel, classic composition",
    futuristic: "futuristic, sci-fi, modern technology, sleek design"
  };

  if (style && styleModifiers[style as keyof typeof styleModifiers]) {
    enhanced += `, ${styleModifiers[style as keyof typeof styleModifiers]}`;
  }

  // Add platform-specific optimizations
  const platformOptimizations = {
    instagram: "Instagram-optimized, visually striking, mobile-friendly, square format friendly",
    facebook: "Facebook-optimized, engaging, shareable, community-focused",
    twitter: "Twitter-optimized, attention-grabbing, conversation-starting",
    linkedin: "LinkedIn-optimized, professional, business-focused, thought-provoking",
    pinterest: "Pinterest-optimized, inspirational, lifestyle-focused, vertically oriented",
    youtube: "YouTube thumbnail-optimized, bold text-friendly, high contrast",
    tiktok: "TikTok-optimized, trendy, youth-focused, vertical format",
    snapchat: "Snapchat-optimized, fun, casual, story-friendly"
  };

  if (platform && platformOptimizations[platform as keyof typeof platformOptimizations]) {
    enhanced += `, ${platformOptimizations[platform as keyof typeof platformOptimizations]}`;
  }

  // Add purpose-driven elements
  const purposeModifiers = {
    marketing: "marketing-focused, call-to-action friendly, brand-awareness optimized",
    educational: "educational, informative, clear messaging, instructional",
    entertainment: "entertaining, fun, engaging, shareable content",
    promotional: "promotional, product-focused, sales-oriented, compelling",
    branding: "brand-focused, consistent with brand identity, memorable",
    awareness: "awareness-building, informative, impactful messaging"
  };

  if (purpose && purposeModifiers[purpose as keyof typeof purposeModifiers]) {
    enhanced += `, ${purposeModifiers[purpose as keyof typeof purposeModifiers]}`;
  }

  // Add target audience considerations
  const audienceModifiers = {
    millennials: "millennial-friendly, trendy, authentic, experience-focused",
    genz: "Gen Z-optimized, trendy, authentic, diverse, inclusive",
    professionals: "professional audience, business-focused, sophisticated",
    parents: "family-friendly, relatable to parents, wholesome",
    students: "student-focused, affordable, educational, accessible",
    seniors: "senior-friendly, clear, accessible, respectful"
  };

  if (targetAudience && audienceModifiers[targetAudience as keyof typeof audienceModifiers]) {
    enhanced += `, ${audienceModifiers[targetAudience as keyof typeof audienceModifiers]}`;
  }

  // Add color scheme
  if (colorScheme) {
    enhanced += `, color scheme: ${colorScheme}`;
  }

  // Add general social media optimization
  enhanced += ", optimized for social media engagement, high quality, professional composition, 4K resolution";

  return enhanced;
}

async function generateImageMetadata(prompt: string, platform?: string, purpose?: string) {
  return {
    altText: `AI-generated image: ${prompt.substring(0, 100)}...`,
    description: `Created for ${platform || 'social media'} with ${purpose || 'general'} purpose`,
    tags: extractTags(prompt),
    platform: platform,
    purpose: purpose,
    createdAt: new Date().toISOString()
  };
}

async function generateSuggestedCaptions(prompt: string, platform?: string, targetAudience?: string) {
  // This could be enhanced with another AI call to generate captions
  // For now, providing template-based suggestions
  const templates = {
    instagram: [
      `✨ ${prompt.split(' ').slice(0, 3).join(' ')}... What do you think? 🤔 #AI #Creative`,
      `Just created this with AI! 🎨 Thoughts? 💭 #AIArt #Innovation`,
      `When technology meets creativity 🚀 #AIGenerated #Future`
    ],
    facebook: [
      `Check out this AI-generated creation! What's your take on AI in creative work?`,
      `Technology never ceases to amaze me. Here's what AI came up with today!`,
      `The future of creativity is here. What do you think about this AI-generated image?`
    ],
    twitter: [
      `AI just created this 🤯 Thoughts? #AIArt`,
      `The future is now 🚀 AI-generated creativity at its finest`,
      `Mind = blown 🧠💥 AI continues to amaze #TechInnovation`
    ],
    linkedin: [
      `Exploring the intersection of AI and creativity. The potential for business applications is immense.`,
      `AI-generated content is reshaping how we think about creative processes in business.`,
      `The future of content creation: AI as a creative partner, not replacement.`
    ]
  };

  return templates[platform as keyof typeof templates] || templates.instagram;
}

async function generateHashtags(prompt: string, platform?: string) {
  const commonTags = ['#AI', '#AIGenerated', '#ArtificialIntelligence', '#Creative', '#Innovation'];
  const words = prompt.toLowerCase().split(' ');
  const contentTags = words
    .filter(word => word.length > 3)
    .slice(0, 5)
    .map(word => `#${word.charAt(0).toUpperCase() + word.slice(1)}`);

  const platformSpecific = {
    instagram: ['#InstaAI', '#CreativeAI', '#AIArt', '#DigitalArt'],
    facebook: ['#AIInnovation', '#TechCreativity', '#FutureOfArt'],
    twitter: ['#AIRevolution', '#TechTrends', '#CreativeTech'],
    linkedin: ['#AIBusiness', '#DigitalTransformation', '#TechInnovation', '#FutureOfWork'],
    pinterest: ['#AIInspiration', '#CreativeIdeas', '#ArtInspiration'],
    tiktok: ['#AITrend', '#CreativeAI', '#TechTok', '#AIChallenge']
  };

  return [
    ...commonTags,
    ...contentTags,
    ...(platformSpecific[platform as keyof typeof platformSpecific] || [])
  ].slice(0, 15); // Limit to 15 hashtags
}

function getBestPostingTimes(platform?: string) {
  const times = {
    instagram: ['9:00 AM', '11:00 AM', '2:00 PM', '5:00 PM'],
    facebook: ['9:00 AM', '1:00 PM', '3:00 PM'],
    twitter: ['9:00 AM', '12:00 PM', '5:00 PM', '6:00 PM'],
    linkedin: ['8:00 AM', '12:00 PM', '2:00 PM', '5:00 PM', '6:00 PM'],
    pinterest: ['8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'],
    tiktok: ['6:00 AM', '10:00 AM', '7:00 PM', '8:00 PM', '9:00 PM']
  };

  return times[platform as keyof typeof times] || times.instagram;
}

function getEngagementTips(platform?: string) {
  const tips = {
    instagram: [
      'Use Stories polls and questions to increase engagement',
      'Post consistently at optimal times',
      'Use relevant hashtags (mix of popular and niche)',
      'Engage with comments within the first hour'
    ],
    facebook: [
      'Ask questions to encourage comments',
      'Share behind-the-scenes content',
      'Use Facebook-native video when possible',
      'Post when your audience is most active'
    ],
    twitter: [
      'Tweet during trending topics when relevant',
      'Use 1-2 hashtags maximum',
      'Engage in conversations and replies',
      'Share threads for longer content'
    ],
    linkedin: [
      'Share professional insights and learnings',
      'Use industry-specific hashtags',
      'Engage with others in your network',
      'Post long-form content for better reach'
    ]
  };

  return tips[platform as keyof typeof tips] || tips.instagram;
}

function extractTags(prompt: string): string[] {
  const words = prompt.toLowerCase().split(' ');
  return words
    .filter(word => word.length > 3 && !['with', 'that', 'this', 'from', 'they', 'have', 'been'].includes(word))
    .slice(0, 10);
}
