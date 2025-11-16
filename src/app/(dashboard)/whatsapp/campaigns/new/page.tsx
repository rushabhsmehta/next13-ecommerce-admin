'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, Users, FileText, Settings, Info, RefreshCw, Tag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type Step = 'details' | 'recipients' | 'settings' | 'review';

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  body?: string;
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
    whatsappCustomerId?: string;
  }>;
  rateLimit: number;
  scheduledFor?: string;
}

interface WhatsAppDirectoryCustomer {
  id: string;
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  email: string | null;
  tags: string[];
  isOptedIn: boolean;
}

interface WhatsAppCustomerListResponse {
  success: boolean;
  data: WhatsAppDirectoryCustomer[];
  tags: { tag: string; count: number }[];
}

interface TemplateVariableField {
  key: string;
  label: string;
  required: boolean;
  source: 'body' | 'header' | 'footer' | 'button';
  type: 'text' | 'image' | 'video' | 'document';
  placeholder?: string;
  helperText?: string;
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
    rateLimit: 4800, // 80 messages per second = 4800 per minute (optimized default)
      // send window removed
  });

  const [recipientInput, setRecipientInput] = useState({
    phoneNumber: '',
    name: '',
    variables: {} as Record<string, string>,
  });
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryCustomers, setDirectoryCustomers] = useState<WhatsAppDirectoryCustomer[]>([]);
  const [directoryTags, setDirectoryTags] = useState<{ tag: string; count: number }[]>([]);
  const [directorySearchInput, setDirectorySearchInput] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [directorySelectedRows, setDirectorySelectedRows] = useState<Record<string, boolean>>({});
  const [directorySelectedTags, setDirectorySelectedTags] = useState<string[]>([]);
  const [bulkVariableDefaults, setBulkVariableDefaults] = useState<Record<string, string>>({});

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!customerPickerOpen) {
      return;
    }
    const handle = setTimeout(() => setDirectorySearch(directorySearchInput), 400);
    return () => clearTimeout(handle);
  }, [directorySearchInput, customerPickerOpen]);

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

  const fetchDirectoryCustomers = useCallback(async () => {
    if (!customerPickerOpen) {
      return;
    }
    try {
      setDirectoryLoading(true);
  const params = new URLSearchParams();
  params.set('limit', '1000');
      if (directorySearch.trim()) {
        params.set('search', directorySearch.trim());
      }
      if (directorySelectedTags.length) {
        params.set('tags', directorySelectedTags.join(','));
      }
      const response = await fetch(`/api/whatsapp/customers?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load customers' }));
        throw new Error(error.error || 'Failed to load customers');
      }
      const payload = (await response.json()) as WhatsAppCustomerListResponse;
      setDirectoryCustomers(
        payload.data.map((customer) => ({
          ...customer,
          tags: Array.isArray(customer.tags)
            ? (customer.tags as unknown as string[])
            : [],
        }))
      );
      setDirectoryTags(payload.tags);
      setDirectorySelectedRows((current) => {
        const next: Record<string, boolean> = {};
        payload.data.forEach((customer) => {
          if (current[customer.id]) {
            next[customer.id] = true;
          }
        });
        return next;
      });
    } catch (error: any) {
      console.error('Error fetching WhatsApp customers directory', error);
      toast.error(error?.message || 'Could not load WhatsApp customers');
    } finally {
      setDirectoryLoading(false);
    }
  }, [customerPickerOpen, directorySearch, directorySelectedTags]);

  useEffect(() => {
    if (!customerPickerOpen) {
      return;
    }
    fetchDirectoryCustomers();
  }, [customerPickerOpen, fetchDirectoryCustomers]);

  useEffect(() => {
    if (customerPickerOpen) {
      return;
    }
    setDirectorySelectedRows({});
    setDirectorySearchInput('');
    setDirectorySearch('');
    setDirectorySelectedTags([]);
    setBulkVariableDefaults({});
  }, [customerPickerOpen]);

  // Get selected template details
  const selectedTemplate = templates.find(t => t.name === campaignData.templateName);
  
  const templateVariableFields = useMemo<TemplateVariableField[]>(() => {
    if (!selectedTemplate) {
      return [];
    }

    const fieldsByKey = new Map<string, TemplateVariableField>();
    const fieldOrder: string[] = [];

    const addField = (field: TemplateVariableField) => {
      const existing = fieldsByKey.get(field.key);
      if (!existing) {
        fieldsByKey.set(field.key, field);
        fieldOrder.push(field.key);
        return;
      }
      fieldsByKey.set(field.key, {
        ...existing,
        label: existing.label || field.label,
        required: existing.required || field.required,
        placeholder: existing.placeholder || field.placeholder,
        helperText: existing.helperText || field.helperText,
        type: existing.type || field.type,
        source: existing.source,
      });
    };

    const extractPlaceholders = (text: string | undefined) => {
      if (!text) return [] as string[];
      const seen = new Set<string>();
      const keys: string[] = [];
      const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text))) {
        const key = match[1];
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }
      return keys;
    };

    const components = selectedTemplate.components || [];
    const headerComponent = components.find(
      (component) => component.type === 'HEADER' || component.type === 'header'
    );
    const headerFormat = typeof headerComponent?.format === 'string'
      ? headerComponent.format.toUpperCase()
      : undefined;

  if (headerComponent && headerFormat === 'TEXT') {
      const headerExamples = Array.isArray(headerComponent.example?.header_text)
        ? (headerComponent.example?.header_text as string[])
        : [];
      extractPlaceholders(headerComponent.text).forEach((key, index) => {
        addField({
          key,
          label: /^\d+$/.test(key) ? `Variable ${key}` : key,
          required: true,
          source: 'header',
          type: 'text',
          placeholder: headerExamples[index] ? `e.g. ${headerExamples[index]}` : undefined,
        });
      });
    }

    if (headerComponent && headerFormat && headerFormat !== 'TEXT') {
      if (headerFormat === 'IMAGE') {
        addField({
          key: '_header_image',
          label: 'Header image URL',
          required: true,
          source: 'header',
          type: 'image',
          placeholder: 'https://example.com/banner.jpg',
          helperText: 'Provide a publicly accessible HTTPS image URL (JPEG/PNG, max 100MB per Meta).',
        });
      } else if (headerFormat === 'VIDEO') {
        addField({
          key: '_header_video',
          label: 'Header video URL',
          required: true,
          source: 'header',
          type: 'video',
          placeholder: 'https://example.com/promo.mp4',
          helperText: 'Provide a publicly accessible HTTPS video URL supported by WhatsApp.',
        });
      } else if (headerFormat === 'DOCUMENT') {
        addField({
          key: '_header_document',
          label: 'Header document URL',
          required: true,
          source: 'header',
          type: 'document',
          placeholder: 'https://example.com/brochure.pdf',
          helperText: 'Provide a publicly accessible HTTPS document URL (PDF, max 100MB per Meta).',
        });
        addField({
          key: '_header_document_filename',
          label: 'Header document filename',
          required: false,
          source: 'header',
          type: 'text',
          placeholder: 'e.g. brochure.pdf',
          helperText: 'Optional: customise the displayed filename for the document.',
        });
      } else if (headerFormat === 'IMAGE_AND_TEXT') {
        // Handle any future combined format defensively by capturing media requirement
        addField({
          key: '_header_image',
          label: 'Header image URL',
          required: true,
          source: 'header',
          type: 'image',
          placeholder: 'https://example.com/banner.jpg',
          helperText: 'Provide a publicly accessible HTTPS image URL (JPEG/PNG, max 100MB per Meta).',
        });
      }
    }

    const bodyPlaceholders = extractPlaceholders(selectedTemplate.body);
    const namedVariables = Array.isArray(selectedTemplate.namedVariables)
      ? selectedTemplate.namedVariables
      : [];

    bodyPlaceholders.forEach((key, index) => {
      const named = namedVariables[index];
      addField({
        key,
        label: named?.param_name || (/^\d+$/.test(key) ? `Variable ${key}` : key),
        required: true,
        source: 'body',
        type: 'text',
        placeholder: named?.example ? `e.g. ${named.example}` : undefined,
      });
    });

    const footerComponent = components.find(
      (component) => component.type === 'FOOTER' || component.type === 'footer'
    );
    if (footerComponent?.text) {
      extractPlaceholders(footerComponent.text).forEach((key) => {
        addField({
          key,
          label: /^\d+$/.test(key) ? `Variable ${key}` : key,
          required: true,
          source: 'footer',
          type: 'text',
        });
      });
    }

    return fieldOrder.map((key) => fieldsByKey.get(key)!).filter(Boolean);
  }, [selectedTemplate]);

  const requiredVariableCount = templateVariableFields.filter((field) => field.required).length;
  const optionalVariableCount = templateVariableFields.length - requiredVariableCount;

  const normalizeVariableValue = (value: unknown): string => {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  };

  const templateFieldOrder = useMemo(() => {
    const order = new Map<string, number>();
    templateVariableFields.forEach((field, index) => {
      order.set(field.key, index);
    });
    return order;
  }, [templateVariableFields]);


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

    if (templateVariableFields.length > 0) {
      const missing = templateVariableFields
        .filter((field) => field.required)
        .filter((field) => normalizeVariableValue(recipientInput.variables[field.key]) === '')
        .map((field) => field.label);
      if (missing.length > 0) {
        toast.error(`Fill all required template variables (${missing.join(', ')}) before adding`);
        return;
      }
    }

    const normalizedPhone = recipientInput.phoneNumber.trim();
    const alreadyExists = campaignData.recipients.some((recipient) => recipient.phoneNumber === normalizedPhone);
    if (alreadyExists) {
      toast.error('This phone number is already in the recipient list');
      return;
    }

    const variables: Record<string, string> = {};
    templateVariableFields.forEach((field) => {
      const rawValue = recipientInput.variables[field.key];
      const value = normalizeVariableValue(rawValue);
      if (field.required || value) {
        variables[field.key] = value;
      }
    });

    Object.entries(recipientInput.variables).forEach(([key, rawValue]) => {
      if (variables[key] !== undefined) {
        return;
      }
      const value = normalizeVariableValue(rawValue);
      if (value) {
        variables[key] = value;
      }
    });

    const newRecipient: {
      phoneNumber: string;
      name: string;
      variables: Record<string, string>;
    } = {
      phoneNumber: normalizedPhone,
      name: recipientInput.name,
      variables,
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

  const handleAddFromDirectory = () => {
    const selectedIds = Object.entries(directorySelectedRows)
      .filter(([, value]) => value)
      .map(([id]) => id);

    if (!selectedIds.length) {
      toast.error('Select at least one customer');
      return;
    }

    const selectedCustomers = directoryCustomers.filter((customer) => selectedIds.includes(customer.id));
    if (!selectedCustomers.length) {
      toast.error('Selected customers are not available in the current view');
      return;
    }

    if (templateVariableFields.length > 0) {
      const missingDefaults = templateVariableFields
        .filter((field) => field.required)
        .filter((field) => normalizeVariableValue(bulkVariableDefaults[field.key]) === '')
        .map((field) => field.label);
      if (missingDefaults.length > 0) {
        toast.error(`Provide default values for: ${missingDefaults.join(', ')}`);
        return;
      }
    }

    const existingPhones = new Set(campaignData.recipients.map((recipient) => recipient.phoneNumber));
    const newRecipients = selectedCustomers
      .filter((customer) => {
        if (existingPhones.has(customer.phoneNumber)) {
          return false;
        }
        existingPhones.add(customer.phoneNumber);
        return true;
      })
      .map((customer) => {
        const variables: Record<string, string> = {};
        templateVariableFields.forEach((field) => {
          const rawValue = bulkVariableDefaults[field.key];
          const value = normalizeVariableValue(rawValue);
          if (field.required || value) {
            variables[field.key] = value;
          }
        });

        return {
          phoneNumber: customer.phoneNumber,
          name: `${customer.firstName}${customer.lastName ? ` ${customer.lastName}` : ''}`,
          variables,
          whatsappCustomerId: customer.id,
        };
      });

    if (!newRecipients.length) {
      toast.error('All selected customers are already in the recipient list');
      return;
    }

    setCampaignData((prev) => ({
      ...prev,
      recipients: [...prev.recipients, ...newRecipients],
    }));
    setCustomerPickerOpen(false);
    toast.success(`Added ${newRecipients.length} WhatsApp customer${newRecipients.length > 1 ? 's' : ''}`);
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
                    setCampaignData((prev) => ({ 
                      ...prev, 
                      templateName: value,
                      templateLanguage: template?.language || 'en_US',
                      recipients: [],
                    }));
                    // Reset recipient variables when template changes
                    setRecipientInput({ phoneNumber: '', name: '', variables: {} });
                    setBulkVariableDefaults({});
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
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  {templateVariableFields.length === 0 ? (
                    <p className="text-sm text-blue-800">
                      This template has no variables. You only need the recipient phone numbers.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-blue-800">
                        <strong>{requiredVariableCount}</strong> required field{requiredVariableCount === 1 ? '' : 's'}
                        {optionalVariableCount > 0 && (
                          <span> • {optionalVariableCount} optional field{optionalVariableCount === 1 ? '' : 's'}</span>
                        )}
                      </p>
                      <p className="text-xs text-blue-700">
                        Fields: {templateVariableFields.map((field) => `${field.label}${field.required ? '' : ' (optional)'}`).join(', ')}
                      </p>
                    </>
                  )}
                  {selectedTemplate.components.find((c) => c.type === 'BODY')?.text && (
                    <p className="text-xs text-blue-700">
                      Template body: {selectedTemplate.components.find((c) => c.type === 'BODY')?.text}
                    </p>
                  )}
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
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>Add Recipient</CardTitle>
                  <CardDescription>
                    Add recipients manually or pull them from the WhatsApp customer directory.
                  </CardDescription>
                </div>
                <Dialog open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select from WhatsApp customers
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>Select WhatsApp Customers</DialogTitle>
                      <DialogDescription>
                        Choose customers from the dedicated WhatsApp directory. Opted-out contacts cannot be selected.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative">
                            <Input
                              value={directorySearchInput}
                              onChange={(event) => setDirectorySearchInput(event.target.value)}
                              placeholder="Search by name, email, or phone"
                              className="w-64"
                            />
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          </div>
                          <Button variant="outline" onClick={fetchDirectoryCustomers} disabled={directoryLoading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Selected: {Object.values(directorySelectedRows).filter(Boolean).length}
                        </div>
                      </div>

                      {directoryTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {directoryTags.map((tag) => (
                            <Button
                              key={tag.tag}
                              size="sm"
                              variant={directorySelectedTags.includes(tag.tag) ? 'default' : 'outline'}
                              className="flex items-center gap-2"
                              onClick={() =>
                                setDirectorySelectedTags((current) =>
                                  current.includes(tag.tag)
                                    ? current.filter((item) => item !== tag.tag)
                                    : [...current, tag.tag]
                                )
                              }
                            >
                              <Tag className="h-3 w-3" />
                              {tag.tag}
                              <Badge variant={directorySelectedTags.includes(tag.tag) ? 'secondary' : 'outline'}>
                                {tag.count}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      )}

                      <div className="rounded-lg border">
                        <div className="max-h-80 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                              <tr className="text-left">
                                <th className="w-10 p-3">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    aria-label="Select all"
                                    checked={
                                      directoryCustomers.filter((customer) => customer.isOptedIn).length > 0 &&
                                      directoryCustomers
                                        .filter((customer) => customer.isOptedIn)
                                        .every((customer) => directorySelectedRows[customer.id])
                                    }
                                    onChange={(event) => {
                                      const checked = event.target.checked;
                                      const next: Record<string, boolean> = {};
                                      if (checked) {
                                        directoryCustomers.forEach((customer) => {
                                          if (customer.isOptedIn) {
                                            next[customer.id] = true;
                                          }
                                        });
                                      }
                                      setDirectorySelectedRows(next);
                                    }}
                                  />
                                </th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Tags</th>
                                <th className="p-3">Opt-in</th>
                              </tr>
                            </thead>
                            <tbody>
                              {directoryLoading ? (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center">
                                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-green-500" />
                                  </td>
                                </tr>
                              ) : directoryCustomers.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                                    No WhatsApp customers found. Manage your directory in{' '}
                                    <Link href="/whatsapp/customers" className="text-primary hover:underline">
                                      List of Customers
                                    </Link>
                                    .
                                  </td>
                                </tr>
                              ) : (
                                directoryCustomers.map((customer) => (
                                  <tr
                                    key={customer.id}
                                    className={customer.isOptedIn ? 'border-t' : 'border-t bg-destructive/10'}
                                  >
                                    <td className="p-3 align-top">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!directorySelectedRows[customer.id]}
                                        onChange={(event) =>
                                          setDirectorySelectedRows((current) => ({
                                            ...current,
                                            [customer.id]: event.target.checked,
                                          }))
                                        }
                                        disabled={!customer.isOptedIn}
                                        aria-label={`Select ${customer.firstName}`}
                                      />
                                    </td>
                                    <td className="p-3 align-top">
                                      <div className="font-semibold">
                                        {customer.firstName} {customer.lastName || ''}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span>{customer.phoneNumber}</span>
                                        {customer.email && <span>{customer.email}</span>}
                                      </div>
                                    </td>
                                    <td className="p-3 align-top">
                                      {customer.tags.length ? (
                                        <div className="flex flex-wrap gap-2">
                                          {customer.tags.map((tag) => (
                                            <Badge key={`${customer.id}-${tag}`} variant="outline">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">No tags</span>
                                      )}
                                    </td>
                                    <td className="p-3 align-top">
                                      <Badge variant={customer.isOptedIn ? 'secondary' : 'destructive'}>
                                        {customer.isOptedIn ? 'Opted In' : 'Opted Out'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {templateVariableFields.length > 0 && (
                        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                          <div className="text-sm font-medium">
                            Template variables
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Provide default values to personalise the template for all selected customers. You can edit individual recipients after adding them.
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {templateVariableFields.map((field) => {
                              return (
                                <div key={field.key} className="grid gap-2">
                                  <Label htmlFor={`bulk-variable-${field.key}`}>
                                    {field.label}
                                    {field.required ? ' *' : ' (optional)'}
                                  </Label>
                                  <Input
                                    id={`bulk-variable-${field.key}`}
                                    value={bulkVariableDefaults[field.key] || ''}
                                    onChange={(event) =>
                                      setBulkVariableDefaults((prev) => ({
                                        ...prev,
                                        [field.key]: event.target.value,
                                      }))
                                    }
                                    placeholder={field.placeholder || undefined}
                                  />
                                  {field.helperText && (
                                    <p className="text-xs text-muted-foreground">{field.helperText}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {Object.values(directorySelectedRows).filter(Boolean).length} customer(s) selected.
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Button variant="outline" onClick={() => setCustomerPickerOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddFromDirectory} disabled={directoryLoading}>
                          Add to Recipients
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                {templateVariableFields.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span>
                        Template Variables{optionalVariableCount > 0 ? ' (Required & Optional)' : ' (Required)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {templateVariableFields.map((field) => {
                        const key = field.key;
                        return (
                          <div key={key}>
                            <Label htmlFor={`var${key}`}>
                              {field.label}
                              {field.required ? ' *' : ' (optional)'}
                            </Label>
                            <Input
                              id={`var${key}`}
                              placeholder={field.placeholder || `Enter value for {{${key}}}`}
                              value={recipientInput.variables[key] || ''}
                              onChange={(e) => setRecipientInput({ 
                                ...recipientInput, 
                                variables: {
                                  ...recipientInput.variables,
                                  [key]: e.target.value
                                }
                              })}
                            />
                            {field.helperText && (
                              <p className="text-xs text-muted-foreground mt-1">{field.helperText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {templateVariableFields.length === 0 && (
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
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{recipient.name || 'No name'}</p>
                            {recipient.whatsappCustomerId && (
                              <Badge variant="secondary" className="text-xs">
                                WhatsApp directory
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{recipient.phoneNumber}</p>
                          {Object.keys(recipient.variables).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Variables: {Object.entries(recipient.variables)
                                .sort(([a], [b]) => {
                                  const indexA = templateFieldOrder.get(a);
                                  const indexB = templateFieldOrder.get(b);
                                  if (indexA !== undefined && indexB !== undefined) {
                                    return indexA - indexB;
                                  }
                                  if (indexA !== undefined) return -1;
                                  if (indexB !== undefined) return 1;
                                  if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) {
                                    return Number(a) - Number(b);
                                  }
                                  return a.localeCompare(b);
                                })
                                .map(([key, value]) => `${key.startsWith('_') ? key : `{{${key}}}`}: ${value}`)
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
                min="60"
                max="6000"
                step="60"
                value={campaignData.rateLimit}
                onChange={(e) => setCampaignData({ ...campaignData, rateLimit: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Default: 4800 per minute (80 msg/sec). WhatsApp allows up to 6000/min (100 msg/sec).
              </p>
            </div>

            {/* Send window settings removed */}

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
                    <p className="text-xs text-muted-foreground">≈ {Math.floor(campaignData.rateLimit / 60)} msg/sec</p>
                  </div>

                  {/* Send window removed from summary */}

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
