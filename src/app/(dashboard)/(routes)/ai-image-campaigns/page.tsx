"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Play, 
  Pause, 
  BarChart3, 
  Users, 
  Target, 
  TrendingUp,
  Eye,
  Heart,
  Share2,
  MessageCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused' | 'draft';
  platform: string;
  style: string;
  purpose: string;
  targetAudience: string;
  createdAt: string;
  imageCount: number;
  approvedCount: number;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalImpressions: number;
  avgEngagementRate: number;
}

interface CampaignsResponse {
  campaigns: Campaign[];
  total: number;
  active: number;
  completed: number;
}

export default function CampaignManagementPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0 });
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, [selectedStatus]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      
      const response = await fetch(`/api/ai-image/campaigns?${params.toString()}`);
      const data: CampaignsResponse = await response.json();
      
      setCampaigns(data.campaigns);
      setSummary({
        total: data.total,
        active: data.active,
        completed: data.completed,
      });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    // Return appropriate platform icon based on platform
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Campaign Management</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/ai-image-campaigns/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              All time campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completed}</div>
            <p className="text-xs text-muted-foreground">
              Finished campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.length > 0 
                ? (campaigns.reduce((sum, c) => sum + c.avgEngagementRate, 0) / campaigns.length).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading campaigns...</div>
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">No campaigns found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first campaign
                </p>
                <Button onClick={() => router.push('/ai-image-campaigns/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {getPlatformIcon(campaign.platform)} • {campaign.style} • {campaign.purpose}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Images: {campaign.imageCount}</span>
                      <span>Approved: {campaign.approvedCount}</span>
                    </div>
                    
                    <Progress 
                      value={campaign.imageCount > 0 ? (campaign.approvedCount / campaign.imageCount) * 100 : 0} 
                      className="w-full" 
                    />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.totalViews)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.totalLikes)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.totalShares)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{formatNumber(campaign.totalComments)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-muted-foreground">
                        Engagement: {campaign.avgEngagementRate.toFixed(1)}%
                      </div>
                      <div className="flex space-x-2">
                        {campaign.status === 'active' && (
                          <Button size="sm" variant="outline">
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/ai-image-campaigns/${campaign.id}`)}
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
