'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow } from 'lucide-react';
import FlowBuilder from '@/components/whatsapp/FlowBuilder';
import { useState } from 'react';

export default function WhatsAppFlowsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleComplete = () => {
    // Refresh the flow builder to show the updated list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Workflow className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Flows</h1>
          <p className="text-muted-foreground">
            Create and manage interactive WhatsApp flows
          </p>
        </div>
      </div>

      {/* Flow Builder */}
      <FlowBuilder key={refreshKey} onComplete={handleComplete} />

      {/* Information Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What are WhatsApp Flows?</CardTitle>
            <CardDescription>
              Interactive experiences within WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">
              WhatsApp Flows allow you to create rich, interactive experiences directly within WhatsApp conversations:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Lead generation forms</li>
              <li>Appointment booking</li>
              <li>Customer surveys</li>
              <li>Sign-up forms</li>
              <li>Order tracking</li>
              <li>Feedback collection</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-sm">⚠️ Important Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Flows must be published before use in templates</li>
              <li>Test flows thoroughly before deploying to production</li>
              <li>Flow design should be mobile-optimized</li>
              <li>Keep flows simple and focused on a single goal</li>
              <li>Monitor flow completion rates and user drop-offs</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Flow Documentation</CardTitle>
          <CardDescription>
            Learn more about creating effective WhatsApp Flows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="https://developers.facebook.com/docs/whatsapp/flows"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            → WhatsApp Flows Documentation
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/flows/examples"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            → Flow Examples and Best Practices
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/flows/reference"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            → Flow JSON Schema Reference
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
