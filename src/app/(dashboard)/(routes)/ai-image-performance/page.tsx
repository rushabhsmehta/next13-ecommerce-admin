"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import axios from "axios";
import { 
  TrendingUp, 
  TrendingDown,
  Eye, 
  Heart, 
  Share2, 
  MessageCircle, 
  BarChart3,
  Activity,
  Target,
  Zap,
  Award,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Calendar,
  Users,
  Globe,
  Palette,
  Clock
} from "lucide-react";

interface PerformanceMetrics {
  totalImages: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalImpressions: number;
  avgEngagementRate: number;
  avgViewsPerImage: number;
  avgLikesPerImage: number;
  avgSharesPerImage: number;
}

interface ImagePerformance {
  id: string;
  prompt: string;
  generatedImageUrl: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  impressions: number;
  engagementRate: number;
  platform: string;
  createdAt: string;
}

interface PlatformPerformance {
  platform: string;
  totalImages: number;
  avgViews: number;
  avgLikes: number;
  avgShares: number;
  avgEngagementRate: number;
  topPerformingImage: ImagePerformance;
}

interface StylePerformance {
  style: string;
  totalImages: number;
  avgEngagementRate: number;
  avgViews: number;
  totalEngagements: number;
}

interface TrendData {
  period: string;
  images: number;
  views: number;
  likes: number;
  shares: number;
  engagementRate: number;
}

interface GrowthMetrics {
  viewsGrowth: number;
  likesGrowth: number;
  sharesGrowth: number;
  engagementGrowth: number;
  imagesGrowth: number;
}

interface BenchmarkData {
  industry: string;
  avgEngagementRate: number;
  avgViewsPerPost: number;
  yourPerformance: {
    engagementRate: number;
    viewsPerPost: number;
    comparison: string;
  };
}

interface PerformanceData {
  overview: PerformanceMetrics;
  bestPerforming: ImagePerformance[];
  worstPerforming: ImagePerformance[];
  platformBreakdown: PlatformPerformance[];
  styleBreakdown: StylePerformance[];
  dailyTrends: TrendData[];
  weeklyTrends: TrendData[];
  monthlyTrends: TrendData[];
  growthMetrics: GrowthMetrics;
  benchmarks: BenchmarkData[];
}

const AIImagePerformancePage = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [platform, setPlatform] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange, platform]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ai-image/performance', {
        params: { 
          timeRange, 
          platform: platform !== 'all' ? platform : undefined 
        }
      });
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, description, isPercentage = false }: {
    title: string;
    value: number | string;
    icon: any;
    trend?: number;
    description?: string;
    isPercentage?: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? (isPercentage ? `${value.toFixed(1)}%` : value.toLocaleString()) : value}
        </div>
        {trend !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend > 0 ? (
              <ArrowUp className="w-3 h-3 mr-1 text-green-600" />
            ) : trend < 0 ? (
              <ArrowDown className="w-3 h-3 mr-1 text-red-600" />
            ) : null}
            <span className={trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}>
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
            {" from last period"}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getBenchmarkStatus = (comparison: string) => {
    switch (comparison) {
      case 'above': return { color: 'text-green-600', icon: ArrowUp };
      case 'below': return { color: 'text-red-600', icon: ArrowDown };
      default: return { color: 'text-yellow-600', icon: Activity };
    }
  };

  if (isLoading) {
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Heading title="Performance Tracking" description="Deep dive into your AI image performance metrics" />
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Performance Tracking" description="Deep dive into your AI image performance metrics" />
          <div className="flex space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchPerformanceData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
            <TabsTrigger value="platforms">Platform Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Performance Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Images"
                value={performanceData?.overview.totalImages || 0}
                icon={BarChart3}
                trend={performanceData?.growthMetrics.imagesGrowth}
                description="Generated images"
              />
              <StatCard
                title="Total Views"
                value={performanceData?.overview.totalViews || 0}
                icon={Eye}
                trend={performanceData?.growthMetrics.viewsGrowth}
                description="Cross-platform views"
              />
              <StatCard
                title="Total Engagements"
                value={(performanceData?.overview.totalLikes || 0) + (performanceData?.overview.totalShares || 0) + (performanceData?.overview.totalComments || 0)}
                icon={Heart}
                trend={performanceData?.growthMetrics.engagementGrowth}
                description="Likes, shares, comments"
              />
              <StatCard
                title="Avg Engagement Rate"
                value={performanceData?.overview.avgEngagementRate || 0}
                icon={TrendingUp}
                trend={performanceData?.growthMetrics.engagementGrowth}
                description="Per impression"
                isPercentage={true}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Avg Views per Image"
                value={performanceData?.overview.avgViewsPerImage || 0}
                icon={Activity}
                description="Individual performance"
              />
              <StatCard
                title="Avg Likes per Image"
                value={performanceData?.overview.avgLikesPerImage || 0}
                icon={Heart}
                description="Appreciation rate"
              />
              <StatCard
                title="Avg Shares per Image"
                value={performanceData?.overview.avgSharesPerImage || 0}
                icon={Share2}
                description="Viral potential"
              />
              <StatCard
                title="Total Impressions"
                value={performanceData?.overview.totalImpressions || 0}
                icon={Target}
                description="Reach achieved"
              />
            </div>

            {/* Growth Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Growth Indicators</CardTitle>
                <CardDescription>Period-over-period performance comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm font-medium">Images</span>
                    </div>
                    <div className={`text-lg font-semibold ${performanceData?.growthMetrics.imagesGrowth && performanceData.growthMetrics.imagesGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData?.growthMetrics.imagesGrowth ? (performanceData.growthMetrics.imagesGrowth > 0 ? '+' : '') + performanceData.growthMetrics.imagesGrowth.toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">Views</span>
                    </div>
                    <div className={`text-lg font-semibold ${performanceData?.growthMetrics.viewsGrowth && performanceData.growthMetrics.viewsGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData?.growthMetrics.viewsGrowth ? (performanceData.growthMetrics.viewsGrowth > 0 ? '+' : '') + performanceData.growthMetrics.viewsGrowth.toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">Likes</span>
                    </div>
                    <div className={`text-lg font-semibold ${performanceData?.growthMetrics.likesGrowth && performanceData.growthMetrics.likesGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData?.growthMetrics.likesGrowth ? (performanceData.growthMetrics.likesGrowth > 0 ? '+' : '') + performanceData.growthMetrics.likesGrowth.toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <Share2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Shares</span>
                    </div>
                    <div className={`text-lg font-semibold ${performanceData?.growthMetrics.sharesGrowth && performanceData.growthMetrics.sharesGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData?.growthMetrics.sharesGrowth ? (performanceData.growthMetrics.sharesGrowth > 0 ? '+' : '') + performanceData.growthMetrics.sharesGrowth.toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Engagement</span>
                    </div>
                    <div className={`text-lg font-semibold ${performanceData?.growthMetrics.engagementGrowth && performanceData.growthMetrics.engagementGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData?.growthMetrics.engagementGrowth ? (performanceData.growthMetrics.engagementGrowth > 0 ? '+' : '') + performanceData.growthMetrics.engagementGrowth.toFixed(1) + '%' : '0%'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-performers" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Best Performing Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-green-600" />
                    <span>Best Performing Images</span>
                  </CardTitle>
                  <CardDescription>Highest engagement rates in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData?.bestPerforming?.slice(0, 5).map((image, index) => (
                      <div key={image.id} className="flex items-center space-x-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={image.generatedImageUrl}
                            alt="Top performing"
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {image.prompt.substring(0, 40)}...
                          </p>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {formatNumber(image.views)}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {formatNumber(image.likes)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {image.platform}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {(image.engagementRate * 100).toFixed(1)}%
                          </div>
                          <Badge variant="default">
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Underperforming Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span>Needs Improvement</span>
                  </CardTitle>
                  <CardDescription>Images with lower engagement that could be optimized</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData?.worstPerforming?.slice(0, 5).map((image, index) => (
                      <div key={image.id} className="flex items-center space-x-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={image.generatedImageUrl}
                            alt="Underperforming"
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {image.prompt.substring(0, 40)}...
                          </p>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {formatNumber(image.views)}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {formatNumber(image.likes)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {image.platform}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-yellow-600">
                            {(image.engagementRate * 100).toFixed(1)}%
                          </div>
                          <Badge variant="secondary">
                            Optimize
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            {/* Platform Performance Breakdown */}
            <div className="grid gap-4">
              {performanceData?.platformBreakdown?.map((platform) => (
                <Card key={platform.platform}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="w-5 h-5" />
                        <CardTitle className="capitalize">{platform.platform}</CardTitle>
                      </div>
                      <Badge variant="outline">
                        {platform.totalImages} images
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-3">Performance Metrics</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium">{formatNumber(platform.avgViews)}</div>
                            <p className="text-muted-foreground">Avg Views</p>
                          </div>
                          <div>
                            <div className="font-medium">{formatNumber(platform.avgLikes)}</div>
                            <p className="text-muted-foreground">Avg Likes</p>
                          </div>
                          <div>
                            <div className="font-medium">{formatNumber(platform.avgShares)}</div>
                            <p className="text-muted-foreground">Avg Shares</p>
                          </div>
                          <div>
                            <div className="font-medium">{(platform.avgEngagementRate * 100).toFixed(1)}%</div>
                            <p className="text-muted-foreground">Engagement Rate</p>
                          </div>
                        </div>
                      </div>
                      {platform.topPerformingImage && (
                        <div>
                          <h4 className="font-medium mb-3">Top Performer</h4>
                          <div className="flex items-center space-x-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                              <Image
                                src={platform.topPerformingImage.generatedImageUrl}
                                alt="Top performer"
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {platform.topPerformingImage.prompt.substring(0, 30)}...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(platform.topPerformingImage.engagementRate * 100).toFixed(1)}% engagement
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Style Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Style Performance Analysis</CardTitle>
                <CardDescription>Which visual styles perform best across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData?.styleBreakdown?.map((style) => (
                    <div key={style.style} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Palette className="w-4 h-4" />
                          <span className="text-sm font-medium capitalize">{style.style}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {style.totalImages} images • {(style.avgEngagementRate * 100).toFixed(1)}% avg engagement
                        </div>
                      </div>
                      <Progress value={Math.min(style.avgEngagementRate * 100, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatNumber(style.avgViews)} avg views</span>
                        <span>{formatNumber(style.totalEngagements)} total engagements</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* Trend Analysis */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Daily Trends</span>
                  </CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.dailyTrends?.slice(-7).map((day) => (
                      <div key={day.period} className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {new Date(day.period).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span>{day.images} img</span>
                          <span>{formatNumber(day.views)} views</span>
                          <span>{(day.engagementRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Weekly Trends</span>
                  </CardTitle>
                  <CardDescription>Last 4 weeks performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.weeklyTrends?.slice(-4).map((week, index) => (
                      <div key={week.period} className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Week {index + 1}
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span>{week.images} img</span>
                          <span>{formatNumber(week.views)} views</span>
                          <span>{(week.engagementRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Monthly Trends</span>
                  </CardTitle>
                  <CardDescription>Last 3 months performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.monthlyTrends?.slice(-3).map((month) => (
                      <div key={month.period} className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {new Date(month.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span>{month.images} img</span>
                          <span>{formatNumber(month.views)} views</span>
                          <span>{(month.engagementRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-4">
            {/* Industry Benchmarks */}
            <Card>
              <CardHeader>
                <CardTitle>Industry Benchmarks</CardTitle>
                <CardDescription>How your performance compares to industry standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {performanceData?.benchmarks?.map((benchmark) => {
                    const statusInfo = getBenchmarkStatus(benchmark.yourPerformance.comparison);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div key={benchmark.industry} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium capitalize">{benchmark.industry}</h4>
                          <Badge variant="outline">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {benchmark.yourPerformance.comparison} average
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Engagement Rate</span>
                              <span className={statusInfo.color}>
                                Your: {benchmark.yourPerformance.engagementRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress value={benchmark.yourPerformance.engagementRate} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground">
                                Avg: {benchmark.avgEngagementRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Views per Post</span>
                              <span className={statusInfo.color}>
                                Your: {formatNumber(benchmark.yourPerformance.viewsPerPost)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={Math.min((benchmark.yourPerformance.viewsPerPost / benchmark.avgViewsPerPost) * 100, 100)} 
                                className="h-2 flex-1" 
                              />
                              <span className="text-xs text-muted-foreground">
                                Avg: {formatNumber(benchmark.avgViewsPerPost)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Recommendations</CardTitle>
                <CardDescription>Actionable insights to improve your AI image performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData?.benchmarks?.some(b => b.yourPerformance.comparison === 'below') && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-1">Improvement Opportunity</h4>
                          <p className="text-sm text-yellow-700">
                            Your engagement rates are below industry average. Consider A/B testing different prompts, 
                            posting times, or visual styles to improve performance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {performanceData?.styleBreakdown?.length && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800 mb-1">Top Performing Style</h4>
                          <p className="text-sm text-blue-700">
                            {performanceData.styleBreakdown[0]?.style} style images perform best with{' '}
                            {(performanceData.styleBreakdown[0]?.avgEngagementRate * 100).toFixed(1)}% engagement rate.
                            Consider using this style more frequently.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {performanceData?.growthMetrics.engagementGrowth && performanceData.growthMetrics.engagementGrowth > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800 mb-1">Great Progress!</h4>
                          <p className="text-sm text-green-700">
                            Your engagement rate has grown by {performanceData.growthMetrics.engagementGrowth.toFixed(1)}% 
                            in the selected period. Keep up the excellent work!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIImagePerformancePage;
