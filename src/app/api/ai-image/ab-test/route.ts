import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';
import prismadb from "@/lib/prismadb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ABTestConfig {
  name: string;
  description?: string;
  platform: string;
  testDuration: number; // days
  confidenceLevel: number;
  trafficSplit: number[]; // percentage split between variations
  primaryMetric: string;
  secondaryMetrics: string[];
}

interface ABTestResult {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  platform: string;
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
  variations: ABTestVariation[];
  results?: ABTestAnalysis;
  config: ABTestConfig;
}

interface ABTestVariation {
  id: string;
  name: string;
  imageUrl: string;
  prompt: string;
  trafficAllocation: number;
  metrics: {
    impressions: number;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
    conversions: number;
    engagementRate: number;
    clickThroughRate: number;
    conversionRate: number;
  };
}

interface ABTestAnalysis {
  winner?: string;
  winnerConfidence: number;
  significantDifference: boolean;
  primaryMetricResults: {
    [variationId: string]: {
      value: number;
      improvement: number;
      confidenceInterval: [number, number];
    };
  };
  recommendations: string[];
  insights: string[];
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const testId = searchParams.get("testId");

    // If requesting specific test
    if (testId) {
      const test = await getABTestById(testId);
      if (!test) {
        return new NextResponse("Test not found", { status: 404 });
      }
      return NextResponse.json(test);
    }

    // Get all A/B tests with filters
    const tests = await getABTests({ status, platform });
    
    return NextResponse.json({
      tests,
      summary: {
        total: tests.length,
        running: tests.filter(t => t.status === 'running').length,
        completed: tests.filter(t => t.status === 'completed').length,
        draft: tests.filter(t => t.status === 'draft').length,
      }
    });
  } catch (error) {
    console.error("[AB_TEST_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { 
      action, 
      originalPrompt, 
      platform, 
      variations = 3,
      testConfig,
      testId 
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Handle different actions
    switch (action) {
      case 'create':
        return await createABTest(body);
      case 'start':
        return await startABTest(testId);
      case 'pause':
        return await pauseABTest(testId);
      case 'complete':
        return await completeABTest(testId);
      case 'analyze':
        return await analyzeABTest(testId);
      case 'generate_variations':
      default:
        return await generateABTestVariations(originalPrompt, platform, variations);
    }
  } catch (error) {
    console.error('[AB_TEST_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

async function createABTest(data: any): Promise<NextResponse> {
  const { name, description, platform, variations, config } = data;
  
  if (!name || !platform || !variations || variations.length < 2) {
    return new NextResponse("Name, platform, and at least 2 variations are required", { status: 400 });
  }

  const testId = `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create variations with mock data
  const testVariations: ABTestVariation[] = variations.map((variation: any, index: number) => ({
    id: `var_${testId}_${index}`,
    name: variation.name || `Variation ${String.fromCharCode(65 + index)}`,
    imageUrl: variation.imageUrl,
    prompt: variation.prompt,
    trafficAllocation: config?.trafficSplit?.[index] || Math.floor(100 / variations.length),
    metrics: {
      impressions: 0,
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      clicks: 0,
      conversions: 0,
      engagementRate: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    },
  }));

  const test: ABTestResult = {
    id: testId,
    name,
    status: 'draft',
    platform,
    createdAt: new Date(),
    variations: testVariations,
    config: {
      name,
      description,
      platform,
      testDuration: config?.testDuration || 14,
      confidenceLevel: config?.confidenceLevel || 95,
      trafficSplit: config?.trafficSplit || testVariations.map(() => Math.floor(100 / variations.length)),
      primaryMetric: config?.primaryMetric || 'engagementRate',
      secondaryMetrics: config?.secondaryMetrics || ['clickThroughRate', 'conversionRate'],
    },
  };

  // In a real implementation, save to database
  // await saveABTest(test);

  return NextResponse.json({
    success: true,
    test,
    message: 'A/B test created successfully',
  });
}

async function generateABTestVariations(originalPrompt: string, platform?: string, variationCount = 3) {
  if (!originalPrompt) {
    return new NextResponse("Original prompt is required", { status: 400 });
  }

  // Generate multiple variations for A/B testing
  const variationPrompts = generateVariationPrompts(originalPrompt, platform);
  const generatedVariations = [];

  for (let i = 0; i < Math.min(variationCount, 4); i++) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: variationPrompts[i] || originalPrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      });

      const imageUrl = response.data[0]?.url;
      if (imageUrl) {
        generatedVariations.push({
          imageUrl,
          prompt: variationPrompts[i] || originalPrompt,
          variation: `Variation ${String.fromCharCode(65 + i)}`, // A, B, C, D
          optimizedFor: getVariationOptimization(i),
        });
      }
    } catch (error) {
      console.error(`Error generating variation ${i}:`, error);
    }
  }

  return NextResponse.json({ 
    variations: generatedVariations,
    testingRecommendations: getTestingRecommendations(platform),
    metricsToTrack: getMetricsToTrack(platform)
  });
}

async function startABTest(testId: string): Promise<NextResponse> {
  // In a real implementation, update test status in database
  return NextResponse.json({
    success: true,
    message: 'A/B test started successfully',
    testId,
    startDate: new Date(),
  });
}

async function pauseABTest(testId: string): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'A/B test paused successfully',
    testId,
  });
}

async function completeABTest(testId: string): Promise<NextResponse> {
  const analysis = await analyzeABTestResults(testId);
  
  return NextResponse.json({
    success: true,
    message: 'A/B test completed successfully',
    testId,
    endDate: new Date(),
    analysis,
  });
}

async function analyzeABTest(testId: string): Promise<NextResponse> {
  const analysis = await analyzeABTestResults(testId);
  
  return NextResponse.json({
    testId,
    analysis,
    recommendations: generateRecommendations(analysis),
  });
}

async function getABTests(filters: { status?: string; platform?: string }): Promise<ABTestResult[]> {
  // Mock data - in real implementation, query database
  const mockTests: ABTestResult[] = [
    {
      id: 'test_1',
      name: 'Product Launch Campaign',
      status: 'running',
      platform: 'instagram',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      variations: [],
      config: {
        name: 'Product Launch Campaign',
        platform: 'instagram',
        testDuration: 14,
        confidenceLevel: 95,
        trafficSplit: [50, 50],
        primaryMetric: 'engagementRate',
        secondaryMetrics: ['clickThroughRate'],
      },
    },
    {
      id: 'test_2',
      name: 'Brand Awareness Test',
      status: 'completed',
      platform: 'facebook',
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      variations: [],
      config: {
        name: 'Brand Awareness Test',
        platform: 'facebook',
        testDuration: 14,
        confidenceLevel: 95,
        trafficSplit: [33, 33, 34],
        primaryMetric: 'reach',
        secondaryMetrics: ['engagementRate', 'shares'],
      },
    },
  ];

  return mockTests.filter(test => {
    if (filters.status && test.status !== filters.status) return false;
    if (filters.platform && test.platform !== filters.platform) return false;
    return true;
  });
}

async function getABTestById(testId: string): Promise<ABTestResult | null> {
  const tests = await getABTests({});
  return tests.find(test => test.id === testId) || null;
}

async function analyzeABTestResults(testId: string): Promise<ABTestAnalysis> {
  // Mock analysis - in real implementation, perform statistical analysis
  return {
    winner: 'var_1',
    winnerConfidence: 87.5,
    significantDifference: true,
    primaryMetricResults: {
      'var_1': {
        value: 4.2,
        improvement: 15.8,
        confidenceInterval: [3.8, 4.6],
      },
      'var_2': {
        value: 3.6,
        improvement: 0,
        confidenceInterval: [3.2, 4.0],
      },
    },
    recommendations: [
      'Variation A shows significant improvement in engagement rate',
      'Consider implementing the winning variation across all campaigns',
      'Test similar variations to optimize further',
    ],
    insights: [
      'Users respond better to emotional messaging',
      'Clear call-to-action improves click-through rates',
      'Visual composition affects engagement significantly',
    ],
  };
}

function generateRecommendations(analysis: ABTestAnalysis): string[] {
  const recommendations = [...analysis.recommendations];
  
  if (analysis.significantDifference) {
    recommendations.push('Results show statistical significance - safe to implement winner');
  } else {
    recommendations.push('No significant difference found - consider running test longer or with larger sample size');
  }
  
  return recommendations;
}

function generateVariationPrompts(basePrompt: string, platform?: string): string[] {
  const variations = [
    // Variation A: Original enhanced
    `${basePrompt}, high quality, professional composition`,
    
    // Variation B: Emotional appeal
    `${basePrompt}, emotionally engaging, heartwarming, connects with viewers`,
    
    // Variation C: Action-oriented
    `${basePrompt}, dynamic, action-packed, energetic composition`,
    
    // Variation D: Minimalist
    `${basePrompt}, minimalist design, clean composition, simple and elegant`
  ];

  // Platform-specific adjustments
  if (platform === 'instagram') {
    return variations.map(v => `${v}, Instagram-optimized, mobile-friendly, visually striking`);
  } else if (platform === 'linkedin') {
    return variations.map(v => `${v}, professional, business-focused, sophisticated`);
  } else if (platform === 'tiktok') {
    return variations.map(v => `${v}, trendy, youth-focused, attention-grabbing`);
  }

  return variations;
}

function getVariationOptimization(index: number): string {
  const optimizations = [
    'Quality & Professionalism',
    'Emotional Connection',
    'Dynamic Energy',
    'Minimalist Appeal'
  ];
  return optimizations[index] || 'General Appeal';
}

function getTestingRecommendations(platform?: string) {
  return {
    testDuration: '7-14 days',
    audience: 'Split evenly across similar demographics',
    metrics: 'Focus on engagement rate and click-through rate',
    sampleSize: 'Minimum 1000 views per variation for statistical significance',
    platform: platform,
    recommendations: [
      'Test one variable at a time (style, color, composition)',
      'Ensure consistent posting times across variations',
      'Use same caption and hashtags for fair comparison',
      'Monitor results daily but wait for full test period before deciding'
    ]
  };
}

function getMetricsToTrack(platform?: string) {
  const baseMetrics = ['impressions', 'engagementRate', 'clickThroughRate', 'saves', 'shares'];
  
  const platformSpecific = {
    instagram: [...baseMetrics, 'storyMentions', 'profileVisits', 'reach'],
    facebook: [...baseMetrics, 'reactions', 'comments', 'videoViews'],
    twitter: [...baseMetrics, 'retweets', 'replies', 'mentions'],
    linkedin: [...baseMetrics, 'companyPageViews', 'followerGrowth', 'leads'],
    tiktok: [...baseMetrics, 'videoCompletion', 'effects', 'sounds'],
  };

  return platformSpecific[platform as keyof typeof platformSpecific] || baseMetrics;
}
