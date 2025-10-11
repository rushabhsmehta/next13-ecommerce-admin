'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, Users, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

type Step = 'details' | 'recipients' | 'settings' | 'review';

interface CampaignData {
  name: string;
  description: string;
  templateName: string;
  templateLanguage: string;
  recipients: Array<{
    phoneNumber: string;
    name: string;
    variables: Record<string, string>;
  }>;
  rateLimit: number;
  sendWindowStart: number;
  sendWindowEnd: number;
  scheduledFor?: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    templateName: 'tour_package_marketing',
    templateLanguage: 'en_US',
    recipients: [],
    rateLimit: 10,
    sendWindowStart: 9,
    sendWindowEnd: 21,
  });

  const [recipientInput, setRecipientInput] = useState({
    phoneNumber: '',
    name: '',
    var1: '',
    var2: '',
  });

  const steps: { id: Step; title: string; icon: any }[] = [
    { id: 'details', title: 'Campaign Details', icon: FileText },
    { id: 'recipients', title: 'Recipients', icon: Users },
    { id: 'settings', title: 'Settings', icon: Settings },
    { id: 'review', title: 'Review & Send', icon: Send },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const addRecipient = () => {
    if (!recipientInput.phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    const newRecipient = {
      phoneNumber: recipientInput.phoneNumber,
      name: recipientInput.name,
      variables: {
        '1': recipientInput.var1,
        '2': recipientInput.var2,
      },
    };

    setCampaignData({
      ...campaignData,
      recipients: [...campaignData.recipients, newRecipient],
    });

    setRecipientInput({ phoneNumber: '', name: '', var1: '', var2: '' });
    toast.success('Recipient added');
  };

  const removeRecipient = (index: number) => {
    setCampaignData({
      ...campaignData,
      recipients: campaignData.recipients.filter((_, i) => i !== index),
    });
    toast.success('Recipient removed');
  };

  const createCampaign = async () => {
    if (!campaignData.name) {
      toast.error('Campaign name is required');
      return;
    }

    if (campaignData.recipients.length === 0) {
      toast.error('At least one recipient is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          targetType: 'manual',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      const data = await response.json();
      toast.success('Campaign created successfully!');
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Bali Summer Promotion 2025"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this campaign"
                value={campaignData.description}
                onChange={(e) => setCampaignData({ ...campaignData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="template">WhatsApp Template</Label>
              <Select
                value={campaignData.templateName}
                onValueChange={(value) => setCampaignData({ ...campaignData, templateName: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tour_package_marketing">Tour Package Marketing</SelectItem>
                  <SelectItem value="hello_world">Hello World</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Only approved templates can be used
              </p>
            </div>

            <div>
              <Label htmlFor="language">Template Language</Label>
              <Select
                value={campaignData.templateLanguage}
                onValueChange={(value) => setCampaignData({ ...campaignData, templateLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'recipients':
        return (
          <div className="space-y-6">
            {/* Add Recipient Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Recipient</CardTitle>
                <CardDescription>
                  Add recipients one by one or upload a CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+919978783238"
                      value={recipientInput.phoneNumber}
                      onChange={(e) => setRecipientInput({ ...recipientInput, phoneNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientName">Name</Label>
                    <Input
                      id="recipientName"
                      placeholder="Customer Name"
                      value={recipientInput.name}
                      onChange={(e) => setRecipientInput({ ...recipientInput, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="var1">Variable 1 (e.g., Package Name)</Label>
                    <Input
                      id="var1"
                      placeholder="Bali Premium Package"
                      value={recipientInput.var1}
                      onChange={(e) => setRecipientInput({ ...recipientInput, var1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="var2">Variable 2 (e.g., Price)</Label>
                    <Input
                      id="var2"
                      placeholder="₹45,000"
                      value={recipientInput.var2}
                      onChange={(e) => setRecipientInput({ ...recipientInput, var2: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={addRecipient} className="w-full">
                  Add Recipient
                </Button>
              </CardContent>
            </Card>

            {/* Recipients List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Recipients ({campaignData.recipients.length})
              </h3>
              {campaignData.recipients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No recipients added yet
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {campaignData.recipients.map((recipient, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div>
                          <p className="font-medium">{recipient.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{recipient.phoneNumber}</p>
                          {(recipient.variables['1'] || recipient.variables['2']) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Variables: {recipient.variables['1']}, {recipient.variables['2']}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rateLimit">Rate Limit (messages per minute)</Label>
              <Input
                id="rateLimit"
                type="number"
                min="1"
                max="60"
                value={campaignData.rateLimit}
                onChange={(e) => setCampaignData({ ...campaignData, rateLimit: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Recommended: 10 messages per minute to avoid rate limits
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sendWindowStart">Send Window Start (hour)</Label>
                <Input
                  id="sendWindowStart"
                  type="number"
                  min="0"
                  max="23"
                  value={campaignData.sendWindowStart}
                  onChange={(e) => setCampaignData({ ...campaignData, sendWindowStart: parseInt(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Start time: {campaignData.sendWindowStart}:00
                </p>
              </div>

              <div>
                <Label htmlFor="sendWindowEnd">Send Window End (hour)</Label>
                <Input
                  id="sendWindowEnd"
                  type="number"
                  min="0"
                  max="23"
                  value={campaignData.sendWindowEnd}
                  onChange={(e) => setCampaignData({ ...campaignData, sendWindowEnd: parseInt(e.target.value) })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  End time: {campaignData.sendWindowEnd}:00
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="scheduledFor">Schedule for Later (optional)</Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={campaignData.scheduledFor || ''}
                onChange={(e) => setCampaignData({ ...campaignData, scheduledFor: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Leave empty to send immediately
              </p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaignData.name}</p>
                </div>

                {campaignData.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{campaignData.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="font-medium">{campaignData.templateName}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Total Recipients</p>
                  <p className="font-medium text-2xl">{campaignData.recipients.length}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Rate Limit</p>
                  <p className="font-medium">{campaignData.rateLimit} messages per minute</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Send Window</p>
                  <p className="font-medium">
                    {campaignData.sendWindowStart}:00 - {campaignData.sendWindowEnd}:00
                  </p>
                </div>

                {campaignData.scheduledFor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled For</p>
                    <p className="font-medium">
                      {new Date(campaignData.scheduledFor).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> This campaign will be created as a draft. 
                You can review it and start sending from the campaign details page.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">
            Send WhatsApp templates to multiple customers
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300 text-gray-400' : ''}
                  `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-sm mt-2 ${isActive ? 'font-semibold' : ''}`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {currentStep === 'review' ? (
          <Button onClick={createCampaign} disabled={loading}>
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
