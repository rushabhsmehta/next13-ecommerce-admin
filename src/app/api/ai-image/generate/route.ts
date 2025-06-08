import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from 'openai';

// TODO: Implement proper error handling and potentially use a dedicated OpenAI client instance

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, referenceImageUrl } = body;

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
      const mockImageUrl = "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2664&q=80";
      
      return NextResponse.json({ 
        imageUrl: mockImageUrl,
        isMockData: true
      });
    }

    if (!process.env.OPENAI_API_KEY) {
        return new NextResponse("OpenAI API Key not configured.", { status: 500 });
    }// --- OpenAI Image Generation Logic ---
    try {
      // TODO: Add logic to handle referenceImageUrl if provided (e.g., variations or edits if API supports)
      // Using DALL-E 3 for now, adjust model as needed (e.g., 'dall-e-3', 'dall-e-2')
      const response = await openai.images.generate({
          model: "dall-e-3", // Or potentially a newer model like specified in prompt '4o' if available via API
          prompt: prompt,
          n: 1, // Generate one image
          size: "1024x1024", // Adjust size as needed
          // Add other parameters like quality, style if desired
      });

      const imageUrl = response.data[0]?.url;

      if (!imageUrl) {
          return new NextResponse("Image generation failed - no URL returned", { status: 500 });
      }

      // Return the generated image URL
      return NextResponse.json({ imageUrl });
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      
      // Handle rate limit errors specifically
      if (error?.status === 429 || error?.error?.code === 'rate_limit_exceeded') {
        return new NextResponse(JSON.stringify({
          error: "Rate limit exceeded for image generation. Please try again later or check your OpenAI account limits.",
          details: error?.error?.message || "Rate limit error"
        }), { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // Handle authorization errors
      if (error?.status === 401) {
        return new NextResponse(JSON.stringify({
          error: "Authorization error with OpenAI API. Please check your API key.",
          details: error?.error?.message || "Authorization error"
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // Generic error handler
      return new NextResponse(JSON.stringify({
        error: "Failed to generate image",
        details: error?.error?.message || error?.message || "Unknown error"
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

  } catch (error) {
    console.error('[AI_IMAGE_GENERATE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
