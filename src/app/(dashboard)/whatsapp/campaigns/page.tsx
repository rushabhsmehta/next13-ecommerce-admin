'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Send, BarChart3, Users, Clock, CheckCircle, XCircle, Pause, 
  TrendingUp, Target, Zap, AlertCircle, RefreshCw, Calendar, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  templateName: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchCampaigns = useCallback(async () => {
    try {
      const url = filter === 'all' 
        ? '/api/whatsapp/campaigns'
        : `/api/whatsapp/campaigns?status=${filter}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));
        console.error('HTTP Error fetching campaigns:', response.status, errorData);
        
        // Handle 401 Unauthorized - redirect to sign-in
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        
        // Only show error toast for server errors (500+), not 404
        if (response.status >= 500) {
          toast.error(errorData.error || 'Failed to load campaigns');
        }
        setCampaigns([]);
      } else {
        // Success - parse and set campaigns
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      // Handle network/parsing errors
      console.error('Network error fetching campaigns:', error);
      toast.error('Failed to connect to server');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; className: string }> = {
      draft: { 
        variant: 'secondary', 
        icon: Pause,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      },
      scheduled: { 
        variant: 'default', 
        icon: Clock,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      },
      sending: { 
        variant: 'default', 
        icon: Send,
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 animate-pulse'
      },
      completed: { 
        variant: 'default', 
        icon: CheckCircle,
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
      },
      cancelled: { 
        variant: 'destructive', 
        icon: XCircle,
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      },
      failed: { 
        variant: 'destructive', 
        icon: AlertCircle,
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge className={cn("gap-1.5 px-3 py-1", config.className)}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round((campaign.sentCount / campaign.totalRecipients) * 100);
  };

  const getDeliveryRate = (campaign: Campaign) => {
    if (campaign.sentCount === 0) return '0%';
    return Math.round((campaign.deliveredCount / campaign.sentCount) * 100) + '%';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">Loading campaigns...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header with Gradient */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-lg -z-10" />
        <div className="flex items-center justify-between p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  WhatsApp Campaigns
                </h1>
                <p className="text-muted-foreground mt-1">
                  Send bulk WhatsApp messages to your customers
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => router.push('campaigns/new')}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {campaigns.filter(c => c.status === 'sending').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently sending
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-emerald-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {campaigns.filter(c => c.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully sent
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recipients
            </CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {campaigns.reduce((acc, c) => acc + c.totalRecipients, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Customers reached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters with better styling */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        {['all', 'draft', 'scheduled', 'sending', 'completed', 'failed'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className={cn(
              "transition-all",
              filter === status && "shadow-md"
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCampaigns}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <Send className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No campaigns found</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Get started by creating your first campaign to send WhatsApp messages to your customers
              </p>
              <Button 
                onClick={() => router.push('campaigns/new')}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.01] border-l-4 border-l-green-500"
              onClick={() => router.push(`campaigns/${campaign.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl group-hover:text-green-600 transition-colors">
                        {campaign.name}
                      </CardTitle>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <CardDescription className="text-sm">
                      {campaign.description || `Using template: ${campaign.templateName}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`campaigns/${campaign.id}`);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {/* Progress Bar for sending campaigns */}
                  {campaign.status === 'sending' && (
                    <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-green-700 dark:text-green-300">
                          Sending in progress...
                        </span>
                        <span className="font-bold text-green-700 dark:text-green-300">
                          {getProgress(campaign)}%
                        </span>
                      </div>
                      <div className="w-full bg-green-200 dark:bg-green-900 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                          style={{ width: `${getProgress(campaign)}%` }}
                        />
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {campaign.sentCount} of {campaign.totalRecipients} messages sent
                      </p>
                    </div>
                  )}

                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Recipients
                      </p>
                      <p className="font-bold text-2xl">{campaign.totalRecipients.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Sent
                      </p>
                      <p className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                        {campaign.sentCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Delivered
                      </p>
                      <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                        {campaign.deliveredCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Read
                      </p>
                      <p className="font-bold text-2xl text-purple-600 dark:text-purple-400">
                        {campaign.readCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </p>
                      <p className="font-bold text-2xl text-red-600 dark:text-red-400">
                        {campaign.failedCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info with icons */}
                  <div className="flex items-center justify-between text-sm pt-4 border-t">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {campaign.scheduledFor && new Date(campaign.scheduledFor) > new Date()
                          ? `Scheduled for ${new Date(campaign.scheduledFor).toLocaleString()}`
                          : campaign.completedAt
                          ? `Completed ${new Date(campaign.completedAt).toLocaleString()}`
                          : `Created ${new Date(campaign.createdAt).toLocaleString()}`}
                      </span>
                    </div>
                    {campaign.status === 'completed' && campaign.sentCount > 0 && (
                      <Badge variant="outline" className="font-medium">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {getDeliveryRate(campaign)} Delivery Rate
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
