'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'react-hot-toast';
import { Send, MessageSquare, Settings, CheckCircle, XCircle, FileText, Plus, Sun, Moon, Cloud, Info, Smile, Search, X, MoreVertical, ArrowRight, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';


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
  
  // Ref for auto-scrolling to bottom of chat
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change or active contact changes
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [convos, activeId]);

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
        <div className="flex h-[calc(100vh-12rem)] rounded-lg shadow-lg border overflow-hidden bg-background">
          <style jsx global>{`
            .scrollbar-custom::-webkit-scrollbar {
              width: 6px;
            }
            .scrollbar-custom::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollbar-custom::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.2);
              border-radius: 3px;
            }
            .scrollbar-custom::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.4);
            }
          `}</style>
          
          {/* Chat Sidebar */}
          <div className="flex w-80 flex-col border-r bg-muted/30">
            <div className="flex items-center justify-between border-b p-4 bg-background/50">
              <h1 className="text-2xl font-bold">Chats</h1>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDarkPreview(v => !v)}
                  className="h-9 w-9"
                  title="Toggle dark/light preview"
                >
                  {darkPreview ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewChatDialog(true)}
                  className="h-9 w-9"
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 border-b bg-background/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  className="pl-9 bg-background border-border h-10"
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto scrollbar-custom p-2">
              {filteredContacts.map(c => {
                const last = (convos[c.id] || [])[convos[c.id]?.length-1];
                const isActive = activeId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all",
                      isActive && "bg-accent shadow-sm"
                    )}
                    onClick={() => setActiveId(c.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
                        {c.avatarText || c.phone.replace(/\D/g,'').slice(-2) || 'CT'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">{c.name}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
                          {last ? new Date(last.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">
                        {last?.text || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Main */}
          <div className="flex flex-1 flex-col bg-background">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between border-b p-4 bg-background/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold">
                        {activeContact.avatarText || activeContact.phone.replace(/\D/g,'').slice(-2) || 'CT'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{activeContact.name}</h2>
                      <p className="text-muted-foreground text-sm">
                        {activeContact.phone.replace(/^whatsapp:/, '')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        fetchMessages();
                        toast.success('Messages refreshed');
                      }}
                      title="Refresh messages"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowContactInfo(true)}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto scrollbar-custom p-6 bg-muted/10">
                  {(convos[activeContact.id] || []).map(m => (
                    <div key={m.id} className={cn(
                      "flex items-start gap-3",
                      m.direction === 'out' && "justify-end"
                    )}>
                      {m.direction === 'in' && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                            {activeContact.avatarText || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl p-3 shadow-sm",
                          m.direction === 'out'
                            ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md"
                            : "bg-background border rounded-bl-md"
                        )}
                      >
                        {m.metadata?.headerImage && (
                          <div className="mb-2 -mt-3 -mx-3 overflow-hidden rounded-t-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.metadata.headerImage}
                              alt="Header"
                              className="w-full h-auto max-h-[200px] object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        
                        {m.metadata?.buttons && m.metadata.buttons.length > 0 && (
                          <div className={cn(
                            "mt-2 -mb-3 -mx-3 border-t pt-1",
                            m.direction === 'out' ? "border-white/20" : "border-border"
                          )}>
                            {m.metadata.buttons.map((btn, idx) => (
                              <button
                                key={idx}
                                className={cn(
                                  "w-full px-3 py-2.5 text-sm font-medium text-center transition-colors",
                                  idx > 0 && (m.direction === 'out' ? "border-t border-white/20" : "border-t border-border"),
                                  m.direction === 'out' 
                                    ? "text-white hover:bg-white/10" 
                                    : "text-emerald-600 hover:bg-emerald-50"
                                )}
                                onClick={() => {
                                  if (btn.url) window.open(btn.url, '_blank');
                                  if (btn.phone) window.open(`tel:${btn.phone}`, '_blank');
                                }}
                              >
                                {btn.type === 'PHONE_NUMBER' && '📞 '}
                                {btn.type === 'URL' && '🔗 '}
                                {btn.text || 'Button'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {typing && (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-xs font-semibold">
                          {activeContact.avatarText || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-background border rounded-2xl rounded-bl-md p-4 shadow-sm">
                        <div className="flex gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{animationDelay: '0ms'}}></span>
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{animationDelay: '150ms'}}></span>
                          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatMessagesEndRef} />
                </div>

                <div className="flex items-center gap-3 border-t bg-background/80 backdrop-blur-sm p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    title="Select template"
                  >
                    <FileText className="h-5 w-5" />
                  </Button>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent">
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
                  
                  <Input
                    placeholder={selectedTemplate ? 'Template selected. Type to clear.' : 'Type a message...'}
                    className="flex-1 border-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-emerald-500/50 h-10 rounded-full px-4"
                    value={selectedTemplate ? substituteTemplate(templates.find(t => t.id===selectedTemplate)?.body || '', templateVariables) : message}
                    onChange={(e) => {
                      if (selectedTemplate) {
                        setSelectedTemplate('');
                        setTemplateVariables({});
                      }
                      setMessage(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendPreviewMessage();
                      }
                    }}
                  />
                  
                  <Button
                    size="icon"
                    className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                    onClick={sendPreviewMessage}
                    disabled={!activeContact || sendingLive}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>

                {showTemplatePicker && (
                  <div className="absolute bottom-20 left-4 right-4 max-w-md mx-auto">
                    <div className="bg-background border rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
                      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                        <div className="text-sm font-semibold">Select a template</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTemplatePicker(false)}
                          className="h-7 w-7 p-0 hover:bg-accent"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto scrollbar-custom">
                        {templates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => {
                              handleTemplateChange(template.id);
                              setShowTemplatePicker(false);
                            }}
                            className="block w-full text-left px-4 py-3 hover:bg-accent/50 border-b last:border-0 transition-all hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm">{template.name}</span>
                              {template.status && (
                                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">{template.status}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{template.body}</p>
                          </button>
                        ))}
                        {templates.length === 0 && (
                          <div className="p-6 text-sm text-muted-foreground text-center">
                            No templates available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a chat</p>
                  <p className="text-sm">Choose a conversation from the left to start messaging</p>
                </div>
              </div>
            )}
          </div>
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



