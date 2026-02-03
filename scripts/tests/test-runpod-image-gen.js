#!/usr/bin/env node

/**
 * Test script for RunPod AI Image Generation API
 * 
 * Usage:
 *   node scripts/tests/test-runpod-image-gen.js
 * 
 * Make sure RUNPOD_API_KEY and RUNPOD_API_URL are set in .env
 */

require('dotenv').config();
const axios = require('axios');

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_API_URL = process.env.RUNPOD_API_URL;

// Test configuration
const TEST_PROMPT = "A serene tropical beach at sunset with palm trees, golden hour lighting, photorealistic, highly detailed";
const TEST_CONFIG = {
  width: 512,
  height: 512,
  num_inference_steps: 20, // Quick test with fewer steps
  guidance_scale: 7.5,
  negative_prompt: "blurry, low quality, distorted, ugly"
};

async function testRunPodAPI() {
  console.log("🧪 Testing RunPod Image Generation API\n");
  
  // Validate environment variables
  if (!RUNPOD_API_KEY) {
    console.error("❌ RUNPOD_API_KEY is not set in environment variables");
    console.error("   Add it to your .env file: RUNPOD_API_KEY=your_key_here");
    process.exit(1);
  }
  
  if (!RUNPOD_API_URL) {
    console.error("❌ RUNPOD_API_URL is not set in environment variables");
    console.error("   Add it to your .env file: RUNPOD_API_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync");
    process.exit(1);
  }
  
  console.log("✓ Environment variables found");
  console.log(`  API URL: ${RUNPOD_API_URL}`);
  console.log(`  API Key: ${RUNPOD_API_KEY.substring(0, 20)}...`);
  console.log();
  
  // Test API request
  console.log("📤 Sending test request to RunPod...");
  console.log(`  Prompt: "${TEST_PROMPT}"`);
  console.log(`  Config: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
  console.log();
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      RUNPOD_API_URL,
      {
        input: {
          prompt: TEST_PROMPT,
          negative_prompt: TEST_CONFIG.negative_prompt,
          width: TEST_CONFIG.width,
          height: TEST_CONFIG.height,
          num_inference_steps: TEST_CONFIG.num_inference_steps,
          guidance_scale: TEST_CONFIG.guidance_scale,
          num_outputs: 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`
        },
        timeout: 120000 // 2 minutes
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Success! Image generated in ${duration}s`);
    console.log();
    console.log("📊 Response Details:");
    console.log("─────────────────────────────────────");
    
    // Display response structure
    console.log("Response keys:", Object.keys(response.data).join(", "));
    
    // Try to find the image URL or data
    let imageFound = false;
    
    if (response.data.output) {
      console.log("✓ Found 'output' field");
      if (Array.isArray(response.data.output) && response.data.output.length > 0) {
        console.log(`  Type: Array with ${response.data.output.length} item(s)`);
        console.log(`  First item: ${response.data.output[0].substring(0, 100)}...`);
        imageFound = true;
      } else if (typeof response.data.output === 'string') {
        console.log("  Type: String");
        console.log(`  Value: ${response.data.output.substring(0, 100)}...`);
        imageFound = true;
      } else if (response.data.output.images) {
        console.log("  Type: Object with 'images' field");
        console.log(`  Images: ${response.data.output.images.length}`);
        imageFound = true;
      }
    }
    
    if (response.data.image) {
      console.log("✓ Found 'image' field");
      console.log(`  Type: ${typeof response.data.image}`);
      imageFound = true;
    }
    
    if (!imageFound) {
      console.log("⚠️  Image field not found in expected locations");
      console.log("   Full response structure:");
      console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
    }
    
    console.log();
    console.log("🎉 RunPod API is working correctly!");
    console.log();
    console.log("Next steps:");
    console.log("  1. The API integration should work in your application");
    console.log("  2. Navigate to a tour package query → Itinerary tab");
    console.log("  3. Click 'Generate with AI' to test in the UI");
    console.log("  4. First generation may take longer (GPU cold start)");
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    console.error(`❌ Error after ${duration}s`);
    console.error();
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error("⏱️  Request timed out");
      console.error("   This might be due to:");
      console.error("   • GPU cold start (try again, should be faster)");
      console.error("   • Endpoint is not active in RunPod dashboard");
      console.error("   • Too many inference steps (try reducing to 15-20)");
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.error("🔒 Authentication failed");
      console.error("   • Check your RUNPOD_API_KEY is correct");
      console.error("   • Verify the key is active in RunPod dashboard");
      console.error("   • Ensure key has proper permissions");
    } else if (error.response?.status === 404) {
      console.error("🔍 Endpoint not found");
      console.error("   • Check your RUNPOD_API_URL is correct");
      console.error("   • Verify endpoint ID in the URL");
      console.error("   • Ensure endpoint is deployed in RunPod");
    } else if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    
    console.error();
    console.error("Troubleshooting:");
    console.error("  • Visit https://www.runpod.io/console/serverless");
    console.error("  • Check your endpoint status");
    console.error("  • Try testing with curl first");
    console.error("  • Review docs/RUNPOD_SETUP.md for setup help");
    
    process.exit(1);
  }
}

// Run the test
testRunPodAPI().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
