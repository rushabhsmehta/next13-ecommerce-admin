# 🚀 RunPod GPU Setup for AI Image Generation

This guide will help you set up RunPod GPU for AI image generation in under 10 minutes.

## Quick Start

### 1. Get RunPod Account
1. Visit [RunPod.io](https://www.runpod.io/) and sign up
2. Add credits to your account (minimum $10 recommended)

### 2. Deploy a Serverless Endpoint

#### Option A: Use Pre-built Template (Recommended)
1. Go to **Serverless** → **+ New Endpoint**
2. Search for "Stable Diffusion" in templates
3. Select a popular template like:
   - **Stable Diffusion XL** (best quality)
   - **Stable Diffusion v1.5** (fastest)
   - **Stable Diffusion v2.1** (balanced)
4. Click **Deploy**
5. Note your **Endpoint ID** (e.g., `abc123def456`)

#### Option B: Custom Docker Image
If you want more control:
1. Use a Docker image with SD API (e.g., `runpod/stable-diffusion:latest`)
2. Configure GPU type (recommended: RTX 3090 or A4000 for cost-effectiveness)
3. Deploy and note your endpoint ID

### 3. Get API Key
1. Go to **Settings** → **API Keys**
2. Click **+ Create API Key**
3. Give it a name (e.g., "Tour Package Image Gen")
4. Copy the API key (starts with `RUNPOD-...`)

### 4. Configure Environment Variables

Add these to your `.env` file:

```bash
# RunPod Configuration
RUNPOD_API_KEY=RUNPOD-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync
```

**Important**: Replace:
- `RUNPOD-XXX...` with your actual API key
- `YOUR_ENDPOINT_ID` with your endpoint ID from step 2

### 5. Deploy to Vercel (or your platform)

#### Vercel
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add both `RUNPOD_API_KEY` and `RUNPOD_API_URL`
4. Redeploy your application

#### Other Platforms
Add the environment variables according to your platform's documentation.

## Testing

### Test with curl
```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "input": {
      "prompt": "A beautiful sunset over mountains",
      "width": 512,
      "height": 512,
      "num_inference_steps": 30
    }
  }'
```

### Test in Application
1. Navigate to any tour package query
2. Go to Itinerary tab
3. Click "Generate with AI" button
4. Enter a prompt and click Generate
5. Wait 30-60 seconds for first generation (GPU cold start)

## Cost Estimation

Based on RunPod pricing (as of 2024):

| GPU Type | Cost/Hour | Images/Hour* | Cost/Image |
|----------|-----------|--------------|------------|
| RTX 3090 | $0.34/hr | ~200 | $0.0017 |
| RTX 4090 | $0.69/hr | ~300 | $0.0023 |
| A4000 | $0.29/hr | ~150 | $0.0019 |

*Approximate, based on 30 steps, 512x512 images

**Comparison with Google Imagen**: 
- Google Imagen: ~$0.10-0.40 per image
- RunPod: ~$0.002 per image
- **Savings: 98%+** 💰

## Troubleshooting

### Cold Start Delay
**Issue**: First request takes 2-3 minutes  
**Solution**: RunPod is starting the GPU. Subsequent requests will be fast (30-60s). Consider:
- Using Serverless with auto-scaling
- Keeping pod "warm" with periodic requests
- Choosing "Active Workers" in endpoint settings

### Timeout Errors
**Issue**: Request times out after 2 minutes  
**Solution**: 
- Reduce inference steps (try 20 instead of 50)
- Use a faster GPU type
- Check pod is running in RunPod dashboard

### Authentication Failed
**Issue**: 401/403 errors  
**Solution**:
- Verify API key is correct (should start with `RUNPOD-`)
- Check API key is active in RunPod dashboard
- Ensure proper Bearer token format in code

### Unexpected Response Format
**Issue**: "Unexpected API response format"  
**Solution**: 
- Different RunPod endpoints return different formats
- Check `/api/ai/images/route.ts` response parsing
- Look at server logs for actual response structure
- May need to adjust parsing logic for your specific template

## Optimizing for Cost

1. **Choose GPU Wisely**:
   - Development: RTX 3090 (good balance)
   - Production: A4000 (cost-effective)
   - High-volume: RTX 4090 (fastest)

2. **Optimize Settings**:
   - Use 20-30 steps for most images
   - Reserve 50+ steps for hero images only
   - Smaller dimensions = faster/cheaper (512x512 vs 1024x1024)

3. **Serverless Configuration**:
   - Set min workers to 0 (no idle costs)
   - Set max workers based on expected load
   - Set auto-scaling for peak times

4. **Monitor Usage**:
   - Check RunPod dashboard regularly
   - Set up billing alerts
   - Track costs per project/feature

## Advanced Configuration

### Custom Model Selection
If using a custom endpoint, you can specify different models:

```typescript
// In /api/ai/images/route.ts
const response = await axios.post(runpodApiUrl, {
  input: {
    prompt: prompt,
    model: "stabilityai/stable-diffusion-xl-base-1.0", // Custom model
    // ... other params
  }
});
```

### Quality Presets
Create quality presets in your code:

```typescript
const QUALITY_PRESETS = {
  draft: { steps: 15, guidance_scale: 7 },
  standard: { steps: 30, guidance_scale: 7.5 },
  premium: { steps: 50, guidance_scale: 9 },
};
```

### Batch Processing
For generating multiple images:

```typescript
const response = await axios.post(runpodApiUrl, {
  input: {
    prompt: prompt,
    num_outputs: 4, // Generate 4 variations
    // ...
  }
});
```

## Support & Resources

- **RunPod Docs**: https://docs.runpod.io/
- **RunPod Discord**: https://discord.gg/runpod
- **Stable Diffusion Guide**: https://stablediffusionweb.com/
- **Prompt Engineering**: https://prompthero.com/stable-diffusion-prompt-guide

## Next Steps

After setup:
1. ✅ Test image generation in the UI
2. ✅ Experiment with different prompts
3. ✅ Adjust steps/guidance for your use case
4. ✅ Monitor costs in RunPod dashboard
5. ✅ Share feedback and optimize!

---

**Questions?** Check the main documentation: [AI Image Generation - RunPod GPU Integration](./ai-image-generation-runpod.md)
