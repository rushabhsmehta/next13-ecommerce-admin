"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  Target,
  Zap,
  Users,
  Activity,
  Palette,
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalImages: number;
    approvedImages: number;
    approvalRate: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    totalImpressions: number;
    avgEngagementRate: number;
    recentActivity: number;
  };
  platformStats: Record<string, {
    posts: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    engagementRate: number;
  }>;
  topPerforming: Array<{
    id: string;
    prompt: string;
    generatedImageUrl: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
    platform: string;
  }>;
  dailyStats: Array<{
    date: string;
    images: number;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
  }>;
  styleStats: Record<string, number>;
  purposeStats: Record<string, number>;
  abTestStats: {
    totalTests: number;
    avgEngagementRate: number;
  };
  trends: {
    viewsGrowth: number;
    likesGrowth: number;
    sharesGrowth: number;
    engagementGrowth: number;
  };
}

const AIImageAnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ai-image/analytics', {
        params: { timeRange, platform: selectedPlatform !== 'all' ? selectedPlatform : undefined }
      });
      
      // Ensure all numeric values are properly initialized
      const data = response.data;
      if (data && data.overview) {
        const sanitizedData = {
          ...data,
          overview: {
            totalImages: data.overview.totalImages || 0,
            approvedImages: data.overview.approvedImages || 0,
            approvalRate: data.overview.approvalRate || 0,
            totalViews: data.overview.totalViews || 0,
            totalLikes: data.overview.totalLikes || 0,
            totalShares: data.overview.totalShares || 0,
            totalComments: data.overview.totalComments || 0,
            totalImpressions: data.overview.totalImpressions || 0,
            avgEngagementRate: data.overview.avgEngagementRate || 0,
            recentActivity: data.overview.recentActivity || 0,
          },
          trends: {
            viewsGrowth: data.trends?.viewsGrowth || 0,
            likesGrowth: data.trends?.likesGrowth || 0,
            sharesGrowth: data.trends?.sharesGrowth || 0,
            engagementGrowth: data.trends?.engagementGrowth || 0,
          },
          ...data
        };
        setAnalyticsData(sanitizedData);
      } else {
        console.error('Invalid analytics data structure:', data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);      // Set default empty data on error
      setAnalyticsData({
        overview: {
          totalImages: 0,
          approvedImages: 0,
          approvalRate: 0,
          totalViews: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalImpressions: 0,
          avgEngagementRate: 0,
          recentActivity: 0,
        },
        platformStats: {},
        topPerforming: [],
        dailyStats: [],
        styleStats: {},
        purposeStats: {},
        abTestStats: {
          totalTests: 0,
          avgEngagementRate: 0,
        },
        trends: {
          viewsGrowth: 0,
          likesGrowth: 0,
          sharesGrowth: 0,
          engagementGrowth: 0,
        },
      });    } finally {      setIsLoading(false);
    }
  }, [timeRange, selectedPlatform]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  const StatCard = ({ title, value, icon: Icon, trend, description, isPercentage = false }: {
    title: string;
    value: number | string | undefined;
    icon: any;
    trend?: number;
    description?: string;
    isPercentage?: boolean;
  }) => {
    const safeValue = value ?? 0;
    const formattedValue = typeof safeValue === 'number' 
      ? (isPercentage ? `${safeValue.toFixed(1)}%` : safeValue.toLocaleString()) 
      : safeValue.toString();

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formattedValue}
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
        )}        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
    );
  };

  const formatNumber = (num: number | undefined) => {
    if (!num || typeof num !== 'number') {
      return '0';
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Heading title="AI Image Analytics" description="Comprehensive performance tracking for your AI-generated content" />
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
          <Heading title="AI Image Analytics" description="Comprehensive performance tracking for your AI-generated content" />
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
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
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
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="content">Content Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Images"
                value={analyticsData?.overview.totalImages || 0}
                icon={BarChart3}
                description="AI-generated images"
              />
              <StatCard
                title="Total Views"
                value={analyticsData?.overview.totalViews || 0}
                icon={Eye}
                trend={analyticsData?.trends.viewsGrowth}
                description="Views across all platforms"
              />
              <StatCard
                title="Total Engagements"
                value={(analyticsData?.overview.totalLikes || 0) + (analyticsData?.overview.totalShares || 0) + (analyticsData?.overview.totalComments || 0)}
                icon={Heart}
                trend={analyticsData?.trends.engagementGrowth}
                description="Likes, shares, comments"
              />
              <StatCard
                title="Avg Engagement Rate"
                value={analyticsData?.overview.avgEngagementRate || 0}
                icon={TrendingUp}
                trend={analyticsData?.trends.engagementGrowth}
                description="Engagement per impression"
                isPercentage={true}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Approved Images"
                value={analyticsData?.overview.approvedImages || 0}
                icon={CheckCircle}
                description="Quality approved content"
              />
              <StatCard
                title="Approval Rate"
                value={analyticsData?.overview.approvalRate || 0}
                icon={Target}
                description="Content quality score"
                isPercentage={true}
              />
              <StatCard
                title="Total Impressions"
                value={analyticsData?.overview.totalImpressions || 0}
                icon={Activity}
                description="Content reach"
              />
              <StatCard
                title="A/B Tests Active"
                value={analyticsData?.abTestStats.totalTests || 0}
                icon={Zap}
                description="Running experiments"
              />
            </div>

            {/* Overview Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity Breakdown</CardTitle>
                  <CardDescription>Last {timeRange} days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Views</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(analyticsData?.overview.totalViews || 0)}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {analyticsData?.trends.viewsGrowth && analyticsData.trends.viewsGrowth > 0 ? (
                            <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(analyticsData?.trends.viewsGrowth || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Likes</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(analyticsData?.overview.totalLikes || 0)}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {analyticsData?.trends.likesGrowth && analyticsData.trends.likesGrowth > 0 ? (
                            <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(analyticsData?.trends.likesGrowth || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Shares</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(analyticsData?.overview.totalShares || 0)}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {analyticsData?.trends.sharesGrowth && analyticsData.trends.sharesGrowth > 0 ? (
                            <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                          )}
                          {Math.abs(analyticsData?.trends.sharesGrowth || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">Comments</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(analyticsData?.overview.totalComments || 0)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Performance Trend</CardTitle>
                  <CardDescription>Images and engagement over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsData?.dailyStats.slice(-7).map((day, index) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span>{day.images} images</span>
                          <span>{formatNumber(day.views)} views</span>
                          <span>{formatNumber(day.likes + day.shares + day.comments)} eng.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Top Performing Images */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Top Performing Images</CardTitle>
                  <CardDescription>Highest engagement rates in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.topPerforming?.slice(0, 5).map((image, index) => (
                      <div key={image.id} className="flex items-center space-x-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={image.generatedImageUrl}
                            alt="AI Generated"
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {image.prompt.substring(0, 50)}...
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {formatNumber(image.views)}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {formatNumber(image.likes)}
                            </span>
                            <span className="flex items-center">
                              <Share2 className="w-3 h-3 mr-1" />
                              {formatNumber(image.shares)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {image.platform}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(image.engagementRate * 100).toFixed(1)}%
                          </div>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* A/B Test Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>A/B Test Performance</CardTitle>
                  <CardDescription>Current experiment insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analyticsData?.abTestStats.totalTests || 0}</div>
                      <p className="text-xs text-muted-foreground">Active Tests</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(analyticsData?.abTestStats.avgEngagementRate || 0).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Avg Test Engagement</p>
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className="w-full justify-center">
                        {analyticsData?.abTestStats.avgEngagementRate && analyticsData.abTestStats.avgEngagementRate > (analyticsData?.overview.avgEngagementRate || 0) 
                          ? "Tests Outperforming" 
                          : "Baseline Performing Better"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            {/* Platform Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance Breakdown</CardTitle>
                <CardDescription>Engagement metrics by social media platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(analyticsData?.platformStats || {}).map(([platform, data]) => (
                    <div key={platform} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" />
                          <span className="text-sm font-medium capitalize">{platform}</span>
                        </div>
                        <Badge variant="outline">
                          {data.engagementRate?.toFixed(1)}% engagement
                        </Badge>
                      </div>
                      <Progress value={Math.min(data.engagementRate || 0, 100)} className="h-2" />
                      <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(data.posts)}</div>
                          <div>Posts</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(data.totalViews)}</div>
                          <div>Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(data.totalLikes)}</div>
                          <div>Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(data.totalShares)}</div>
                          <div>Shares</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Style Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Style Breakdown</CardTitle>
                  <CardDescription>Performance by visual style</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analyticsData?.styleStats || {})
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([style, count]) => {
                        const total = Object.values(analyticsData?.styleStats || {}).reduce((sum, val) => sum + (val as number), 0);
                        const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                        return (
                          <div key={style} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Palette className="w-4 h-4" />
                                <span className="text-sm font-medium capitalize">{style}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {count as number} images ({percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

               {/* Purpose Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Purpose Breakdown</CardTitle>
                  <CardDescription>Usage by content purpose</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analyticsData?.purposeStats || {})
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([purpose, count]) => {
                        const total = Object.values(analyticsData?.purposeStats || {}).reduce((sum, val) => sum + (val as number), 0);
                        const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                        return (
                          <div key={purpose} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Target className="w-4 h-4" />
                                <span className="text-sm font-medium capitalize">{purpose}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {count as number} images ({percentage.toFixed(1)}%)
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* Growth Trends */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Views Growth"
                value={analyticsData?.trends.viewsGrowth || 0}
                icon={Eye}
                description="Period over period"
                isPercentage={true}
              />
              <StatCard
                title="Likes Growth"
                value={analyticsData?.trends.likesGrowth || 0}
                icon={Heart}
                description="Period over period"
                isPercentage={true}
              />
              <StatCard
                title="Shares Growth"
                value={analyticsData?.trends.sharesGrowth || 0}
                icon={Share2}
                description="Period over period"
                isPercentage={true}
              />
              <StatCard
                title="Engagement Growth"
                value={analyticsData?.trends.engagementGrowth || 0}
                icon={TrendingUp}
                description="Period over period"
                isPercentage={true}
              />
            </div>

            {/* Detailed Daily Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Performance Timeline</CardTitle>
                <CardDescription>Detailed breakdown of daily metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.dailyStats.slice(-14).map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{day.images}</div>
                          <div className="text-xs text-muted-foreground">Images</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(day.views)}</div>
                          <div className="text-xs text-muted-foreground">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(day.likes)}</div>
                          <div className="text-xs text-muted-foreground">Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(day.shares)}</div>
                          <div className="text-xs text-muted-foreground">Shares</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{formatNumber(day.impressions)}</div>
                          <div className="text-xs text-muted-foreground">Impressions</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIImageAnalyticsPage;
