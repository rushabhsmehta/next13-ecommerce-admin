
import axios from 'axios';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { z } from 'zod';
import { handleApi, jsonError } from '@/lib/api-response';
import { uploadR2Object } from '@/lib/r2-client';
import { isCurrentUserAssociate } from '@/lib/associate-utils';

export const dynamic = 'force-dynamic';

const generateImageSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  aspectRatio: z.string().optional().default("1:1"), // 1:1, 16:9, 9:16, 4:3, 3:4
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
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

    const { prompt, aspectRatio } = result.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonError("Google API key is not configured", 500, "NO_API_KEY");
    }

    const modelName = "models/imagen-4.0-generate-001";
    console.log(`[AI_IMAGE] Generating image with ${modelName} for prompt: "${prompt.substring(0, 50)}..."`);

    try {
      // 1. Generate Image via Google Gemini API (Imagen 4)
      // Note: Endpoint and model name are subject to change as Imagen rolls out to Gemini API.
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:predict?key=${apiKey}`,
        {
          instances: [
            {
              prompt: prompt
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio === "16:9" ? "16:9" : "1:1"
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Response structure for Imagen on Vertex/AI Studio usually involves 'predictions' with bytesBase64Encoded
      const predictions = response.data.predictions;
      
      const firstPrediction = predictions?.[0];
      const base64Image = firstPrediction?.bytesBase64Encoded || firstPrediction?.bytesBase64;
      
      if (!base64Image) {
        console.error("[AI_IMAGE] Unexpected response format:", JSON.stringify(response.data).substring(0, 200));
        return jsonError("Failed to generate image (unexpected API response)", 502, "AI_ERROR");
      }

      const buffer = Buffer.from(base64Image, 'base64');

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
        url: uploadResult.url
      });

    } catch (error: any) {
      console.error("[AI_IMAGE] Generation failed:", error.response?.data || error.message);
      
      // Fallback: If Imagen 3 is not available, try generic Gemini 2.0 Flash? 
      // Gemini 2.0 Flash is multimodal but primarily for understanding, not generating images yet in all regions via this specific endpoint.
      // We will stick to reporting the error to help debug connection issues.
      
      return jsonError(
        `AI Generation failed: ${error.response?.data?.error?.message || error.message}`, 
        error.response?.status || 500, 
        "AI_ERROR"
      );
    }
  });
}
