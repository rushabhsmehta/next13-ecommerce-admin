
import axios from 'axios';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { handleApi, jsonError } from '@/lib/api-response';
import { uploadR2Object } from '@/lib/r2-client';
import { isCurrentUserAssociate } from '@/lib/associate-utils';

export const dynamic = 'force-dynamic';

const generateImageSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  aspectRatio: z.enum(["1:1", "4:3", "16:9", "9:16", "3:4"]).optional().default("1:1"),
  negativePrompt: z.string().optional(),
  steps: z.number().min(1).max(100).optional().default(30),
  guidanceScale: z.number().min(1).max(20).optional().default(7.5),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthenticated", 403, "AUTH");
    }

    // Role check: Ensure associates (read-only) cannot generate images (save costs)
    const isAssociate = await isCurrentUserAssociate();
    if (isAssociate) {
      return jsonError("Associates are not authorized to generate AI images", 403, "FORBIDDEN");
    }

    const body = await req.json();
    const result = generateImageSchema.safeParse(body);

    if (!result.success) {
      return jsonError("Invalid input", 400, "VALIDATION", result.error);
    }

    const { prompt, aspectRatio, negativePrompt, steps, guidanceScale } = result.data;
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodApiUrl = process.env.RUNPOD_API_URL;

    if (!runpodApiKey || !runpodApiUrl) {
      return jsonError("RunPod API is not configured. Please set RUNPOD_API_KEY and RUNPOD_API_URL in environment variables.", 500, "NO_API_KEY");
    }

    console.log(`[AI_IMAGE] Generating image with RunPod for prompt: "${prompt.substring(0, 50)}..."`);

    // Convert aspect ratio to width/height dimensions
    const dimensionsMap: Record<string, { width: number; height: number }> = {
      "1:1": { width: 512, height: 512 },
      "4:3": { width: 768, height: 576 },
      "16:9": { width: 768, height: 432 },
      "9:16": { width: 432, height: 768 },
      "3:4": { width: 576, height: 768 },
    };

    const dimensions = dimensionsMap[aspectRatio] || dimensionsMap["1:1"];

    try {
      // 1. Generate Image via RunPod API
      // RunPod typically expects: POST to endpoint with input containing prompt, parameters
      
      const response = await axios.post(
        runpodApiUrl,
        {
          input: {
            prompt: prompt,
            negative_prompt: negativePrompt || "blurry, low quality, distorted, ugly, bad anatomy",
            width: dimensions.width,
            height: dimensions.height,
            num_inference_steps: steps,
            guidance_scale: guidanceScale,
            num_outputs: 1
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${runpodApiKey}`
          },
          timeout: 120000 // 2 minutes timeout for image generation
        }
      );

      // RunPod response structure varies by model/endpoint
      // Common patterns: response.data.output, response.data.image, response.data[0]
      let base64Image: string | null = null;
      let imageUrl: string | null = null;

      // Try to extract image from various possible response structures
      if (response.data.output) {
        if (Array.isArray(response.data.output) && response.data.output.length > 0) {
          imageUrl = response.data.output[0];
        } else if (typeof response.data.output === 'string') {
          // Could be base64 or URL
          if (response.data.output.startsWith('http')) {
            imageUrl = response.data.output;
          } else {
            base64Image = response.data.output;
          }
        } else if (response.data.output.images && Array.isArray(response.data.output.images) && response.data.output.images.length > 0) {
          imageUrl = response.data.output.images[0];
        }
      } else if (response.data.image) {
        if (typeof response.data.image === 'string') {
          base64Image = response.data.image;
        }
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        imageUrl = response.data[0];
      }

      let buffer: Buffer;

      // If we have a URL, download the image
      if (imageUrl) {
        console.log(`[AI_IMAGE] Downloading image from: ${imageUrl}`);
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          buffer = Buffer.from(imageResponse.data);
        } catch (downloadError: any) {
          console.error("[AI_IMAGE] Failed to download generated image from URL:", {
            url: imageUrl,
            status: downloadError?.response?.status,
            error: downloadError?.response?.data || downloadError?.message,
          });

          return jsonError(
            "Image was generated but downloading it from the provider failed. Please try again.",
            downloadError?.response?.status || 502,
            "AI_IMAGE_DOWNLOAD_ERROR"
          );
        }
      } else if (base64Image) {
        // Clean base64 string (remove data URI prefix if present)
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
      } else {
        console.error("[AI_IMAGE] Unexpected response format:", JSON.stringify(response.data).substring(0, 500));
        return jsonError("Failed to generate image (unexpected API response format)", 502, "AI_ERROR");
      }

      // 2. Upload to R2
      const filename = `ai-gen-${Date.now()}.png`;
      const uploadResult = await uploadR2Object({
         buffer,
         fileName: filename,
         contentType: 'image/png',
         prefix: 'ai-generated'
      });

      console.log(`[AI_IMAGE] Image generated and uploaded: ${uploadResult.url}`);

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        metadata: {
          provider: 'runpod',
          dimensions: dimensions,
          aspectRatio: aspectRatio
        }
      });

    } catch (error: any) {
      console.error("[AI_IMAGE] Generation failed:", error.response?.data || error.message);
      
      // Provide helpful error messages
      let errorMessage = "AI Generation failed";
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = "Image generation timed out. The RunPod GPU may be busy or starting up. Please try again.";
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = "RunPod API authentication failed. Please check your RUNPOD_API_KEY.";
      } else if (error.response?.data?.error) {
        errorMessage = `RunPod API error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Generation failed: ${error.message}`;
      }
      
      return jsonError(
        errorMessage, 
        error.response?.status || 500, 
        "AI_ERROR"
      );
    }
  });
}
