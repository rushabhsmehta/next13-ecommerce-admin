'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, FileText, Workflow, Megaphone, ArrowRight, Settings, Sparkles, CheckCircle2, Zap, Users, LayoutGrid, Image as ImageIcon, ServerCog, ShieldCheck, CircleAlert, Link as LinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type WhatsAppOverviewConfig = {
  provider: 'meta' | 'unknown';
  isCloudConfigured: boolean;
  whatsappNumber?: string | null;
  businessId?: string | null;
  apiVersion?: string;
  hasAccessToken?: boolean;
  hasWebhookToken?: boolean;
  worker?: {
    configured: boolean;
    ipAllowlistConfigured?: boolean;
    endpoint: string;
    supportsHttpTrigger: boolean;
    supportsCommandTrigger: boolean;
  };
};

export default function WhatsAppOverviewPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WhatsAppOverviewConfig | null>(null);
  const [workerCheck, setWorkerCheck] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [workerMessage, setWorkerMessage] = useState<string>('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/config');
        if (!response.ok) {
          throw new Error('Failed to load WhatsApp config');
        }
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Failed to load WhatsApp config', error);
      }
    };

    loadConfig();
  }, []);

  const workerConfigured = !!config?.worker?.configured;
  const workerEndpoint = config?.worker?.endpoint || '/api/internal/whatsapp/campaign-worker';

  const checkWorkerEndpoint = async () => {
    setWorkerCheck('checking');
    setWorkerMessage('');

    try {
      const response = await fetch(workerEndpoint);
      if (response.status === 401) {
        setWorkerCheck('ok');
        setWorkerMessage('Endpoint is reachable and correctly protected by bearer auth.');
        return;
      }

      if (response.ok) {
        setWorkerCheck('ok');
        setWorkerMessage('Endpoint responded successfully.');
        return;
      }

      setWorkerCheck('error');
      setWorkerMessage(`Unexpected status: ${response.status}`);
    } catch (error: any) {
      setWorkerCheck('error');
      setWorkerMessage(error?.message || 'Failed to reach the worker endpoint');
    }
  };

  const features = [
    {
      title: 'List of Customers',
      description: 'Manage WhatsApp-specific customers, tags, and opt-ins',
      icon: Users,
      href: '/whatsapp/customers',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-950',
      borderColor: 'border-l-teal-500',
      gradientFrom: 'from-teal-500',
      gradientTo: 'to-cyan-500',
      features: [
        'Dedicated WhatsApp customer list',
        'Tag-based segmentation',
        'CSV import with validation',
        'Opt-in tracking',
        'Campaign selection integration'
      ]
    },
    {
      title: 'Live Chat',
      description: 'Send and receive WhatsApp messages in real-time',
      icon: MessageSquare,
      href: '/whatsapp/chat',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-l-green-500',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-emerald-500',
      features: [
        'Two-way messaging',
        'Customer conversations',
        'Quick replies',
        'Media support (images, videos, documents)',
        'Message history'
      ]
    },
    {
      title: 'Media Library',
      description: 'Host reusable images for WhatsApp templates and flows',
      icon: ImageIcon,
      href: '/whatsapp/media',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      borderColor: 'border-l-indigo-500',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-purple-500',
      features: [
        'Local image storage',
        'Copyable public URLs',
        'Template media ready',
        'Meta-compliant formats',
        'No third-party dependency'
      ]
    },
    {
      title: 'Catalog',
      description: 'Curate and sync tour packages directly to Meta Commerce',
      icon: LayoutGrid,
      href: '/whatsapp/catalog',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      borderColor: 'border-l-emerald-500',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
      features: [
        'Rich tour package storytelling',
        'One-click Meta catalog sync',
        'Variant and pricing controls',
        'Archival and restore workflows',
        'Optimistic management toasts (coming soon)'
      ]
    },
    {
      title: 'Templates',
      description: 'Create and manage message templates',
      icon: FileText,
      href: '/whatsapp/templates',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-l-blue-500',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
      features: [
        'Template builder',
        'Marketing, utility, and auth templates',
        'Meta approval workflow',
        'Variable placeholders',
        'Button actions'
      ]
    },
    {
      title: 'Flows',
      description: 'Build interactive user experiences',
      icon: Workflow,
      href: '/whatsapp/flows',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      borderColor: 'border-l-purple-500',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
      features: [
        'Interactive forms',
        'Lead generation',
        'Appointment booking',
        'Surveys and feedback',
        'Custom workflows'
      ]
    },
    {
      title: 'Campaigns',
      description: 'Send bulk messages to multiple recipients',
      icon: Megaphone,
      href: '/whatsapp/campaigns',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-l-orange-500',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      features: [
        'Bulk messaging',
        'Recipient targeting',
        'Campaign scheduling',
        'Analytics and tracking',
        'Rate limiting'
      ]
    }
  ];

  return (
    <div className="space-y-8 p-8">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Powered by Meta
                </Badge>
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-2">WhatsApp Business Platform</h1>
                <p className="text-xl text-green-50 max-w-2xl">
                  Complete WhatsApp Business API integration with powerful messaging, templates, flows, and campaign management
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-6 -left-6 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-t-4 border-t-green-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {config?.isCloudConfigured === false ? (
                <CircleAlert className="h-6 w-6 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              )}
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {config ? (config.isCloudConfigured ? 'Connected' : 'Needs Setup') : 'Checking'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {config ? (config.isCloudConfigured ? 'Active & Ready' : 'Meta credentials missing') : 'Loading config'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-blue-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold">{features.length}</div>
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active modules</p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-purple-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{config?.apiVersion || 'v22.0'}</div>
            <p className="text-xs text-muted-foreground mt-2">Meta Graph API</p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-orange-500 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Cloud API</div>
            <p className="text-xs text-muted-foreground mt-2">WhatsApp Business</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 dark:border-emerald-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900">
              <ServerCog className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <CardTitle className="text-xl">Campaign Worker</CardTitle>
              <CardDescription>
                Background processor for queued WhatsApp campaigns
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {workerConfigured ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <CircleAlert className="h-4 w-4 text-amber-600" />
                )}
                Worker Token
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {workerConfigured ? 'Configured in environment' : 'Missing WHATSAPP_WORKER_TOKEN'}
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {config?.worker?.ipAllowlistConfigured ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <CircleAlert className="h-4 w-4 text-amber-600" />
                )}
                IP Allowlist
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {config?.worker?.ipAllowlistConfigured
                  ? 'WHATSAPP_WORKER_ALLOWED_IPS is configured'
                  : 'Optional, but recommended for Railway cron or fixed worker IPs'}
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                HTTP Trigger
              </div>
              <p className="mt-2 break-all text-sm text-muted-foreground">{workerEndpoint}</p>
            </div>

            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-orange-600" />
                Recommended Command
              </div>
              <p className="mt-2 text-sm text-muted-foreground">`npm run process-whatsapp-campaigns` every minute</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={checkWorkerEndpoint}
              disabled={workerCheck === 'checking'}
            >
              {workerCheck === 'checking' ? 'Checking...' : 'Test Endpoint'}
            </Button>
            <code className="rounded bg-background px-3 py-2 text-xs border">
              Authorization: Bearer WHATSAPP_WORKER_TOKEN
            </code>
          </div>

          {workerMessage ? (
            <div className={`rounded-lg border px-4 py-3 text-sm ${workerCheck === 'ok' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'}`}>
              {workerMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Feature Cards with Enhanced Design */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Platform Features</h2>
          <Badge variant="secondary" className="px-3">{features.length} Modules</Badge>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] border-l-4 ${feature.borderColor} relative overflow-hidden`}
                onClick={() => router.push(feature.href)}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradientFrom} ${feature.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-xl ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-7 w-7 ${feature.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-3 pt-2">
                    {feature.features.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Getting Started Guide - Enhanced */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Getting Started</CardTitle>
              <CardDescription className="text-base">
                Quick guide to using WhatsApp Business features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
                <h4 className="font-semibold text-lg">Create Templates</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                Visit the Templates section to create message templates. Templates require Meta approval (24-48 hours) before use.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">2</span>
                <h4 className="font-semibold text-lg">Build Flows (Optional)</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                Create interactive flows for advanced use cases like forms, bookings, and surveys. Flows must be published before use.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">3</span>
                <h4 className="font-semibold text-lg">Start Messaging</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                Use Live Chat for one-on-one conversations or Campaigns for bulk messaging. Both require approved templates to initiate conversations.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">4</span>
                <h4 className="font-semibold text-lg">Monitor Performance</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                Track template analytics, campaign performance, and message delivery rates across all features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Info - Enhanced */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Configuration</CardTitle>
              <CardDescription>
                WhatsApp Business API settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="text-muted-foreground mb-3">Your WhatsApp integration is configured via environment variables:</p>
            <div className="grid md:grid-cols-2 gap-2">
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                META_WHATSAPP_PHONE_NUMBER_ID
              </code>
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                META_WHATSAPP_BUSINESS_ID
              </code>
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                META_WHATSAPP_ACCESS_TOKEN
              </code>
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                META_GRAPH_API_VERSION
              </code>
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                WHATSAPP_WORKER_TOKEN
              </code>
              <code className="block text-xs bg-white dark:bg-black px-3 py-2 rounded border font-mono">
                WHATSAPP_WORKER_ALLOWED_IPS
              </code>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentation
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                Cloud API Docs
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/business-management-api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                Business API
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/flows"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                Flows Docs
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
