'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, FileText, Workflow, Settings, TrendingUp } from 'lucide-react';
import TemplateManager from '@/components/whatsapp/TemplateManager';
import TemplateBuilder from '@/components/whatsapp/TemplateBuilder';
import FlowBuilder from '@/components/whatsapp/FlowBuilder';
import { useState } from 'react';

export default function WhatsAppManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Business Management</h1>
          <p className="text-muted-foreground">
            Manage templates, flows, and messaging campaigns
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="create-template" className="gap-2">
            <FileText className="h-4 w-4" />
            Create Template
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-2">
            <Workflow className="h-4 w-4" />
            Flows
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('templates')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Templates</CardTitle>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardDescription>
                  Manage WhatsApp message templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create, view, and manage approved message templates for marketing, utility, and authentication purposes.
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('create-template')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Template Builder</CardTitle>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <CardDescription>
                  Create new templates with ease
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Visual builder for creating WhatsApp templates with headers, bodies, footers, and interactive buttons.
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('flows')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Flows</CardTitle>
                  <Workflow className="h-8 w-8 text-green-600" />
                </div>
                <CardDescription>
                  Interactive user experiences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create and manage WhatsApp Flows for sign-ups, appointments, surveys, and lead generation.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
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
                  Use the Template Builder to create message templates. Templates require Meta approval before use.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">2</span>
                  Build Flows (Optional)
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Create interactive flows for advanced use cases like forms, bookings, and surveys.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">3</span>
                  Send Messages
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Once approved, use your templates to send messages. Access the chat interface in Settings → WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">4</span>
                  Monitor Performance
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Track template analytics, quality scores, and message delivery in the Templates tab.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-sm">⚠️ Important Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Templates require Meta approval (24-48 hours)</li>
                <li>Template names must be lowercase with only letters, numbers, and underscores</li>
                <li>Marketing templates require opt-in consent from users</li>
                <li>Flows must be published before use in templates</li>
                <li>Quality scores affect template approval rates</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        {/* Create Template Tab */}
        <TabsContent value="create-template">
          <TemplateBuilder onComplete={() => setActiveTab('templates')} />
        </TabsContent>

        {/* Flows Tab */}
        <TabsContent value="flows">
          <FlowBuilder onComplete={() => setActiveTab('flows')} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Configuration</CardTitle>
              <CardDescription>
                Manage your WhatsApp Business API settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Configure your WhatsApp settings in the environment variables:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>META_WHATSAPP_PHONE_NUMBER_ID</li>
                  <li>META_WHATSAPP_BUSINESS_ID</li>
                  <li>META_WHATSAPP_ACCESS_TOKEN</li>
                  <li>META_GRAPH_API_VERSION (default: v22.0)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Learn more about WhatsApp Business APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → Message Templates Documentation
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/flows"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → WhatsApp Flows Documentation
              </a>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                → Cloud API Documentation
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
