'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, Users, Send, CheckCircle, MessageSquare, XCircle, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  respondedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
  avgDeliveryTime?: number;
  hourlyStats?: Array<{
    hour: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

export default function CampaignStatsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${campaignId}/stats`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/sign-in');
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data.stats || data.campaign);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load campaign stats');
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">Loading statistics...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const deliveryRate = stats.sentCount > 0
    ? Math.round((stats.deliveredCount / stats.sentCount) * 100)
    : 0;

  const readRate = stats.deliveredCount > 0
    ? Math.round((stats.readCount / stats.deliveredCount) * 100)
    : 0;

  const responseRate = stats.deliveredCount > 0
    ? Math.round((stats.respondedCount / stats.deliveredCount) * 100)
    : 0;

  const failureRate = stats.sentCount > 0
    ? Math.round((stats.failedCount / stats.sentCount) * 100)
    : 0;

  const progress = stats.totalRecipients > 0
    ? Math.round((stats.sentCount / stats.totalRecipients) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push(`/whatsapp/campaigns/${campaignId}`)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8" />
                  <h1 className="text-3xl font-bold tracking-tight">Campaign Analytics</h1>
                </div>
                <p className="text-purple-50 mt-1">{stats.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Delivery Rate</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{deliveryRate}%</div>
            <Progress value={deliveryRate} className="h-2 mt-2" />
            <p className="text-xs text-green-700 mt-2">
              {stats.deliveredCount} of {stats.sentCount} messages delivered
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Read Rate</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{readRate}%</div>
            <Progress value={readRate} className="h-2 mt-2" />
            <p className="text-xs text-blue-700 mt-2">
              {stats.readCount} of {stats.deliveredCount} messages read
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Response Rate</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{responseRate}%</div>
            <Progress value={responseRate} className="h-2 mt-2" />
            <p className="text-xs text-purple-700 mt-2">
              {stats.respondedCount} recipients responded
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Failure Rate</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{failureRate}%</div>
            <Progress value={failureRate} className="h-2 mt-2 bg-red-100" />
            <p className="text-xs text-red-700 mt-2">
              {stats.failedCount} messages failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Campaign Progress
            </CardTitle>
            <CardDescription>
              Detailed breakdown of campaign execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold text-green-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Total Recipients</span>
                </div>
                <span className="text-lg font-bold">{stats.totalRecipients}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Sent</span>
                </div>
                <span className="text-lg font-bold text-green-600">{stats.sentCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span className="text-sm font-medium">Delivered</span>
                </div>
                <span className="text-lg font-bold text-teal-600">{stats.deliveredCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">Read</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{stats.readCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <span className="text-lg font-bold text-red-600">{stats.failedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Timeline
            </CardTitle>
            <CardDescription>
              Campaign lifecycle and timing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(stats.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {stats.scheduledFor && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scheduled For</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(stats.scheduledFor).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {stats.startedAt && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Send className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Started Sending</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(stats.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {stats.completedAt && (
                <div className="flex items-start gap-3 p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
                  <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(stats.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {stats.avgDeliveryTime && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Avg. Delivery Time</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(stats.avgDeliveryTime / 1000)} seconds
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Campaign Status</p>
                  <p className="text-xs text-muted-foreground mt-1">Current state</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  stats.status === 'completed' && 'bg-green-100 text-green-800',
                  stats.status === 'sending' && 'bg-blue-100 text-blue-800',
                  stats.status === 'failed' && 'bg-red-100 text-red-800',
                  stats.status === 'draft' && 'bg-gray-100 text-gray-800',
                  stats.status === 'scheduled' && 'bg-purple-100 text-purple-800'
                )}>
                  {stats.status ? stats.status.charAt(0).toUpperCase() + stats.status.slice(1) : 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Key takeaways from this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="font-semibold text-green-800 dark:text-green-200">Best Performance</p>
              </div>
              <p className="text-2xl font-bold text-green-600 mb-1">
                {Math.max(deliveryRate, readRate, responseRate)}%
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                {deliveryRate >= readRate && deliveryRate >= responseRate && 'Delivery Rate'}
                {readRate > deliveryRate && readRate >= responseRate && 'Read Rate'}
                {responseRate > deliveryRate && responseRate > readRate && 'Response Rate'}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">Engagement</p>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {stats.readCount + stats.respondedCount}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Total engaged recipients
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <p className="font-semibold text-purple-800 dark:text-purple-200">Success Rate</p>
              </div>
              <p className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round(((stats.sentCount - stats.failedCount) / stats.sentCount) * 100)}%
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Messages successfully sent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
