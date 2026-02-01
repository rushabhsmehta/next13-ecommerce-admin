# AI Image Generation - RunPod GPU Integration

## Overview
This feature enables AI-powered image generation for tour package itineraries using RunPod GPU instances. The system has been migrated from Google's Imagen API to a cost-effective RunPod GPU solution, providing powerful diffusion model capabilities at a fraction of the cost.

## Features

### 🎨 Enhanced UI
- **Professional Design**: Modern, intuitive interface with tabbed controls
- **Real-time Preview**: Large preview area showing generated images
- **Advanced Controls**: Fine-tune generation with steps, guidance scale, and negative prompts
- **Aspect Ratio Selection**: Visual selector with descriptions for different ratios
- **Generation Metrics**: Shows generation time and status
- **Quick Regeneration**: Easy regenerate button with same settings

### ⚙️ Advanced Parameters
- **Inference Steps**: Control quality vs speed (10-100 steps, default: 30)
- **Guidance Scale**: How closely to follow the prompt (1-20, default: 7.5)
- **Negative Prompts**: Specify what to avoid in the image
- **Aspect Ratios**: 1:1, 4:3, 16:9, 9:16, 3:4 with visual previews

### 🚀 Performance
- **GPU-Powered**: Utilizes RunPod GPU instances for fast generation
- **Cost-Effective**: Significantly cheaper than Google Imagen
- **Timeout Handling**: 2-minute timeout with helpful error messages
- **Progress Indicators**: Clear loading states and generation time display

## Setup

### Environment Variables
Add the following to your `.env` file:

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_API_URL=https://api.runpod.ai/v2/your-endpoint-id/runsync

# Optional: Keep for backward compatibility if needed
# GEMINI_API_KEY=your_google_api_key
```

### Getting RunPod Credentials

1. **Sign up for RunPod**: Visit [RunPod.io](https://www.runpod.io/)
2. **Deploy a GPU Instance**:
   - Go to Serverless
   - Create a new pod with a diffusion model (e.g., Stable Diffusion)
   - Note your endpoint ID
3. **Get API Key**:
   - Go to Settings → API Keys
   - Create a new API key
4. **Construct API URL**:
   - Format: `https://api.runpod.ai/v2/{ENDPOINT_ID}/runsync`
   - Replace `{ENDPOINT_ID}` with your endpoint ID

## API Route Changes

### `/api/ai/images` (POST)

#### Request Body
```typescript
{
  prompt: string;              // Required: Image description
  aspectRatio?: string;        // Optional: "1:1" | "4:3" | "16:9" | "9:16" | "3:4" (default: "1:1")
  negativePrompt?: string;     // Optional: What to avoid
  steps?: number;              // Optional: 1-100 (default: 30)
  guidanceScale?: number;      // Optional: 1-20 (default: 7.5)
}
```

#### Response
```typescript
{
  success: boolean;
  url: string;                 // R2 storage URL
  metadata: {
    provider: "runpod";
    dimensions: {
      width: number;
      height: number;
    };
    aspectRatio: string;
  }
}
```

#### Error Responses
- `403`: Authentication failed or associate user
- `500`: API not configured (missing env vars)
- `502`: Timeout or unexpected response format

## UI Component Usage

### Basic Usage
```tsx
import { AIImageGeneratorModal } from "@/components/ui/ai-image-generator-modal";

<AIImageGeneratorModal
  onImageGenerated={(url) => {
    // Handle the generated image URL
    console.log("Generated image:", url);
  }}
/>
```

### With Auto-Prompt
```tsx
<AIImageGeneratorModal
  autoPrompt="A luxury resort in Bali with infinity pool at sunset"
  aspectRatio="4:3"
  onImageGenerated={(url) => {
    setImageUrl(url);
  }}
/>
```

### Custom Trigger
```tsx
<AIImageGeneratorModal
  trigger={
    <Button variant="outline">
      <Wand2 className="mr-2" />
      Create Image
    </Button>
  }
  onImageGenerated={(url) => {
    handleImageGenerated(url);
  }}
/>
```

## Component Architecture

### Modified Files

#### 1. `/src/app/api/ai/images/route.ts`
- Replaced Google Imagen API with RunPod API
- Added advanced parameter support (steps, guidance, negative prompts)
- Improved error handling with specific messages
- Added timeout handling (2 minutes)
- Flexible response parsing for various RunPod endpoints

#### 2. `/src/components/ui/ai-image-generator-modal.tsx`
- Complete UI redesign with modern interface
- Added tabbed interface (Prompt/Advanced)
- Real-time parameter adjustments with sliders
- Aspect ratio selector with visual previews
- Generation time display
- Regenerate functionality
- Advanced settings panel

#### 3. `/src/components/ui/slider.tsx`
- New component for parameter adjustment
- Built on @radix-ui/react-slider
- Consistent with existing shadcn components

#### 4. `/package.json`
- Added `@radix-ui/react-slider` dependency

## Dimension Mapping

The API automatically converts aspect ratios to pixel dimensions:

| Aspect Ratio | Dimensions | Use Case |
|--------------|------------|----------|
| 1:1 | 512x512 | Social media, avatars |
| 4:3 | 768x576 | Travel photos, presentations |
| 16:9 | 768x432 | Widescreen, banners |
| 9:16 | 432x768 | Mobile, stories |
| 3:4 | 576x768 | Portrait, posters |

## Usage Tips

### For Best Results

1. **Be Specific**: Include details about lighting, style, and composition
   - ✅ "Luxury beachfront villa at golden hour, palm trees, infinity pool, professional photography"
   - ❌ "Beach house"

2. **Use Negative Prompts**: Exclude unwanted elements
   - "blurry, low quality, distorted, ugly, bad anatomy, watermark, text"

3. **Adjust Steps**: 
   - Quick preview: 15-20 steps
   - Production quality: 30-50 steps
   - High detail: 50-100 steps

4. **Guidance Scale**:
   - Creative freedom: 5-7
   - Balanced: 7-9
   - Strict prompt following: 10-15

### Example Prompts

**Travel Destination**:
```
A serene Kerala houseboat cruising through backwaters at sunset, 
palm trees lining the waterway, golden hour lighting, reflections 
on calm water, vibrant colors, professional travel photography, 
highly detailed, 8k
```

**Activity Scene**:
```
Tourists on an elephant safari through lush jungle, Periyar Wildlife 
Sanctuary, morning light filtering through canopy, exotic birds, 
misty atmosphere, National Geographic style, photorealistic
```

**Hotel/Resort**:
```
Luxury hillside resort overlooking tea plantations, infinity pool, 
modern architecture, sunrise lighting, mist-covered mountains in 
background, premium hospitality photography, architectural digest style
```

## Security

- **Authentication Required**: Only authenticated users can generate images
- **Role-Based Access**: Associates (read-only users) cannot generate images to control costs
- **Rate Limiting**: Consider implementing rate limiting at RunPod level
- **Cost Control**: Monitor RunPod usage through their dashboard

## Troubleshooting

### Common Issues

**Error: "RunPod API is not configured"**
- Verify `RUNPOD_API_KEY` and `RUNPOD_API_URL` are set in environment variables
- Check Vercel/deployment platform has the variables configured

**Error: "Image generation timed out"**
- RunPod GPU may be cold-starting (first request takes longer)
- Try reducing inference steps (e.g., 20 instead of 50)
- Check RunPod dashboard to ensure pod is running

**Error: "RunPod API authentication failed"**
- Verify API key is correct and active
- Check API key has proper permissions in RunPod dashboard

**Error: "Failed to generate image (unexpected API response format)"**
- RunPod endpoints may have different response structures
- Check API route logs for response format
- May need to adjust response parsing in `/api/ai/images/route.ts`

### Debug Mode

Check browser console and server logs for detailed error messages:
```javascript
// Browser console will show:
[AI_IMAGE] Generating image with RunPod for prompt: "..."

// Server logs show full response structure
[AI_IMAGE] Unexpected response format: {...}
```

## Migration from Google Imagen

If you need to rollback or compare:

1. **Old Implementation**: Backed up in git history
2. **Old Env Var**: `GEMINI_API_KEY` (can be removed)
3. **Differences**:
   - Imagen: Fixed aspect ratios, less control
   - RunPod: Full control over generation parameters

## Performance Comparison

| Metric | Google Imagen | RunPod GPU |
|--------|---------------|------------|
| Cost per image | ~$0.10-0.40 | ~$0.001-0.01 |
| Generation time | 20-30s | 30-60s |
| Quality | High | High (configurable) |
| Customization | Limited | Extensive |
| Aspect ratios | Fixed | Flexible |

## Future Enhancements

Potential improvements:
- [ ] Batch generation for multiple images
- [ ] Style presets (photorealistic, artistic, etc.)
- [ ] Image-to-image generation
- [ ] Inpainting for editing existing images
- [ ] Generation history/gallery
- [ ] Save favorite prompts
- [ ] A/B testing with multiple variations
- [ ] Integration with image editing tools

## Support

For issues or questions:
1. Check RunPod documentation: https://docs.runpod.io/
2. Verify environment variables are correctly set
3. Check server logs for detailed error messages
4. Monitor RunPod dashboard for pod status and usage
