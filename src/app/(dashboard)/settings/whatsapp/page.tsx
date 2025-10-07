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


type WhatsAppProvider = 'meta' | 'unknown';

interface WhatsAppConfig {
  provider?: WhatsAppProvider;
  isCloudConfigured?: boolean;
  whatsappNumber?: string;
  isMetaConfigured?: boolean;
  meta?: {
    phoneNumberId: string;
    apiVersion: string;
    hasAccessToken: boolean;
  } | null;
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
  language?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  components?: any[];
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
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Interactive WhatsApp-like preview state
  type ChatMsg = { 
    id: string; 
    text: string; 
    direction: 'in'|'out'; 
    ts: number; 
    status?: 0|1|2|3;
    metadata?: {
      templateId?: string;
      templateName?: string;
      headerImage?: string;
      buttons?: Array<{type?: string; text?: string; url?: string; phone?: string}>;
      components?: any[];
    };
  };
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

    // Auto-refresh messages every 10 seconds
    const messageRefreshInterval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => {
      clearInterval(messageRefreshInterval);
    };
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

  // Initialize contacts & conversations from recent messages
  useEffect(() => {
    const buildContactsAndConvos = () => {
      if (!messages || messages.length === 0) {
        // No messages yet, return empty
        return { contacts: [], convos: {} };
      }

      const contactMap: Record<string, Contact> = {};
      const convoMap: Record<string, ChatMsg[]> = {};

      // Group messages by phone number (use 'to' for outbound, 'from' for inbound)
      messages.forEach(msg => {
        // Determine the contact phone number
        const contactPhone = msg.direction === 'inbound' ? msg.from : msg.to;
        
        if (!contactPhone || contactPhone === 'business') return;

        // Create contact if not exists
        if (!contactMap[contactPhone]) {
          // Clean phone number for display (remove whatsapp: prefix if present)
          const cleanPhone = contactPhone.replace(/^whatsapp:/, '');
          const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
          
          contactMap[contactPhone] = {
            id: contactPhone,
            name: formattedPhone, // Show clean formatted phone as name
            phone: contactPhone,
            avatarText: cleanPhone.replace(/\D/g, '').slice(-2) || 'CT'
          };
        }

        // Add message to conversation
        if (!convoMap[contactPhone]) {
          convoMap[contactPhone] = [];
        }

        // Extract readable message text and template metadata
        let messageText = msg.message || '[No content]';
        let templateMetadata: ChatMsg['metadata'] = undefined;
        
        // Check if message has metadata with template info (cast to any to avoid TS error until Prisma regenerates)
        const msgMetadata = (msg as any).metadata;
        if (msgMetadata?.templateId || msgMetadata?.templateName) {
          const template = templates.find(t => t.id === msgMetadata.templateId || t.name === msgMetadata.templateName);
          if (template) {
            templateMetadata = {
              templateId: template.id,
              templateName: template.name,
              headerImage: msgMetadata.headerImage,
              buttons: template.whatsapp?.buttons || msgMetadata.buttons,
              components: template.components
            };
          }
        }
        
        // If message is in old template ID format like [template:HXa7...], try to make it readable
        if (messageText.startsWith('[template:')) {
          const templateId = messageText.match(/\[template:([^\]]+)\]/)?.[1];
          if (templateId) {
            const template = templates.find(t => t.id === templateId);
            if (template) {
              messageText = template.body;
              templateMetadata = {
                templateId: template.id,
                templateName: template.name,
                buttons: template.whatsapp?.buttons,
                components: template.components
              };
            } else {
              messageText = `Template: ${templateId}`;
            }
          }
        }
        
        convoMap[contactPhone].push({
          id: msg.id || msg.messageSid || `msg-${Math.random()}`,
          text: messageText,
          direction: msg.direction === 'inbound' ? 'in' : 'out',
          ts: new Date(msg.createdAt).getTime(),
          status: msg.status === 'delivered' ? 2 : msg.status === 'read' ? 3 : msg.status === 'sent' ? 1 : 0,
          metadata: templateMetadata
        });
      });

      // Sort messages in each conversation by timestamp
      Object.keys(convoMap).forEach(phone => {
        convoMap[phone].sort((a, b) => a.ts - b.ts);
      });

      return {
        contacts: Object.values(contactMap),
        convos: convoMap
      };
    };

    const { contacts: newContacts, convos: newConvos } = buildContactsAndConvos();
    
    if (newContacts.length > 0) {
      setContacts(newContacts);
      setConvos(newConvos);
      
      // Set active contact if not already set
      if (!activeId || !newContacts.find(c => c.id === activeId)) {
        setActiveId(newContacts[0].id);
      }
      
      console.log('✅ Loaded contacts:', newContacts.length);
      console.log('✅ Conversations:', Object.keys(newConvos).length);
    }
  }, [messages, templates]);

  const activeContact = contacts.find(c => c.id === activeId) || null;

  const sendPreviewMessage = () => {
    if (!activeContact) return;
    const selectedTemplateId = selectedTemplate;
    const tpl = templates.find(t => t.id === selectedTemplateId);
    const hasVars = tpl && (Array.isArray(tpl.variables) ? tpl.variables.length > 0 : Object.keys(extractPlaceholders(tpl.body)).length > 0);

    if (selectedTemplateId && hasVars && Object.values(templateVariables).some(v => !v)) {
        // If template is selected and has variables, but they are not filled,
        // we just return, because the modal should be handling it.
        // This prevents sending a message with unfilled placeholders.
        return;
    }

    const base = selectedTemplateId ? (tpl?.body || '') : (message || '');
    const text = selectedTemplateId ? substituteTemplate(base, templateVariables) : base;
    if (!text.trim()) return;

    // Clear message and template selection after preparing the message
    setMessage('');
    if (selectedTemplateId) {
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
          if (selectedTemplateId) {
            if (!tpl) {
              throw new Error('Selected template not found');
            }
            const res = await fetch('/api/whatsapp/send-template', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to,
                templateId: tpl.id,
                templateName: tpl.name,
                languageCode: tpl.language || 'en_US',
                variables: templateVariables,
                saveToDb: true,
              })
            });
            const j = await res.json();
            if (!res.ok || !j.success) throw new Error(j.error || 'Send failed');
            toast.success('Template sent');
            // Refresh messages to show what was sent
            setTimeout(() => fetchMessages(), 1000);
          } else {
            const res = await fetch('/api/whatsapp/send', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, message: text, saveToDb: true })
            });
            const j = await res.json();
            if (!res.ok || !j.success) throw new Error(j.error || 'Send failed');
            toast.success('Message sent');
            // Refresh messages to show what was sent
            setTimeout(() => fetchMessages(), 1000);
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

  const openTemplatePreview = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    setShowTemplatePreview(true);
  };

  const sendTestMessage = async () => {
    // Use active contact from chat interface or fallback to phone number
    // Priority: activeContact (from chat) > phoneNumber (from form)
    const recipientPhone = activeContact?.phone || phoneNumber;
    
    if (!recipientPhone) {
      toast.error('Please select a contact or enter phone number');
      return;
    }
    
    console.log('📤 Sending to:', recipientPhone);
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) {
      toast.error('Selected template could not be found');
      return;
    }

    setIsLoading(true);
    try {
      // Process template variables into the correct format
      const processedVariables: any = {};
      
      Object.entries(templateVariables).forEach(([key, value]) => {
        if (key === '_header_image' && value) {
          processedVariables.headerImage = value;
        } else if (key === '_header_video' && value) {
          processedVariables.header = {
            type: 'video',
            video: { link: value }
          };
        } else if (key === '_header_document' && value) {
          const filename = templateVariables['_header_document_filename'] || 'document.pdf';
          processedVariables.header = {
            type: 'document',
            document: { link: value, filename }
          };
        } else if (key === '_header_document_filename') {
          // Skip, already handled in _header_document
        } else if (key.startsWith('_button_')) {
          // Handle button URL parameters
          const btnMatch = key.match(/_button_(\d+)_url/);
          if (btnMatch && value) {
            const btnIndex = parseInt(btnMatch[1]);
            processedVariables[`button${btnIndex}`] = [value];
          }
        } else if (value) {
          // Regular template variable
          processedVariables[key] = value;
        }
      });
      
      // Always use unified endpoint; it will route to Cloud Template or local text
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          templateId: tpl.id,
          templateName: tpl.name,
          templateBody: tpl.body, // Include template body for better message preview
          languageCode: tpl.language || 'en_US',
          variables: processedVariables,
          metadata: {
            templateId: tpl.id,
            templateName: tpl.name,
            headerImage: processedVariables.headerImage,
            buttons: tpl.whatsapp?.buttons,
            components: tpl.components
          }
        }),
      });

      const result = await response.json();
      setLastResult(result);

      if (result.success) {
        toast.success('Message sent successfully!');
        
        // If we're in chat mode, add the message to the conversation immediately
        if (activeContact) {
          const messageText = substituteTemplate(tpl.body, processedVariables);
          const tempId = `temp-${Date.now()}`;
          setConvos(prev => {
            const arr = prev[activeContact.phone] ? [...prev[activeContact.phone]] : [];
            arr.push({
              id: tempId,
              text: messageText,
              direction: 'out',
              ts: Date.now(),
              status: 1,
              metadata: {
                templateId: tpl.id,
                templateName: tpl.name,
                headerImage: processedVariables.headerImage,
                buttons: tpl.whatsapp?.buttons,
                components: tpl.components
              }
            });
            return { ...prev, [activeContact.phone]: arr };
          });
        }
        
        setPhoneNumber('');
        setMessage('');
        setSelectedTemplate('');
        setTemplateVariables({});
        
        // Refresh messages from database
        setTimeout(() => fetchMessages(), 1000);
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
      
      // Extract body variables
      const list = Array.isArray(template.variables) && template.variables.length > 0
        ? (template.variables as string[])
        : extractPlaceholders(template.body);
      (list || []).forEach((variable: string) => {
        vars[variable] = '';
      });
      
      // Check for header component in template.components
      const components = template.components || [];
      const headerComponent = components.find((c: any) => c.type === 'HEADER' || c.type === 'header');
      
      if (headerComponent) {
        const headerFormat = headerComponent.format || headerComponent.type;
        
        // Add header field based on format
        if (headerFormat === 'IMAGE' || headerFormat === 'image') {
          vars['_header_image'] = '';
        } else if (headerFormat === 'VIDEO' || headerFormat === 'video') {
          vars['_header_video'] = '';
        } else if (headerFormat === 'DOCUMENT' || headerFormat === 'document') {
          vars['_header_document'] = '';
          vars['_header_document_filename'] = '';
        } else if (headerFormat === 'TEXT' || headerFormat === 'text') {
          // Extract text variables from header
          const headerText = headerComponent.text || '';
          const headerVars = extractPlaceholders(headerText);
          headerVars.forEach((v: string) => {
            if (!vars[v]) vars[v] = '';
          });
        }
      }
      
      // Check for button components with dynamic URLs
      const buttonComponents = components.filter((c: any) => 
        (c.type === 'BUTTONS' || c.type === 'buttons') && c.buttons
      );
      
      buttonComponents.forEach((btnComp: any) => {
        btnComp.buttons?.forEach((btn: any, index: number) => {
          if (btn.type === 'URL' && btn.url && btn.url.includes('{{')) {
            // URL button with variable
            vars[`_button_${index}_url`] = '';
          }
        });
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
      const response = await fetch('/api/whatsapp/messages?limit=100');
      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
        console.log('📨 Fetched messages:', result.messages.length);
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
                  Send a test WhatsApp message using your configured provider
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
                              {template.language ? ` (${template.language})` : ''}
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
                            {Object.keys(templateVariables).map((variable) => {
                              // Determine field type and label
                              let fieldLabel = variable;
                              let fieldPlaceholder = `Enter ${variable}`;
                              let fieldType = 'text';
                              
                              if (variable === '_header_image') {
                                fieldLabel = '📷 Header Image URL';
                                fieldPlaceholder = 'https://example.com/image.jpg';
                                fieldType = 'url';
                              } else if (variable === '_header_video') {
                                fieldLabel = '🎥 Header Video URL';
                                fieldPlaceholder = 'https://example.com/video.mp4';
                                fieldType = 'url';
                              } else if (variable === '_header_document') {
                                fieldLabel = '📄 Header Document URL';
                                fieldPlaceholder = 'https://example.com/document.pdf';
                                fieldType = 'url';
                              } else if (variable === '_header_document_filename') {
                                fieldLabel = '📝 Document Filename';
                                fieldPlaceholder = 'document.pdf';
                              } else if (variable.startsWith('_button_')) {
                                const btnMatch = variable.match(/_button_(\d+)_url/);
                                if (btnMatch) {
                                  const btnIndex = parseInt(btnMatch[1]);
                                  fieldLabel = `🔗 Button ${btnIndex + 1} URL Parameter`;
                                  fieldPlaceholder = 'dynamic-value';
                                }
                              } else {
                                fieldLabel = `{{${variable}}}`;
                              }
                              
                              return (
                                <div key={variable} className="space-y-1">
                                  <Label className="text-sm font-medium">{fieldLabel}</Label>
                                  <Input
                                    type={fieldType}
                                    placeholder={fieldPlaceholder}
                                    value={templateVariables[variable] || ''}
                                    onChange={(e) => setTemplateVariables({
                                      ...templateVariables,
                                      [variable]: e.target.value
                                    })}
                                    className={variable.startsWith('_header_') || variable.startsWith('_button_') ? 'border-blue-200' : ''}
                                  />
                                  {variable === '_header_image' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS. Try: https://picsum.photos/800/400
                                    </p>
                                  )}
                                  {variable === '_header_video' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS and publicly accessible
                                    </p>
                                  )}
                                  {variable === '_header_document' && (
                                    <p className="text-xs text-muted-foreground">
                                      Must be HTTPS. Supported: PDF, DOC, DOCX, etc.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
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
                  <Label>Active Provider</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted p-2 rounded flex-1">
                      {config ? (
                        config.provider === 'meta'
                          ? 'Meta WhatsApp Cloud API'
                          : 'Not configured'
                      ) : 'Loading...'}
                    </code>
                    {config?.provider === 'unknown' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>

                {config?.isCloudConfigured && (
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted p-2 rounded flex-1">
                        {config?.whatsappNumber || 'Not configured'}
                      </code>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                )}

                <Separator />

                {config?.isCloudConfigured ? (
                  <div className="space-y-2">
                    <Label>Webhook URL (Cloud API)</Label>
                    <code className="text-sm bg-muted p-2 rounded block">
                      https://admin.aagamholidays.com/api/whatsapp/webhook
                    </code>
                    <p className="text-sm text-muted-foreground">
                      Configure this URL and your verify token in Meta Developer Console (WhatsApp Cloud API)
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Meta WhatsApp Cloud API is not configured. Please set META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN.
                  </div>
                )}
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
                <p className="text-muted-foreground">No approved templates found. Configure and approve templates in Meta Business Manager.</p>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{template.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {(() => {
                            const ts = template.updatedAt || template.createdAt;
                            return ts ? new Date(ts).toLocaleDateString() : '—';
                          })()}
                        </span>
                      </div>

                      <div className="bg-muted p-3 rounded space-y-2">
                        <p className="text-sm">{template.body}</p>
                        {/* WhatsApp CTA hints */}
                        {template.whatsapp || template.status ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {template.status && (<Badge variant="outline" className="text-xs">{template.status}</Badge>)}
                            {template.language && (<Badge variant="secondary" className="text-xs">{template.language}</Badge>)}
                            {template.category && (<Badge variant="outline" className="text-xs capitalize">{template.category.toLowerCase()}</Badge>)}
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
                          {activeContact?.name || activeContact?.phone?.replace(/^whatsapp:/, '') || '+1 234 567 890'}
                        </button>
                        <div className="flex items-center gap-2 text-gray-400">
                           <button 
                             onClick={() => {
                               fetchMessages();
                               toast.success('Messages refreshed');
                             }}
                             className="hover:text-gray-200"
                             title="Refresh messages"
                           >
                             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                             </svg>
                           </button>
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
                                <div className={`relative rounded-lg overflow-hidden shadow ${m.direction==='out' ? (darkPreview ? 'bg-[#005c4b]' : 'bg-[#d9fdd3]') : (darkPreview ? 'bg-[#202c33]' : 'bg-white')} max-w-md`}>
                                  {/* Header Image */}
                                  {m.metadata?.headerImage && (
                                    <div className="w-full">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img 
                                        src={m.metadata.headerImage} 
                                        alt="Template header" 
                                        className="w-full h-auto object-cover"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Message Body */}
                                  <div className={`px-3 py-2 text-sm ${m.direction==='out' ? (darkPreview ? 'text-[#e9edef]' : 'text-slate-800') : (darkPreview ? 'text-[#e9edef]' : 'text-slate-800')}`}>
                                    {m.text}
                                  </div>
                                  
                                  {/* Buttons */}
                                  {m.metadata?.buttons && m.metadata.buttons.length > 0 && (
                                    <div className={`border-t ${darkPreview ? 'border-white/10' : 'border-black/10'}`}>
                                      {m.metadata.buttons.map((btn, idx) => (
                                        <button
                                          key={idx}
                                          className={`w-full px-3 py-2 text-sm font-medium text-center ${idx > 0 ? (darkPreview ? 'border-t border-white/10' : 'border-t border-black/10') : ''} ${darkPreview ? 'text-[#00a5f4] hover:bg-white/5' : 'text-[#00a5f4] hover:bg-black/5'} transition-colors`}
                                          onClick={() => {
                                            if (btn.url) {
                                              window.open(btn.url, '_blank');
                                            } else if (btn.phone) {
                                              window.open(`tel:${btn.phone}`, '_blank');
                                            }
                                          }}
                                        >
                                          {btn.type === 'PHONE_NUMBER' && '📞 '}
                                          {btn.type === 'URL' && '🔗 '}
                                          {btn.text || 'Button'}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Tail */}
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
                        {showTemplatePicker && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-1 max-w-md mx-auto">
                            <div className={`bg-white dark:bg-[#2a3942] rounded-lg shadow-lg overflow-hidden border dark:border-transparent`}>
                              <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select a template</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowTemplatePicker(false)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                {templates.map(template => (
                                  <button
                                    key={template.id}
                                    onClick={() => {
                                      handleTemplateChange(template.id);
                                      setShowTemplatePicker(false);
                                    }}
                                    className="block w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{template.name}</span>
                                      {template.status && (
                                        <Badge variant="outline" className="text-xs">{template.status}</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{template.body}</p>
                                  </button>
                                ))}
                                {templates.length === 0 && (
                                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    No templates available
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                          className={darkPreview ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}
                          title="Select template"
                        >
                          <FileText className="h-5 w-5" />
                        </Button>
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
                          placeholder={selectedTemplate ? 'Template selected. Type to clear.' : 'Type a message...'}
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
        <Dialog open={true} onOpenChange={() => { setSelectedTemplate(''); setTemplateVariables({}); setShowTemplatePicker(false); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Template: {templates.find(t => t.id === selectedTemplate)?.name}</DialogTitle>
              <DialogDescription>
                {(liveSend && activeContact) || phoneNumber ? (
                  <>Sending to: <strong>{activeContact?.name || 'Contact'}</strong> ({activeContact?.phone || phoneNumber})</>
                ) : (
                  <>Fill in the details to preview and send this template</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Show phone number field only if:
                  - No active contact (chat mode has activeContact)
                  - AND no phone number pre-filled (admin tools mode has phoneNumber)
              */}
              {!activeContact && !phoneNumber && (
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label htmlFor="dialog-phone" className="text-sm font-semibold">📱 Recipient Phone Number</Label>
                  <Input
                    id="dialog-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
                </div>
              )}
              
              {/* Template Variables */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Template Variables</h4>
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

              {/* Preview Section */}
              <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message Preview
                </h4>
                <div className="bg-white dark:bg-gray-900 rounded-lg border overflow-hidden">
                  {/* Header Image Preview */}
                  {templateVariables['_header_image'] && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={templateVariables['_header_image']} 
                        alt="Header" 
                        className="w-full h-auto max-h-48 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {/* Message Body */}
                  <div className="p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {substituteTemplate(
                        templates.find(t => t.id === selectedTemplate)?.body || '',
                        templateVariables
                      )}
                    </p>
                  </div>
                  {/* Template Buttons Preview */}
                  {(() => {
                    const tpl = templates.find(t => t.id === selectedTemplate);
                    if (tpl?.whatsapp?.buttons && tpl.whatsapp.buttons.length > 0) {
                      return (
                        <div className="border-t px-3 py-2 space-y-1">
                          {tpl.whatsapp.buttons.map((btn, idx) => (
                            <div key={idx} className="text-center py-2 text-sm text-blue-600 dark:text-blue-400 font-medium border-t first:border-t-0">
                              {btn.text || btn.type}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                {Object.values(templateVariables).some(v => !v) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Some variables are empty. Fill all fields to see the complete preview.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedTemplate(''); setTemplateVariables({}); setShowTemplatePicker(false); }}>Cancel</Button>
              <Button 
                onClick={() => { 
                  sendTestMessage(); 
                  setSelectedTemplate(''); 
                  setTemplateVariables({});
                  setShowTemplatePicker(false);
                }}
                disabled={(!activeContact && !phoneNumber) || Object.values(templateVariables).some(v => !v)}
                className="bg-[#25D366] hover:bg-[#22c15e] text-white"
              >
                Send Template
              </Button>
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



