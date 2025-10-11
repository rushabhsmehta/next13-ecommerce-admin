'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import TemplateManager from '@/components/whatsapp/TemplateManager';
import TemplateBuilder from '@/components/whatsapp/TemplateBuilder';
import { useState } from 'react';

export default function WhatsAppTemplatesPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Templates</h1>
          <p className="text-muted-foreground">
            Manage and create WhatsApp message templates
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <FileText className="h-4 w-4" />
            All Templates
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <FileText className="h-4 w-4" />
            Create Template
          </TabsTrigger>
        </TabsList>

        {/* Templates List Tab */}
        <TabsContent value="list">
          <TemplateManager />
        </TabsContent>

        {/* Create Template Tab */}
        <TabsContent value="create">
          <TemplateBuilder onComplete={() => setActiveTab('list')} />
        </TabsContent>
      </Tabs>

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
            <li>Quality scores affect template approval rates</li>
            <li>Once approved, templates can be used in campaigns and chat</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
