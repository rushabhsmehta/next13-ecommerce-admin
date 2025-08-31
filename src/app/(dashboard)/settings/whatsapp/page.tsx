'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Send, MessageSquare, Settings, CheckCircle, XCircle, FileText, Plus } from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  to: string;
  from: string;
  message: string;
  messageSid?: string;
  status: string;
  direction: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppConfig {
  isTwilioConfigured: boolean;
  accountSid: string;
  whatsappNumber: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export default function WhatsAppSettingsPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<{[key: string]: string}>({});
  const [useTemplate, setUseTemplate] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp/config');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Error fetching WhatsApp config:', error);
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/whatsapp/templates');
        const data = await response.json();
        if (data.success) {
          setTemplates(data.templates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchConfig();
    fetchMessages();
    fetchTemplates();
  }, []);

  const sendTestMessage = async () => {
    if (!phoneNumber || (!message && !useTemplate)) {
      toast.error('Please enter phone number and message or select a template');
      return;
    }

    setIsLoading(true);
    try {
      let response;
      
      if (useTemplate && selectedTemplate) {
        // Send template message
        response = await fetch('/api/whatsapp/send-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phoneNumber,
            templateId: selectedTemplate,
            variables: templateVariables,
          }),
        });
      } else {
        // Send regular message
        response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: phoneNumber,
            message: message,
          }),
        });
      }

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        toast.success('Message sent successfully!');
        setPhoneNumber('');
        setMessage('');
        setSelectedTemplate('');
        setTemplateVariables({});
        fetchMessages(); // Refresh the messages list
      } else {
        toast.error(`Failed to send message: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Initialize variables object
      const vars: {[key: string]: string} = {};
      template.variables.forEach(variable => {
        vars[variable] = '';
      });
      setTemplateVariables(vars);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/whatsapp/messages?limit=10');
      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-blue-500">Sent</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">WhatsApp Business Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Message Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Send Test Message</span>
            </CardTitle>
            <CardDescription>
              Send a test WhatsApp message using your Twilio configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Recipient Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +1 for US, +91 for India)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useTemplate"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useTemplate">Use Message Template</Label>
              </div>
            </div>

            {useTemplate ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded">
                      <Label className="text-sm font-medium">Template Preview:</Label>
                      <p className="text-sm mt-1">
                        {templates.find(t => t.id === selectedTemplate)?.body}
                      </p>
                    </div>

                    {(templates.find(t => t.id === selectedTemplate)?.variables?.length || 0) > 0 && (
                      <div className="space-y-2">
                        <Label>Template Variables</Label>
                        {templates.find(t => t.id === selectedTemplate)?.variables?.map((variable) => (
                          <div key={variable} className="space-y-1">
                            <Label className="text-sm">{variable}</Label>
                            <Input
                              placeholder={`Enter ${variable}`}
                              value={templateVariables[variable] || ''}
                              onChange={(e) => setTemplateVariables({
                                ...templateVariables,
                                [variable]: e.target.value
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>
            )}

            <Button
              onClick={sendTestMessage}
              disabled={isLoading || !phoneNumber || (!message && !useTemplate)}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>

        {/* Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configuration</span>
            </CardTitle>
            <CardDescription>
              Current WhatsApp Business API configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Twilio Account SID</Label>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-muted p-2 rounded flex-1">
                  {config ? config.accountSid : 'Loading...'}
                </code>
                {config?.isTwilioConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-muted p-2 rounded flex-1">
                  {config ? config.whatsappNumber : 'Loading...'}
                </code>
                {config?.isTwilioConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <code className="text-sm bg-muted p-2 rounded block">
                https://admin.aagamholidays.com/api/whatsapp/webhook
              </code>
              <p className="text-sm text-muted-foreground">
                Configure this URL in your Twilio WhatsApp settings for status updates
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Send Result</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Available Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Available Templates</span>
          </CardTitle>
          <CardDescription>
            Pre-defined message templates with variable placeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-muted-foreground">No templates found. Create templates to see them here.</p>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{template.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm">{template.body}</p>
                  </div>

                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Variables:</span>
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            Last 10 WhatsApp messages sent from your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchMessages} variant="outline" className="mb-4">
            Refresh Messages
          </Button>

          {messages.length === 0 ? (
            <p className="text-muted-foreground">No messages found. Send a test message to see results here.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">To: {msg.to}</span>
                      {getStatusBadge(msg.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm">{msg.message}</p>
                  </div>

                  {msg.messageSid && (
                    <div className="text-xs text-muted-foreground">
                      SID: {msg.messageSid}
                    </div>
                  )}

                  {msg.errorMessage && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">
                        Error: {msg.errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
