'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow, Sparkles, Target, TrendingUp, Users, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import FlowBuilder from '@/components/whatsapp/FlowBuilder';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function WhatsAppFlowsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const useCases = [
    {
      icon: Users,
      title: 'Lead Generation',
      description: 'Collect customer information through interactive forms',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      icon: Target,
      title: 'Appointment Booking',
      description: 'Schedule meetings and reservations seamlessly',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900'
    },
    {
      icon: TrendingUp,
      title: 'Customer Surveys',
      description: 'Gather feedback and insights from your audience',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900'
    },
    {
      icon: Zap,
      title: 'Quick Sign-ups',
      description: 'Streamline registration and onboarding processes',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900'
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Workflow className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Interactive Experiences
              </Badge>
            </div>
            <div>
              <h1 className="text-4xl font-bold">WhatsApp Flows</h1>
              <p className="text-lg text-purple-50 mt-2">
                Build engaging, interactive experiences directly within WhatsApp conversations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Popular Use Cases</h2>
          <Badge variant="secondary">{useCases.length} Examples</Badge>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <Card key={index} className="border-t-4 border-t-purple-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <div className={`p-3 ${useCase.bgColor} rounded-xl w-fit`}>
                    <Icon className={`h-6 w-6 ${useCase.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <h3 className="font-semibold text-base">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Flow Builder */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Workflow className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Flow Builder</CardTitle>
              <CardDescription>
                Create and manage your WhatsApp Flows
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FlowBuilder key={refreshKey} onComplete={handleComplete} />
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">What are WhatsApp Flows?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              WhatsApp Flows enable rich, interactive experiences within conversations:
            </p>
            <div className="space-y-2">
              {[
                'Lead generation forms',
                'Appointment booking',
                'Customer surveys',
                'Sign-up forms',
                'Order tracking',
                'Feedback collection'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { title: 'Test Thoroughly', desc: 'Always test flows before deployment' },
                { title: 'Keep It Simple', desc: 'Focus on single, clear objectives' },
                { title: 'Mobile First', desc: 'Design for mobile screen sizes' },
                { title: 'Monitor Analytics', desc: 'Track completion and drop-off rates' }
              ].map((item, index) => (
                <div key={index} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentation with enhanced design */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Flow Documentation</CardTitle>
              <CardDescription>
                Learn more about creating effective WhatsApp Flows
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <a
              href="https://developers.facebook.com/docs/whatsapp/flows"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline p-4 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
            >
              <Workflow className="h-4 w-4 flex-shrink-0" />
              <span>WhatsApp Flows Documentation</span>
            </a>
            <a
              href="https://developers.facebook.com/docs/whatsapp/flows/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline p-4 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
            >
              <Target className="h-4 w-4 flex-shrink-0" />
              <span>Flow Examples & Best Practices</span>
            </a>
            <a
              href="https://developers.facebook.com/docs/whatsapp/flows/reference"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline p-4 rounded-lg bg-white dark:bg-black border hover:border-primary transition-colors"
            >
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>Flow JSON Schema Reference</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
