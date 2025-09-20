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
import { Send, MessageSquare, Settings, CheckCircle, XCircle, FileText, Plus, Sun, Moon, Cloud, Info, Smile, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


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
  isCloudConfigured?: boolean;
  accountSid: string;
  whatsappNumber: string;
}

interface OrganizationInfo {
  id?: string;
  name?: string;
  logoUrl?: string | null;
}

interface WhatsAppTemplateButton {
  type?: string;
  text?: string;
  url?: string;
  phone?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[] | Record<string, string>;
  createdAt: string;
  updatedAt?: string;
  status?: string;
  whatsapp?: {
    hasCta: boolean;
    buttons: WhatsAppTemplateButton[];
  };
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
  const [useTemplate, setUseTemplate] = useState(true);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  // Preview state
  const [org, setOrg] = useState<OrganizationInfo>({});
  const [darkPreview, setDarkPreview] = useState(true);
  const [deliveryStage, setDeliveryStage] = useState<0 | 1 | 2 | 3>(0);
  const [previewScale, setPreviewScale] = useState(1.0);
  const [previewWide, setPreviewWide] = useState(true);
  const BASE_PREVIEW_WIDTH = 720; // px
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Interactive WhatsApp-like preview state
  type ChatMsg = { id: string; text: string; direction: 'in'|'out'; ts: number; status?: 0|1|2|3 };
  type Contact = { id: string; name: string; phone: string; avatarText?: string };
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [convos, setConvos] = useState<Record<string, ChatMsg[]>>({});
  const [typing, setTyping] = useState(false);
  const [liveSend, setLiveSend] = useState(false);
  const [sendingLive, setSendingLive] = useState(false);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(chatSearchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(chatSearchTerm.toLowerCase())
  );

  const handleAddNewChat = () => {
    if (!newChatNumber) return;
    const id = newChatNumber.trim();
    if (!/^\+\d{10,15}$/.test(id)) {
      toast.error('Invalid phone number. Use E.164 format (e.g. +1234567890)');
      return;
    }
    setContacts(prev => prev.some(c => c.id === id) ? prev : [...prev, { id, name: `whatsapp:${id.slice(0, 6)}…`, phone: id, avatarText: id.replace(/\D/g, '').slice(-2) || 'CT' }]);
    setActiveId(id);
    setShowNewChatDialog(false);
    setNewChatNumber('');
  };

  const substituteTemplate = (body: string, vars: {[k: string]: string}) => {
    if (!body) return '';
    return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars?.[k] ?? `{{${k}}}`));
  };

  const extractPlaceholders = (text: string): string[] => {
    if (!text) return [];
    const set = new Set<string>();
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      set.add(m[1]);
    }
    return Array.from(set);
  };

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

    const fetchOrg = async () => {
      try {
        const res = await fetch('/api/settings/organization');
        const data = await res.json();
        setOrg({ id: data?.id, name: data?.name, logoUrl: data?.logoUrl });
      } catch (e) {
        // non-blocking
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
    fetchOrg();
  }, []);

  // Simple delivery animation for preview bubble: none -> sent -> delivered -> read
  useEffect(() => {
    if (!phoneNumber && !selectedTemplate) return; // animate only when form has content
    setDeliveryStage(0);
    const t1 = setTimeout(() => setDeliveryStage(1), 500);
    const t2 = setTimeout(() => setDeliveryStage(2), 1000);
    const t3 = setTimeout(() => setDeliveryStage(3), 1500);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [phoneNumber, selectedTemplate]);

  // Initialize contacts & conversations from recent messages (fallback to samples)
  useEffect(() => {
    const fromRecent = () => {
      const map: Record<string, Contact> = {};
      (messages || []).forEach(m => {
        const key = m.to || 'unknown';
        if (!map[key]) map[key] = { id: key, name: key, phone: key, avatarText: (key.replace(/\D/g,'').slice(-2) || 'CT') };
      });
      const list = Object.values(map);
      return list.length ? list : [
        { id: '+1 555 0100', name: 'whatsapp:+9898…', phone: '+1 555 0100', avatarText: '01' },
        { id: '+1 555 0101', name: 'whatsapp:+91997…', phone: '+1 555 0101', avatarText: '38' },
      ];
    };
    const list = fromRecent();
    setContacts(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
    setConvos(prev => {
      const out: typeof prev = { ...prev };
      list.forEach(c => {
        if (!out[c.id]) {
          out[c.id] = [
            { id: 'm1', text: 'Hi! Please confirm the details.', direction: 'in', ts: Date.now()-5*60*1000, status: 3 },
            { id: 'm2', text: 'Thanks! We will get back to you.', direction: 'out', ts: Date.now()-4*60*1000, status: 3 },
          ];
        }
      });
      return out;
    });
  }, [messages]);

  const activeContact = contacts.find(c => c.id === activeId) || null;

  const sendPreviewMessage = () => {
    if (!activeContact) return;
    const tpl = templates.find(t => t.id === selectedTemplate);
    const hasVars = tpl && (Array.isArray(tpl.variables) ? tpl.variables.length > 0 : Object.keys(extractPlaceholders(tpl.body)).length > 0);

    if (selectedTemplate && hasVars && Object.values(templateVariables).some(v => !v)) {
        // If template is selected and has variables, but they are not filled,
        // we just return, because the modal should be handling it.
        // This prevents sending a message with unfilled placeholders.
        return;
    }

    const base = selectedTemplate ? (tpl?.body || '') : (message || '');
    const text = selectedTemplate ? substituteTemplate(base, templateVariables) : base;
    if (!text.trim()) return;

    // Clear message and template selection after preparing the message
    setMessage('');
    if (selectedTemplate) {
        setSelectedTemplate('');
        setTemplateVariables({});
    }

    const id = `m${Math.random().toString(36).slice(2,8)}`;
    const now = Date.now();
    setConvos(prev => {
      const arr = prev[activeContact.id] ? [...prev[activeContact.id]] : [];
      arr.push({ id, text, direction: 'out', ts: now, status: 0 });
      return { ...prev, [activeContact.id]: arr };
    });
    // Animate status per message id
    setTimeout(() => setConvos(p => ({...p, [activeContact.id]: p[activeContact.id].map(m => m.id===id?{...m, status:1}:m)})), 400);
    setTimeout(() => setConvos(p => ({...p, [activeContact.id]: p[activeContact.id].map(m => m.id===id?{...m, status:2}:m)})), 900);
    setTimeout(() => setConvos(p => ({...p, [activeContact.id]: p[activeContact.id].map(m => m.id===id?{...m, status:3}:m)})), 1400);
    // Live send via API if enabled
    if (liveSend) {
      setSendingLive(true);
      const to = activeContact.phone;
      (async () => {
        try {
          if (selectedTemplate) {
            const res = await fetch('/api/whatsapp/send-template', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, templateId: selectedTemplate, variables: templateVariables, saveToDb: true })
            });
            const j = await res.json();
            if (!res.ok || !j.success) throw new Error(j.error || 'Send failed');
            toast.success('Template sent');
          } else {
            const res = await fetch('/api/whatsapp/send', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, message: text, saveToDb: true })
            });
            const j = await res.json();
            if (!res.ok || !j.success) throw new Error(j.error || 'Send failed');
            toast.success('Message sent');
          }
        } catch (e: any) {
          toast.error(`Live send failed: ${e?.message || e}`);
        } finally {
          setSendingLive(false);
        }
      })();
    }
    // Fake reply
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const rid = `r${Math.random().toString(36).slice(2,8)}`;
      setConvos(p => {
        const arr = [...(p[activeContact.id] || [])];
        arr.push({ id: rid, text: '👍 Noted!', direction: 'in', ts: Date.now(), status: 3 });
        return { ...p, [activeContact.id]: arr };
      });
    }, 1800);
  };

  const sendTestMessage = async () => {
    if (!phoneNumber) {
      toast.error('Please enter phone number');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setIsLoading(true);
    try {
      // Always use unified endpoint; it will route to Cloud Template or local text
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          templateId: selectedTemplate,
          variables: templateVariables,
        }),
      });

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
      const list = Array.isArray(template.variables) && template.variables.length > 0
        ? (template.variables as string[])
        : extractPlaceholders(template.body);
      (list || []).forEach((variable: string) => {
        vars[variable] = '';
      });
      setTemplateVariables(vars);
      setMessage(''); // Clear manual message
    }
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const [cfgRes, tplRes] = await Promise.all([
        fetch('/api/whatsapp/config'),
        fetch('/api/whatsapp/templates?debug=1')
      ]);
      const cfg = await cfgRes.json();
      const tpl = await tplRes.json();
      const summary = {
        cloudConfigured: !!cfg.isCloudConfigured,
        phoneNumberId: cfg.whatsappNumber,
        templatesCount: tpl.count || (tpl.templates?.length || 0),
        sampleTemplates: (tpl.templates || []).slice(0, 5).map((t: any) => ({ name: t.name, status: t.status, hasCta: !!t.whatsapp?.hasCta })),
        debug: tpl.debug || [],
      };
      setDiagResult(summary);
      toast.success('Diagnostics complete');
    } catch (e: any) {
      setDiagResult({ error: e?.message || String(e) });
      toast.error('Diagnostics failed');
    } finally {
      setDiagLoading(false);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WhatsApp Business</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? 'Hide Admin Tools' : 'Show Admin Tools'}
        </Button>
      </div>

      {showAdvanced ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
            {/* Send Message Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Send Test Message</span>
                </CardTitle>
                <CardDescription>
                  Send a test WhatsApp message using your WhatsApp Cloud API configuration
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
                        <div className="bg-muted p-3 rounded space-y-2">
                          <Label className="text-sm font-medium">Template Preview:</Label>
                          <p className="text-sm mt-1">
                            {templates.find(t => t.id === selectedTemplate)?.body}
                          </p>
                          {(() => {
                            const tpl = templates.find(t => t.id === selectedTemplate) as WhatsAppTemplate | undefined;
                            if (!tpl) return null;
                            const isCloudTemplate = !!tpl.whatsapp || typeof tpl.status === 'string';
                            if (!isCloudTemplate) return null;
                            return (
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                {tpl.status && (<Badge variant="outline" className="text-xs">{tpl.status}</Badge>)}
                                {tpl.whatsapp?.hasCta ? (
                                  <>
                                    <Badge variant="default" className="text-xs">CTA</Badge>
                                    {tpl.whatsapp.buttons.slice(0, 3).map((b, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{b.text || b.type}</Badge>
                                    ))}
                                    {tpl.whatsapp.buttons.length > 3 && (
                                      <span className="text-xs text-muted-foreground">+{tpl.whatsapp.buttons.length - 3} more</span>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-xs">No CTA</Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {Object.keys(templateVariables).length > 0 && (
                          <div className="space-y-2">
                            <Label>Template Variables</Label>
                            {Object.keys(templateVariables).map((variable) => (
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
                  disabled={isLoading || !phoneNumber || !selectedTemplate}
                  className="w-full bg-[#25D366] hover:bg-[#22c15e] text-white"
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
                  <Label>Cloud API Status</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted p-2 rounded flex-1">
                      {config ? config.accountSid : 'Loading...'}
                    </code>
                    {config?.isCloudConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted p-2 rounded flex-1">
                      {config ? config.whatsappNumber : 'Loading...'}
                    </code>
                    {config?.isCloudConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Webhook URL (Cloud API)</Label>
                  <code className="text-sm bg-muted p-2 rounded block">
                    https://admin.aagamholidays.com/api/whatsapp/webhook
                  </code>
                  <p className="text-sm text-muted-foreground">
                    Configure this URL and your verify token in Meta Developer Console (WhatsApp Cloud API)
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

                      <div className="bg-muted p-3 rounded space-y-2">
                        <p className="text-sm">{template.body}</p>
                        {/* WhatsApp CTA hints */}
                        {template.whatsapp || template.status ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {template.status && (<Badge variant="outline" className="text-xs">{template.status}</Badge>)}
                            {template.whatsapp?.hasCta ? (
                              <>
                                <Badge variant="default" className="text-xs">CTA</Badge>
                                {template.whatsapp.buttons.slice(0, 4).map((b, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{b.text || b.type}</Badge>
                                ))}
                                {template.whatsapp.buttons.length > 4 && (
                                  <span className="text-xs text-muted-foreground">+{template.whatsapp.buttons.length - 4} more</span>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">No CTA</Badge>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {Array.isArray(template.variables) && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground">Variables:</span>
                          {(template.variables as string[]).map((variable) => (
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
          {/* Cloud API Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle>Cloud API Diagnostics</CardTitle>
              <CardDescription>Quick health check for configuration and templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button onClick={runDiagnostics} variant="outline" disabled={diagLoading}>
                  {diagLoading ? 'Running…' : 'Run Diagnostics'}
                </Button>
              </div>
              {diagResult && (
                <div className="text-sm bg-muted p-3 rounded">
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(diagResult, null, 2)}</pre>
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
        </>
      ) : (
        <div className="h-[calc(100vh-12rem)]">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              {/* Device frame */}
              <div className="w-full h-full">
                <div className={`w-full h-full overflow-hidden bg-background shadow-xl ${darkPreview ? 'bg-[#0b141a]' : 'bg-white'} relative`}>
                  {/* Overlay controls (compact) */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/20 backdrop-blur px-1 py-1 text-white">
                    <button aria-label="Toggle dark mode" onClick={() => setDarkPreview(v => !v)} className="p-1 hover:opacity-80">
                      {darkPreview ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button aria-label="Toggle live send" title="Send via API" onClick={() => setLiveSend(v => !v)} className={`p-1 hover:opacity-80 ${liveSend ? 'text-emerald-300' : 'text-white'}`}>
                      <Cloud className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      aria-label="Add chat"
                      title="Add chat from phone input"
                      onClick={() => setShowNewChatDialog(true)}
                      className={`p-1 rounded-full ${darkPreview ? 'bg-white/10 text-white' : 'bg-black/10 text-black'} hover:opacity-80`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Top bar like WhatsApp Web */}
                  <div className={`flex items-center justify-between px-4 py-2 ${darkPreview ? 'bg-[#202c33] text-[#e9edef]' : 'bg-slate-100 text-slate-800'} border-b ${darkPreview ? 'border-[#0b141a]' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {org?.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={org.logoUrl || ''} alt={org?.name || 'Logo'} className="h-full w-full object-cover" />
                        ) : (
                          <span className={`text-xs font-semibold ${darkPreview ? 'text-[#8696a0]' : 'text-slate-500]'}`}>{org?.name?.slice(0,1) || 'B'}</span>
                        )}
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">{org?.name || 'Your Business'}</div>
                        <div className={`text-[11px] ${darkPreview ? 'text-[#8696a0]' : 'text-slate-500'}`}>online</div>
                      </div>
                    </div>
                    {activeContact && (
                      <div className="flex items-center gap-4">
                        <button className={`text-xs ${darkPreview ? 'text-[#8696a0]' : 'text-slate-500'}`} onClick={() => setShowContactInfo(true)}>
                          {activeContact?.phone || '+1 234 567 890'}
                        </button>
                        <div className="flex items-center gap-2 text-gray-400">
                           <Search className="h-4 w-4 cursor-pointer hover:text-gray-200" />
                           <Info className="h-4 w-4 cursor-pointer hover:text-gray-200" onClick={() => setShowContactInfo(true)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main grid: left chat list + right chat */}
                  <div className="grid grid-cols-3 h-[calc(100%-49px)]">
                    {/* Left list */}
                    <div className={`col-span-1 flex flex-col ${darkPreview ? 'bg-[#111b21] border-r border-[#0b141a]' : 'bg-white border-r border-slate-200'}`}>
                      <div className={`p-2 border-b ${darkPreview ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="relative">
                          <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 ${darkPreview ? 'text-gray-400' : 'text-gray-500'}`} />
                          <Input 
                            placeholder="Search or start new chat" 
                            className={`pl-8 w-full rounded-full text-xs h-8 ${darkPreview ? 'bg-[#2a3942] border-transparent' : 'bg-gray-100'}`}
                            value={chatSearchTerm}
                            onChange={(e) => setChatSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {filteredContacts.map(c => {
                          const last = (convos[c.id] || [])[convos[c.id]?.length-1];
                          return (
                            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left ${activeId===c.id ? (darkPreview? 'bg-white/10' : 'bg-slate-100') : ''}`}>
                              <div className={`flex items-center gap-3 px-3 py-2 hover:bg-black/5 ${darkPreview ? 'hover:bg-white/5' : ''}`}>
                                <div className="h-9 w-9 rounded-full bg-emerald-200/70 flex items-center justify-center text-emerald-900 text-xs font-semibold">{c.avatarText || c.phone.replace(/\D/g,'').slice(-2) || 'CT'}</div>
                                <div className="min-w-0">
                                  <div className={`flex items-center justify-between text-sm ${darkPreview ? 'text-[#e9edef]' : 'text-slate-800'}`}>
                                    <span className="truncate">{c.name}</span>
                                    <span className={`ml-2 shrink-0 text-[10px] ${darkPreview ? 'text-[#8696a0]' : 'text-slate-500'}`}>{last ? new Date(last.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                  </div>
                                  <div className={`truncate text-xs ${darkPreview ? 'text-[#8696a0]' : 'text-slate-600'}`}>{last?.text || 'Start a chat'}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chat area */}
                    <div className={`col-span-2 flex flex-col ${darkPreview ? 'bg-[url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)] bg-[#0b141a]' : 'bg-[url(https://i.pinimg.com/736x/85/ec/df/85ecdf1c3642d55ba4373a8574d482a7.jpg)] bg-[#efeae2]'} bg-cover`}>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {!activeContact ? (
                          <div className={`text-sm ${darkPreview ? 'text-[#8696a0]' : 'text-slate-600'}`}>Select a chat</div>
                        ) : (
                          <>
                            {(convos[activeContact.id] || []).map(m => (
                              <div key={m.id} className={`flex ${m.direction==='out' ? 'justify-end' : 'items-end gap-2'}`}>
                                {m.direction==='in' && <div className="h-7 w-7 rounded-full bg-slate-300" />}
                                <div className={`relative rounded-lg px-3 py-2 text-sm shadow ${m.direction==='out' ? (darkPreview ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#d9fdd3] text-slate-800') : (darkPreview ? 'bg-[#202c33] text-[#e9edef]' : 'bg-white text-slate-800')}`}>
                                  {m.text}
                                  <div className={`absolute -bottom-0.5 ${m.direction === 'out' ? '-right-2' : '-left-2'} w-0 h-0 border-[8px] border-transparent ${m.direction === 'out' ? (darkPreview ? 'border-l-[#005c4b]' : 'border-l-[#d9fdd3]') : (darkPreview ? 'border-r-[#202c33]' : 'border-r-white')}`} />
                                </div>
                              </div>
                            ))}
                            {typing && (
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-slate-300" />
                                <div className={`rounded-full px-3 py-1 text-xs ${darkPreview ? 'bg-[#202c33] text-[#e9edef]' : 'bg-white text-slate-800'}`}>
                                  <span className="inline-block animate-pulse">●</span>
                                  <span className="inline-block animate-pulse delay-75 ml-1">●</span>
                                  <span className="inline-block animate-pulse delay-150 ml-1">●</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {/* Composer */}
                      <div className={`relative mt-auto flex items-center gap-2 p-3 ${darkPreview ? 'bg-[#202c33]' : 'bg-slate-100'} border-t ${darkPreview ? 'border-[#0b141a]' : 'border-slate-200'}`}>
                        {message.startsWith('/') && templates.length > 0 && !selectedTemplate && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-1">
                            <div className={`bg-white dark:bg-[#2a3942] rounded-lg shadow-lg overflow-hidden border dark:border-transparent`}>
                              <div className="p-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Select a template</div>
                              <div className="max-h-48 overflow-y-auto">
                                {templates.filter(t => t.name.toLowerCase().includes(message.slice(1).toLowerCase())).map(template => (
                                  <button
                                    key={template.id}
                                    onClick={() => handleTemplateChange(template.id)}
                                    className="block w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <span className="font-bold">{template.name}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.body}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className={darkPreview ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}>
                              <Smile className="h-5 w-5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 border-0">
                            <EmojiPicker 
                              onEmojiClick={(emoji) => setMessage(m => m + emoji.emoji)}
                              theme={darkPreview ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                            />
                          </PopoverContent>
                        </Popover>
                        <input
                          className={`flex-1 rounded-full px-4 py-2 text-sm outline-none ${darkPreview ? 'bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0]' : 'bg-white text-slate-800 placeholder:text-slate-400'}`}
                          placeholder={selectedTemplate ? 'Using template. Type to clear.' : 'Type a message or / for templates'}
                          value={selectedTemplate ? substituteTemplate(templates.find(t => t.id===selectedTemplate)?.body || '', templateVariables) : message}
                          onChange={(e) => {
                            if (selectedTemplate) {
                              setSelectedTemplate('');
                              setTemplateVariables({});
                            }
                            setMessage(e.target.value)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendPreviewMessage();
                            }
                          }}
                        />
                        <Button className="bg-[#25D366] hover:bg-[#22c15e] text-white h-9" onClick={sendPreviewMessage} disabled={!activeContact || sendingLive}>{sendingLive ? 'Sending…' : 'Send'}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {selectedTemplate && Object.keys(templateVariables).length > 0 && (
        <Dialog open={true} onOpenChange={() => { setSelectedTemplate(''); setTemplateVariables({}); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fill Template Variables</DialogTitle>
              <DialogDescription>
                Please provide values for the placeholders in the &quot;{templates.find(t => t.id === selectedTemplate)?.name}&quot; template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {Object.keys(templateVariables).map((variable) => (
                <div key={variable}>
                  <Label htmlFor={`var-${variable}`} className="text-sm font-medium">{variable}</Label>
                  <Input
                    id={`var-${variable}`}
                    placeholder={`Enter value for ${variable}`}
                    value={templateVariables[variable] || ''}
                    onChange={(e) => setTemplateVariables({
                      ...templateVariables,
                      [variable]: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedTemplate(''); setTemplateVariables({}); }}>Cancel</Button>
              <Button onClick={() => { sendPreviewMessage(); }}>Send Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new chat</DialogTitle>
            <DialogDescription>Enter a phone number in E.164 format to start a new conversation.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="+1234567890"
              value={newChatNumber}
              onChange={(e) => setNewChatNumber(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNewChat}>Start Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {activeContact && (
        <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Info</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p><span className="font-semibold">Name:</span> {activeContact.name}</p>
              <p><span className="font-semibold">Phone:</span> {activeContact.phone}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowContactInfo(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}



