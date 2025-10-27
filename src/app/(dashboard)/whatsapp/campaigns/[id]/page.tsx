'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Trash2, BarChart3, Users, RefreshCw, CheckCircle, XCircle, MessageSquare, Pause, Loader2, Clock3, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
  respondedCount: number;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  rateLimit?: number | null;
  retryFailed?: boolean;
  maxRetries?: number;
  recipients: Array<{
    id: string;
    phoneNumber: string;
    name?: string;
    status: string;
    sentAt?: string;
    errorMessage?: string;
    retryCount?: number;
    lastRetryAt?: string;
    updatedAt?: string;
  }>;
}

interface StatusSummaryResponse {
  pending: number;
  sending: number;
  retry: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  opted_out: number;
  responded: number;
  other: Record<string, number>;
}

interface RetryScheduleItem {
  id: string;
  retryCount: number;
  scheduledAt: string;
}

interface RetryScheduleSnapshot {
  nextRetryAt: string | null;
  queue: RetryScheduleItem[];
}

const blankStatusSummary: StatusSummaryResponse = {
  pending: 0,
  sending: 0,
  retry: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  opted_out: 0,
  responded: 0,
  other: {},
};

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSummary, setStatusSummary] = useState<StatusSummaryResponse | null>(null);
  const [retrySchedule, setRetrySchedule] = useState<RetryScheduleSnapshot | null>(null);

  const summary = statusSummary ?? blankStatusSummary;
  const messagesPerSecond = resolveMessagesPerSecond(campaign?.rateLimit ?? undefined);
  const totalAttention = summary.failed + summary.opted_out;
  const nextRetryLabel = summary.retry > 0
    ? retrySchedule?.nextRetryAt
      ? formatDistanceToNow(new Date(retrySchedule.nextRetryAt), { addSuffix: true })
      : 'as soon as the backoff window clears'
    : 'No retries scheduled';

  const liveSteps = useMemo(() => {
    if (!campaign) {
      return [];
    }

    const deliveredCount = campaign?.deliveredCount ?? 0;

    return [
      {
        key: 'queued',
        label: 'Queued for send',
        description: summary.pending > 0
          ? `${summary.pending} recipient${summary.pending === 1 ? '' : 's'} waiting for dispatch.`
          : 'No recipients waiting in the queue.',
        icon: Loader2,
        active: summary.pending > 0,
      },
      {
        key: 'dispatching',
        label: 'Dispatching current batch',
        description: summary.sending > 0
          ? `Messaging ${summary.sending} recipient${summary.sending === 1 ? '' : 's'} at ~${messagesPerSecond} msg/s.`
          : 'No messages currently leaving the queue.',
        icon: Send,
        active: summary.sending > 0,
      },
      {
        key: 'retry',
        label: 'Waiting on retry window',
        description: summary.retry > 0
          ? `Retry queue has ${summary.retry} recipient${summary.retry === 1 ? '' : 's'}; next retry ${nextRetryLabel}.`
          : 'No recipients waiting for a retry window.',
        icon: RotateCcw,
        active: summary.retry > 0,
      },
      {
        key: 'delivered',
        label: 'Delivered successfully',
        description: summary.delivered > 0
          ? `${summary.delivered} delivered and ${deliveredCount} logged overall.`
          : 'Deliveries will appear here once confirmed.',
        icon: CheckCircle,
        active: summary.delivered > 0,
      },
      {
        key: 'attention',
        label: 'Needs attention',
        description: totalAttention > 0
          ? `${totalAttention} recipient${totalAttention === 1 ? '' : 's'} failed or opted out.`
          : 'No failures or opt-outs detected.',
        icon: AlertTriangle,
        active: totalAttention > 0,
      },
    ];
  }, [campaign, summary.pending, summary.sending, summary.retry, summary.delivered, totalAttention, messagesPerSecond, nextRetryLabel]);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      
      const data = await response.json();
      setCampaign(data.campaign);
      setStatusSummary(data.statusSummary ?? null);
      setRetrySchedule(data.retrySchedule ?? null);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    if (!campaign) {
      return;
    }

    const activeStatuses = ['sending', 'scheduled'];
    const shouldPoll = activeStatuses.includes(campaign.status);

    if (!shouldPoll) {
      return;
    }

    // Reduced from 3000ms to 2000ms for faster UI updates with optimized backend
    const interval = setInterval(fetchCampaign, 2000);

    return () => clearInterval(interval);
  }, [campaign, fetchCampaign]);

  const sendCampaign = async () => {
    const existingStatus = campaign?.status;
    setSending(true);
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send campaign');
      }

      if (existingStatus === 'completed') {
        toast.success('Retry started. Campaign is sending again.');
      } else {
        toast.success('Campaign sending started!');
      }
      fetchCampaign();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const deleteCampaign = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete campaign');
      }

      toast.success('Campaign deleted');
      router.push('/whatsapp/campaigns');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message);
      setDeleting(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause campaign');
      }

      toast.success('Campaign paused');
      fetchCampaign();
    } catch (error: any) {
      console.error('Error pausing campaign:', error);
      toast.error(error.message || 'Failed to pause campaign');
    }
  };

  const resumeCampaign = async () => {
    try {
      // First set status to 'sending'
      const statusResponse = await fetch(`/api/whatsapp/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sending' })
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.json();
        throw new Error(error.error || 'Failed to update campaign status');
      }

      // Then call the send endpoint to restart the background processor
      const sendResponse = await fetch(`/api/whatsapp/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        throw new Error(error.error || 'Failed to resume campaign');
      }

      toast.success('Campaign resumed');
      fetchCampaign();
    } catch (error: any) {
      console.error('Error resuming campaign:', error);
      toast.error(error.message || 'Failed to resume campaign');
    }
  };

  if (loading || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">Loading campaign...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const progress = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
    : 0;

  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0;

  const readRate = campaign.deliveredCount > 0
    ? Math.round((campaign.readCount / campaign.deliveredCount) * 100)
    : 0;

  const canRetry = campaign.status === 'completed';
  const canSend = campaign.status === 'draft' || campaign.status === 'scheduled' || canRetry;
  const canDelete = ['draft', 'scheduled', 'completed', 'failed', 'cancelled', 'paused'].includes(campaign.status);

  return (
    <div className="space-y-6 pb-8">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.back()}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-sm px-3 py-1",
                      campaign.status === 'completed' && 'bg-green-100 text-green-800 border-green-200',
                      campaign.status === 'sending' && 'bg-blue-100 text-blue-800 border-blue-200',
                      campaign.status === 'failed' && 'bg-red-100 text-red-800 border-red-200',
                      campaign.status === 'draft' && 'bg-gray-100 text-gray-800 border-gray-200',
                      campaign.status === 'scheduled' && 'bg-purple-100 text-purple-800 border-purple-200'
                    )}
                  >
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-green-50 mt-1">
                  {campaign.description || `Template: ${campaign.templateName}`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/whatsapp/campaigns/${campaignId}/stats`)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                View Stats
              </Button>

              {canSend && (
                <Button 
                  onClick={sendCampaign} 
                  disabled={sending}
                  className={cn(
                    'bg-white text-green-600 hover:bg-green-50',
                    canRetry && 'border border-green-200'
                  )}
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {canRetry ? 'Retry Campaign' : 'Send Campaign'}
                    </>
                  )}
                </Button>
              )}

              {/* Pause / Resume controls */}
              {campaign.status === 'sending' && (
                <Button
                  variant="ghost"
                  onClick={pauseCampaign}
                  className="text-white bg-white/10 hover:bg-white/20"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}

              {campaign.status === 'paused' && (
                <Button
                  variant="secondary"
                  onClick={resumeCampaign}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              )}

              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={deleting}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the campaign.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteCampaign}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress (if sending) */}
      {campaign.status === 'sending' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
              Campaign Progress
            </CardTitle>
            <CardDescription>
              Sending {campaign.sentCount} of {campaign.totalRecipients} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-700">{progress}% Complete</span>
                <span className="text-muted-foreground">
                  {campaign.totalRecipients - campaign.sentCount} remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-blue-600" />
              Live Send Timeline
            </CardTitle>
            <CardDescription>Follow each stage as recipients move through the queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                      step.active
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent bg-muted/40'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border',
                        step.active
                          ? 'border-blue-400 bg-blue-100 text-blue-700'
                          : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-4 w-4 text-slate-600" />
              Queue Snapshot
            </CardTitle>
            <CardDescription>Refreshed every few seconds while this page is open.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[{
                label: 'Pending queue',
                value: summary.pending,
              }, {
                label: 'Currently sending',
                value: summary.sending,
              }, {
                label: 'Retry queue',
                value: summary.retry,
              }, {
                label: 'Delivered',
                value: summary.delivered,
              }, {
                label: 'Read',
                value: summary.read,
              }, {
                label: 'Failures / opt-outs',
                value: totalAttention,
              }].map((item) => (
                <div key={item.label} className="rounded-md border border-slate-200 bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold">Throughput</p>
              <p className="mt-1">Target rate ~{messagesPerSecond} message{messagesPerSecond === 1 ? '' : 's'} per second.</p>
            </div>

            {summary.retry > 0 && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Retry pipeline</p>
                <p className="mt-1">Next retry {nextRetryLabel}.</p>
                {retrySchedule?.queue?.length ? (
                  <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                    {retrySchedule.queue.map((retry) => (
                      <li key={retry.id} className="flex items-center justify-between">
                        <span>Retry attempt {retry.retryCount}</span>
                        <span>{formatDistanceToNow(new Date(retry.scheduledAt), { addSuffix: true })}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{campaign.totalRecipients}</div>
            <p className="text-xs text-muted-foreground mt-1">Total audience size</p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{campaign.sentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">{campaign.deliveredCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryRate}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{campaign.readCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {readRate}% read rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-red-200 bg-red-50/50 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Failed</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{campaign.failedCount}</div>
            <p className="text-xs text-red-700 mt-1">Messages that couldn&apos;t be delivered</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Responded</CardTitle>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{campaign.respondedCount}</div>
            <p className="text-xs text-green-700 mt-1">Recipients who replied</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recipients</CardTitle>
              <CardDescription className="mt-1">
                Showing {campaign.recipients.length} recipients with their delivery status
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCampaign} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaign.recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-base">{recipient.name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">{recipient.phoneNumber}</p>
                  {recipient.errorMessage && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 rounded p-2">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{recipient.errorMessage}</p>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "mb-1",
                      (recipient.status === 'sent' || recipient.status === 'delivered' || recipient.status === 'read') && 'bg-green-100 text-green-800 border-green-200',
                      recipient.status === 'failed' && 'bg-red-100 text-red-800 border-red-200',
                      recipient.status === 'pending' && 'bg-gray-100 text-gray-800 border-gray-200'
                    )}
                  >
                    {recipient.status.charAt(0).toUpperCase() + recipient.status.slice(1)}
                  </Badge>
                  {recipient.sentAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(recipient.sentAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function resolveMessagesPerSecond(rateLimit?: number | null): number {
  const DEFAULT_MESSAGES_PER_SECOND = 80; // Updated to match backend optimization
  const MAX_MESSAGES_PER_SECOND = 100; // Updated to match backend optimization
  if (!rateLimit || rateLimit <= 0) {
    return DEFAULT_MESSAGES_PER_SECOND;
  }
  const derived = Math.floor(rateLimit / 60);
  return Math.min(MAX_MESSAGES_PER_SECOND, Math.max(1, derived));
}
