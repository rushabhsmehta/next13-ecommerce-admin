'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, Users, FileText, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

type Step = 'details' | 'recipients' | 'settings' | 'review';

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    example?: {
      body_text?: Array<Array<string>>;
      body_text_named_params?: Array<{
        param_name: string;
        example?: string;
      }>;
      header_text?: Array<string>;
    };
  }>;
  exampleValues?: Array<Array<string>>;
  namedVariables?: Array<{ param_name: string; example?: string }>;
}

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
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    templateName: '',
    templateLanguage: 'en_US',
    recipients: [],
    rateLimit: 10,
    sendWindowStart: 9,
    sendWindowEnd: 21,
  });

  const [recipientInput, setRecipientInput] = useState({
    phoneNumber: '',
    name: '',
    variables: {} as Record<string, string>,
  });

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/whatsapp/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates || []);
      
      // Set first template as default if available
      if (data.templates && data.templates.length > 0) {
        setCampaignData(prev => ({
          ...prev,
          templateName: data.templates[0].name,
          templateLanguage: data.templates[0].language,
        }));
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Get selected template details
  const selectedTemplate = templates.find(t => t.name === campaignData.templateName);
  
  // Extract parameter count from template body component
  const getTemplateParameters = (): number => {
    if (!selectedTemplate) return 0;
    
    if (selectedTemplate.namedVariables && selectedTemplate.namedVariables.length > 0) {
      return selectedTemplate.namedVariables.length;
    }

    if (Array.isArray(selectedTemplate.exampleValues) && selectedTemplate.exampleValues.length > 0) {
      const firstRow = selectedTemplate.exampleValues[0];
      if (Array.isArray(firstRow)) {
        return firstRow.length;
      }
    }

    const bodyComponent = selectedTemplate.components.find(c => c.type === 'BODY');
    const bodyText = bodyComponent?.text;
    if (!bodyText) return 0;

    const matches = bodyText.match(/\{\{[^}]+\}\}/g);
    return matches ? matches.length : 0;
  };

  const parameterCount = getTemplateParameters();

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

    const newRecipient: {
      phoneNumber: string;
      name: string;
      variables: Record<string, string>;
    } = {
      phoneNumber: recipientInput.phoneNumber,
      name: recipientInput.name,
      variables: recipientInput.variables,
    };

    setCampaignData({
      ...campaignData,
      recipients: [...campaignData.recipients, newRecipient],
    });

    setRecipientInput({ phoneNumber: '', name: '', variables: {} });
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
      router.push(`/whatsapp/campaigns/${data.campaign.id}`);
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
              {loadingTemplates ? (
                <div className="text-sm text-muted-foreground">Loading templates...</div>
              ) : (
                <Select
                  value={campaignData.templateName}
                  onValueChange={(value) => {
                    const template = templates.find(t => t.name === value);
                    setCampaignData({ 
                      ...campaignData, 
                      templateName: value,
                      templateLanguage: template?.language || 'en_US'
                    });
                    // Reset recipient variables when template changes
                    setRecipientInput({ phoneNumber: '', name: '', variables: {} });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.status === 'APPROVED').map((template) => (
                      <SelectItem key={template.id} value={template.name}>
                        {template.name} ({template.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Only approved templates can be used
              </p>
              {selectedTemplate && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{parameterCount} variable(s)</strong> required for this template
                  </p>
                  {selectedTemplate.namedVariables && selectedTemplate.namedVariables.length > 0 ? (
                    <p className="text-xs text-blue-700 mt-1">
                      Variables: {selectedTemplate.namedVariables.map(v => v.param_name).join(', ')}
                    </p>
                  ) : selectedTemplate.components.find(c => c.type === 'BODY')?.text ? (
                    <p className="text-xs text-blue-700 mt-1">
                      Template: {selectedTemplate.components.find(c => c.type === 'BODY')?.text}
                    </p>
                  ) : null}
                </div>
              )}
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

                {/* Dynamic variable inputs based on template parameters */}
                {parameterCount > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span>Template Variables (Required)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: parameterCount }, (_, i) => {
                        const index = i + 1;
                        const namedParam = selectedTemplate?.namedVariables?.[i];
                        const label = namedParam?.param_name ? namedParam.param_name : `Variable ${index}`;
                        const key = namedParam?.param_name || String(index);
                        return (
                          <div key={key}>
                            <Label htmlFor={`var${key}`}>
                              {label} *
                            </Label>
                            <Input
                              id={`var${key}`}
                              placeholder={namedParam?.example ? `e.g. ${namedParam.example}` : `Enter value for {{${key}}}`}
                              value={recipientInput.variables[key] || ''}
                              onChange={(e) => setRecipientInput({ 
                                ...recipientInput, 
                                variables: {
                                  ...recipientInput.variables,
                                  [key]: e.target.value
                                }
                              })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {parameterCount === 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ This template doesn&apos;t require any variables. Just add phone number and name.
                    </p>
                  </div>
                )}

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
                          {Object.keys(recipient.variables).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Variables: {Object.entries(recipient.variables)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([key, value]) => `{{${key}}}: ${value}`)
                                .join(', ')}
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
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-green-800">Campaign Summary</CardTitle>
                <CardDescription>Review your campaign before creating</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Campaign Name</p>
                    <p className="font-medium text-lg">{campaignData.name}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-medium text-lg">{campaignData.templateName}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Recipients</p>
                    <p className="font-medium text-3xl text-green-600">{campaignData.recipients.length}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Rate Limit</p>
                    <p className="font-medium text-lg">{campaignData.rateLimit} msg/min</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Send Window</p>
                    <p className="font-medium text-lg">
                      {campaignData.sendWindowStart}:00 - {campaignData.sendWindowEnd}:00
                    </p>
                  </div>

                  {campaignData.scheduledFor && (
                    <div className="bg-white p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Scheduled For</p>
                      <p className="font-medium text-lg">
                        {new Date(campaignData.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {campaignData.description && (
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{campaignData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-900">Important</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    This campaign will be created as a draft. You can review it and start sending from the campaign details page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
            <p className="text-green-50 mt-1">
              Send WhatsApp templates to multiple customers
            </p>
          </div>
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
                    flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                    ${isActive ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/50 scale-110' : ''}
                    ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'border-gray-300 text-gray-400' : ''}
                  `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-sm mt-2 text-center ${isActive ? 'font-semibold text-green-600' : ''}`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-2">
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
          className="min-w-[120px]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {currentStep === 'review' ? (
          <Button 
            onClick={createCampaign} 
            disabled={loading}
            className="min-w-[160px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            className="min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
