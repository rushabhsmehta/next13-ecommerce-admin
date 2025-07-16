"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Send, 
  Eye, 
  RefreshCw, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  XCircle,
  ExternalLink,
  Copy,
  Trash2,
  Edit
} from 'lucide-react';

interface TwilioTemplate {
  sid: string;
  friendlyName: string;
  language: string;
  types: {
    'twilio/text': {
      body: string;
    };
  };
}

interface SendTemplateData {
  to: string;
  contentSid: string;
  contentVariables?: Record<string, string>;
}

interface CreateTemplateData {
  friendlyName: string;
  language: string;
  body: string;
}

export default function WhatsAppTemplateManager() {
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TwilioTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendData, setSendData] = useState<SendTemplateData>({
    to: '',
    contentSid: '',
    contentVariables: {}
  });
  const [createData, setCreateData] = useState<CreateTemplateData>({
    friendlyName: '',
    language: 'en',
    body: ''
  });

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/twilio/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
      toast.success(`Loaded ${data.templates?.length || 0} templates`);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!createData.friendlyName || !createData.body) {
      toast.error('Template name and body are required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/twilio/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const data = await response.json();
      toast.success('Template created successfully!');
      setShowCreateDialog(false);
      setCreateData({ friendlyName: '', language: 'en', body: '' });
      fetchTemplates(); // Refresh the list
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const sendTemplate = async () => {
    if (!sendData.to || !sendData.contentSid) {
      toast.error('Phone number and template are required');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/twilio/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });

      if (!response.ok) {
        throw new Error('Failed to send template');
      }

      const data = await response.json();
      toast.success('Template message sent successfully!');
      setShowSendDialog(false);
      setSendData({ to: '', contentSid: '', contentVariables: {} });
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Failed to send template message');
    } finally {
      setIsSending(false);
    }
  };

  const copyTemplateId = (templateSid: string) => {
    navigator.clipboard.writeText(templateSid);
    toast.success('Template ID copied to clipboard');
  };

  const formatTemplateBody = (body: string) => {
    // Simple variable detection - look for {{1}}, {{2}}, etc.
    const variables = body.match(/\{\{\d+\}\}/g) || [];
    return {
      formattedBody: body,
      variableCount: variables.length,
      variables: variables
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Template Management</h3>
          <p className="text-sm text-muted-foreground">
            Create, manage, and send WhatsApp templates via Twilio
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchTemplates}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new WhatsApp template. Use {`{{1}}, {{2}}`} etc. for variables.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., booking_confirmation"
                    value={createData.friendlyName}
                    onChange={(e) => setCreateData(prev => ({ ...prev, friendlyName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="template-language">Language</Label>
                  <Select
                    value={createData.language}
                    onValueChange={(value) => setCreateData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="template-body">Template Body</Label>
                  <Textarea
                    id="template-body"
                    placeholder="Hello {`{{1}}`}, your booking {`{{2}}`} is confirmed for {`{{3}}`}."
                    value={createData.body}
                    onChange={(e) => setCreateData(prev => ({ ...prev, body: e.target.value }))}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {`{{1}}, {{2}}, {{3}}`} etc. for dynamic content
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTemplate}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center p-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first WhatsApp template to get started.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          templates.map((template) => {
            const { formattedBody, variableCount } = formatTemplateBody(
              template.types?.['twilio/text']?.body || ''
            );
            
            return (
              <Card key={template.sid} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">
                      {template.friendlyName}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {template.language}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    ID: {template.sid.substring(0, 20)}...
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{formattedBody}</p>
                  </div>
                  
                  {variableCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {variableCount} variable{variableCount > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyTemplateId(template.sid)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy ID
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSendData(prev => ({ ...prev, contentSid: template.sid }));
                        setSelectedTemplate(template);
                        setShowSendDialog(true);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Send Template Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Template Message</DialogTitle>
            <DialogDescription>
              Send the selected template to a WhatsApp number
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium text-sm mb-1">{selectedTemplate.friendlyName}</h4>
                <p className="text-sm">{selectedTemplate.types?.['twilio/text']?.body}</p>
              </div>
              
              <div>
                <Label htmlFor="phone-number">Phone Number (with country code)</Label>
                <Input
                  id="phone-number"
                  placeholder="+1234567890"
                  value={sendData.to}
                  onChange={(e) => setSendData(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSendDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendTemplate}
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            WhatsApp Approval Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            After creating templates, you need to submit them for WhatsApp approval:
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.twilio.com/us1/develop/content/templates" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twilio Console Content Templates</a></li>
            <li>Find your template and click &ldquo;Submit for WhatsApp Approval&rdquo;</li>
            <li>Set the appropriate category (MARKETING, UTILITY, AUTHENTICATION)</li>
            <li>Wait for Meta&apos;s approval (usually 24-48 hours)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
