'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, FileText, Workflow, Megaphone, ArrowRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WhatsAppOverviewPage() {
  const router = useRouter();

  const features = [
    {
      title: 'Live Chat',
      description: 'Send and receive WhatsApp messages in real-time',
      icon: MessageSquare,
      href: '/whatsapp/chat',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      features: [
        'Two-way messaging',
        'Customer conversations',
        'Quick replies',
        'Media support (images, videos, documents)',
        'Message history'
      ]
    },
    {
      title: 'Templates',
      description: 'Create and manage message templates',
      icon: FileText,
      href: '/whatsapp/templates',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
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
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-10 w-10 text-green-600" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">WhatsApp Business</h1>
            <p className="text-lg text-muted-foreground">
              Complete WhatsApp Business API integration
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats or Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-2xl font-bold">Connected</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Active modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v22.0</div>
            <p className="text-xs text-muted-foreground">Meta Graph API</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Cloud API</div>
            <p className="text-xs text-muted-foreground">WhatsApp Business</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={() => router.push(feature.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.features.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Getting Started Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Quick guide to using WhatsApp Business features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">1</span>
              Create Templates
            </h4>
            <p className="text-sm text-muted-foreground ml-8">
              Visit the Templates section to create message templates. Templates require Meta approval (24-48 hours) before use.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">2</span>
              Build Flows (Optional)
            </h4>
            <p className="text-sm text-muted-foreground ml-8">
              Create interactive flows for advanced use cases like forms, bookings, and surveys. Flows must be published before use.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">3</span>
              Start Messaging
            </h4>
            <p className="text-sm text-muted-foreground ml-8">
              Use Live Chat for one-on-one conversations or Campaigns for bulk messaging. Both require approved templates to initiate conversations.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">4</span>
              Monitor Performance
            </h4>
            <p className="text-sm text-muted-foreground ml-8">
              Track template analytics, campaign performance, and message delivery rates across all features.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>
            WhatsApp Business API settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Your WhatsApp integration is configured via environment variables:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">META_WHATSAPP_PHONE_NUMBER_ID</code></li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">META_WHATSAPP_BUSINESS_ID</code></li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">META_WHATSAPP_ACCESS_TOKEN</code></li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">META_GRAPH_API_VERSION</code> (default: v22.0)</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">Documentation</h4>
            <div className="space-y-1">
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → Cloud API Documentation
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/business-management-api"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → Business Management API
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/flows"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → WhatsApp Flows Documentation
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
