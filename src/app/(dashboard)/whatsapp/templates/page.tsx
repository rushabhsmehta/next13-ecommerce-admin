'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import TemplateManager from '@/components/whatsapp/TemplateManager';
import TemplateBuilder from '@/components/whatsapp/TemplateBuilder';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function WhatsAppTemplatesPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                Message Templates
              </Badge>
            </div>
            <div>
              <h1 className="text-4xl font-bold">WhatsApp Templates</h1>
              <p className="text-lg text-blue-50 mt-2">
                Create and manage pre-approved message templates for WhatsApp Business
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs with enhanced styling */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="list" className="gap-2 text-base">
            <FileText className="h-4 w-4" />
            All Templates
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2 text-base">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
        </TabsList>

        {/* Templates List Tab */}
        <TabsContent value="list" className="space-y-4">
          <TemplateManager />
        </TabsContent>

        {/* Create Template Tab */}
        <TabsContent value="create" className="space-y-4">
          <TemplateBuilder onComplete={() => setActiveTab('list')} />
        </TabsContent>
      </Tabs>

      {/* Enhanced Info Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-sm">Approval Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Templates typically get approved within <span className="font-semibold text-amber-600 dark:text-amber-400">24-48 hours</span> by Meta&apos;s review team
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-sm">Template Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Support for <span className="font-semibold text-blue-600 dark:text-blue-400">Marketing, Utility, and Authentication</span> template categories
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-sm">Quality Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Maintain <span className="font-semibold text-green-600 dark:text-green-400">high quality scores</span> to ensure better approval rates and delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Important Notes with better design */}
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-lg">Important Guidelines</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Template Naming</p>
                <p className="text-sm text-muted-foreground">Use lowercase letters, numbers, and underscores only</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Marketing Templates</p>
                <p className="text-sm text-muted-foreground">Require explicit opt-in consent from users</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Variable Usage</p>
                <p className="text-sm text-muted-foreground">Test templates with sample data before submission</p>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Quality Standards</p>
                <p className="text-sm text-muted-foreground">Monitor quality scores to maintain approval rates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
