'use client';

import Image from 'next/image';
import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  TEMPLATE_BUTTON_TYPES,
  WHATSAPP_TEMPLATE_LIMITS,
  extractTemplateVariables,
  validateWhatsAppTemplateDraft,
  type TemplateButtonDraft,
  type TemplateCategory,
  type TemplateComponentDraft,
  type TemplateExamples,
  type TemplateHeaderFormat,
  type TemplateParameterFormat,
} from '@/lib/whatsapp-template-validation';

const SUPPORTED_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'it', label: 'Italian' },
  { code: 'id', label: 'Indonesian' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ur', label: 'Urdu' },
];

const CATEGORY_OPTIONS: Array<{
  value: TemplateCategory;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    value: 'UTILITY',
    label: 'Utility',
    description: 'Bookings, reminders, status updates',
    icon: FileText,
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
    description: 'Offers, promotions, trip inspiration',
    icon: Megaphone,
  },
  {
    value: 'AUTHENTICATION',
    label: 'Auth',
    description: 'Copy-code OTP verification',
    icon: ShieldCheck,
  },
];

const HEADER_OPTIONS: Array<{ value: TemplateHeaderFormat; label: string; icon: typeof FileText }> = [
  { value: 'TEXT', label: 'Text', icon: MessageSquare },
  { value: 'IMAGE', label: 'Image', icon: ImageIcon },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'PDF', icon: FileText },
  { value: 'LOCATION', label: 'Location', icon: MapPin },
];

const ADVANCED_OPTIONS = [
  'Carousel',
  'Catalog products',
  'GIF header',
  'Voice call',
  'Limited-time offer',
  'One-tap auth',
  'Zero-tap auth',
];

type SubmissionState =
  | { status: 'idle'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type UploadedTemplateMedia = {
  mediaType: 'image' | 'video' | 'document';
  contentType: string;
  fileName: string;
  url: string;
  metaHandle: string;
};

function createInitialComponents(): TemplateComponentDraft[] {
  return [{ type: 'BODY', text: '' }];
}

function sanitizeTemplateName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

function characterTone(length: number, limit: number) {
  if (length > limit) return 'text-red-600';
  if (length > limit * 0.85) return 'text-amber-600';
  return 'text-muted-foreground';
}

function componentLabel(component: TemplateComponentDraft) {
  if (component.type === 'HEADER') return `${component.format.toLowerCase()} header`;
  if (component.type === 'BODY') return 'body';
  if (component.type === 'FOOTER') return 'footer';
  return 'buttons';
}

function headerAccept(format?: TemplateHeaderFormat) {
  if (format === 'IMAGE') return 'image/jpeg,image/png,.jpg,.jpeg,.png';
  if (format === 'VIDEO') return 'video/mp4,.mp4';
  return 'application/pdf,.pdf';
}

export default function TemplateBuilder({ onComplete }: { onComplete?: () => void }) {
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState<TemplateCategory>('UTILITY');
  const [parameterFormat, setParameterFormat] = useState<TemplateParameterFormat>('named');
  const [allowCategoryChange, setAllowCategoryChange] = useState(true);
  const [components, setComponents] = useState<TemplateComponentDraft[]>(createInitialComponents);
  const [examples, setExamples] = useState<TemplateExamples>({});
  const [authSecurityRecommendation, setAuthSecurityRecommendation] = useState(true);
  const [authCodeExpiration, setAuthCodeExpiration] = useState(10);
  const [authButtonText, setAuthButtonText] = useState('Copy code');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: 'idle',
    message: 'Not submitted',
  });

  const isAuth = category === 'AUTHENTICATION';
  const headerComponent = components.find((component): component is Extract<TemplateComponentDraft, { type: 'HEADER' }> => component.type === 'HEADER');
  const bodyComponent = components.find((component): component is Extract<TemplateComponentDraft, { type: 'BODY' }> => component.type === 'BODY');
  const footerComponent = components.find((component): component is Extract<TemplateComponentDraft, { type: 'FOOTER' }> => component.type === 'FOOTER');
  const buttonsComponent = components.find((component): component is Extract<TemplateComponentDraft, { type: 'BUTTONS' }> => component.type === 'BUTTONS');

  const draft = useMemo(
    () => ({
      name: templateName,
      language,
      category,
      parameterFormat,
      allowCategoryChange,
      components,
      examples,
      auth: {
        addSecurityRecommendation: authSecurityRecommendation,
        codeExpirationMinutes: authCodeExpiration,
        copyCodeButtonText: authButtonText,
      },
    }),
    [
      allowCategoryChange,
      authButtonText,
      authCodeExpiration,
      authSecurityRecommendation,
      category,
      components,
      examples,
      language,
      parameterFormat,
      templateName,
    ]
  );

  const validation = useMemo(() => validateWhatsAppTemplateDraft(draft), [draft]);
  const blockingIssues = validation.issues.filter((issue) => issue.level === 'error');
  const warnings = validation.issues.filter((issue) => issue.level === 'warning');

  const variableRows = useMemo(() => {
    const rows: Array<{ source: 'header' | 'body' | `button:${number}`; label: string; variable: string }> = [];

    if (headerComponent?.format === 'TEXT') {
      extractTemplateVariables(headerComponent.text).forEach((variable) =>
        rows.push({ source: 'header', label: 'Header', variable })
      );
    }

    if (bodyComponent?.text) {
      extractTemplateVariables(bodyComponent.text).forEach((variable) =>
        rows.push({ source: 'body', label: 'Body', variable })
      );
    }

    buttonsComponent?.buttons?.forEach((button, index) => {
      if (button.type === 'URL') {
        extractTemplateVariables(button.url).forEach((variable) =>
          rows.push({ source: `button:${index}`, label: `Button ${index + 1}`, variable })
        );
      }
    });

    return rows;
  }, [bodyComponent?.text, buttonsComponent?.buttons, headerComponent?.format, headerComponent?.text]);

  const updateComponent = (type: TemplateComponentDraft['type'], updates: Partial<TemplateComponentDraft>) => {
    setComponents((current) =>
      current.map((component) =>
        component.type === type
          ? ({ ...component, ...updates } as TemplateComponentDraft)
          : component
      )
    );
  };

  const upsertHeader = (format: TemplateHeaderFormat = 'TEXT') => {
    setMediaFile(null);
    setComponents((current) => {
      const nextHeader: TemplateComponentDraft = {
        type: 'HEADER',
        format,
        text: format === 'TEXT' ? headerComponent?.text ?? '' : '',
        mediaHandle: format === headerComponent?.format ? headerComponent?.mediaHandle : '',
        mediaUrl: format === headerComponent?.format ? headerComponent?.mediaUrl : '',
        fileName: format === headerComponent?.format ? headerComponent?.fileName : '',
      };
      return current.some((component) => component.type === 'HEADER')
        ? current.map((component) => (component.type === 'HEADER' ? nextHeader : component))
        : [nextHeader, ...current];
    });
  };

  const removeComponent = (type: TemplateComponentDraft['type']) => {
    setComponents((current) => current.filter((component) => component.type !== type));
    if (type === 'HEADER') {
      setMediaFile(null);
      setExamples((current) => ({ ...current, header: {} }));
    }
  };

  const ensureFooter = () => {
    setComponents((current) =>
      current.some((component) => component.type === 'FOOTER')
        ? current
        : [...current, { type: 'FOOTER', text: '' }]
    );
  };

  const ensureButtons = () => {
    setComponents((current) =>
      current.some((component) => component.type === 'BUTTONS')
        ? current
        : [...current, { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: '' }] }]
    );
  };

  const setButton = (index: number, updates: Partial<TemplateButtonDraft>) => {
    setComponents((current) =>
      current.map((component) => {
        if (component.type !== 'BUTTONS') return component;
        const buttons = [...(component.buttons ?? [])];
        buttons[index] = { ...buttons[index], ...updates };
        return { ...component, buttons };
      })
    );
  };

  const addButton = () => {
    setComponents((current) =>
      current.map((component) => {
        if (component.type !== 'BUTTONS') return component;
        if ((component.buttons ?? []).length >= WHATSAPP_TEMPLATE_LIMITS.totalButtons) {
          toast.error('Maximum 10 buttons allowed.');
          return component;
        }
        return {
          ...component,
          buttons: [...(component.buttons ?? []), { type: 'QUICK_REPLY', text: '' }],
        };
      })
    );
  };

  const removeButton = (index: number) => {
    setComponents((current) =>
      current.map((component) => {
        if (component.type !== 'BUTTONS') return component;
        return {
          ...component,
          buttons: (component.buttons ?? []).filter((_, buttonIndex) => buttonIndex !== index),
        };
      })
    );
  };

  const updateExample = (source: 'header' | 'body' | `button:${number}`, variable: string, value: string) => {
    setExamples((current) => {
      if (source === 'header') {
        return { ...current, header: { ...(current.header ?? {}), [variable]: value } };
      }
      if (source === 'body') {
        return { ...current, body: { ...(current.body ?? {}), [variable]: value } };
      }
      const index = source.split(':')[1];
      return {
        ...current,
        buttons: {
          ...(current.buttons ?? {}),
          [index]: {
            ...(current.buttons?.[index] ?? {}),
            [variable]: value,
          },
        },
      };
    });
  };

  const getExample = (source: 'header' | 'body' | `button:${number}`, variable: string) => {
    if (source === 'header') return examples.header?.[variable] ?? '';
    if (source === 'body') return examples.body?.[variable] ?? '';
    const index = source.split(':')[1];
    return examples.buttons?.[index]?.[variable] ?? '';
  };

  const applyPreset = (preset: TemplateCategory) => {
    setCategory(preset);
    setParameterFormat('named');
    setAllowCategoryChange(true);
    setMediaFile(null);
    setExamples({});

    if (preset === 'AUTHENTICATION') {
      setTemplateName((current) => current || 'login_verification_code');
      setAuthSecurityRecommendation(true);
      setAuthCodeExpiration(10);
      setAuthButtonText('Copy code');
      return;
    }

    if (preset === 'MARKETING') {
      setTemplateName((current) => current || 'seasonal_travel_offer');
      setComponents([
        { type: 'HEADER', format: 'IMAGE', mediaHandle: '', mediaUrl: '' },
        {
          type: 'BODY',
          text: 'Hi {{customer_name}}, your {{destination}} holiday offer is ready. Reply or tap below to view the details.',
        },
        { type: 'FOOTER', text: 'Aagam Holidays' },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'URL', text: 'View offer', url: 'https://aagamholidays.com/travel/packages/{{package_slug}}' },
            { type: 'QUICK_REPLY', text: 'Talk to expert' },
          ],
        },
      ]);
      setExamples({
        body: { customer_name: 'Riya', destination: 'Kashmir' },
        buttons: { 0: { package_slug: 'kashmir-summer' } },
      });
      return;
    }

    setTemplateName((current) => current || 'booking_status_update');
    setComponents([
      { type: 'HEADER', format: 'TEXT', text: 'Booking {{booking_id}}' },
      {
        type: 'BODY',
        text: 'Hi {{customer_name}}, your trip status is now {{status}}. Our team will keep you updated here.',
      },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Thanks' }] },
    ]);
    setExamples({
      header: { booking_id: 'BK-1024' },
      body: { customer_name: 'Aagam Guest', status: 'confirmed' },
    });
  };

  const handleMediaSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setMediaFile(file);
  };

  const uploadTemplateMedia = async () => {
    if (!headerComponent || !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format)) {
      toast.error('Choose an image, video, or PDF header first.');
      return;
    }
    if (!mediaFile) {
      toast.error('Select a media file to upload.');
      return;
    }

    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', mediaFile, mediaFile.name);
      if (templateName) {
        formData.append('templateName', templateName);
      }

      const response = await fetch('/api/whatsapp/templates/upload-document', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Template media upload failed');
      }

      const media = (data.media || data.document) as UploadedTemplateMedia | undefined;
      if (!media?.metaHandle) {
        throw new Error('Upload succeeded but no Meta media handle was returned.');
      }

      updateComponent('HEADER', {
        mediaHandle: media.metaHandle,
        mediaUrl: media.url,
        fileName: media.fileName,
      } as Partial<TemplateComponentDraft>);
      setMediaFile(null);
      toast.success('Template media handle is ready.');
    } catch (error: any) {
      console.error('[template-builder] Media upload failed', error);
      toast.error(error?.message || 'Template media upload failed');
    } finally {
      setMediaUploading(false);
    }
  };

  const createTemplate = async () => {
    const currentValidation = validateWhatsAppTemplateDraft(draft);
    const firstError = currentValidation.issues.find((issue) => issue.level === 'error');

    if (!currentValidation.success) {
      setSubmission({ status: 'error', message: firstError?.message || 'Fix approval checklist items first.' });
      toast.error(firstError?.message || 'Fix approval checklist items first.');
      return;
    }

    setLoading(true);
    setSubmission({ status: 'idle', message: 'Submitting to Meta...' });

    try {
      const response = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        const metaDetails = data?.meta?.details || data?.meta?.raw?.message;
        throw new Error(metaDetails || data?.error || 'Failed to create template');
      }

      toast.success('Template submitted to Meta for review.');
      setSubmission({ status: 'success', message: data.message || 'Submitted for Meta review' });
      window.dispatchEvent(new Event('whatsapp-template-created'));
      onComplete?.();
    } catch (error: any) {
      console.error('[template-builder] Create template failed', error);
      setSubmission({ status: 'error', message: error?.message || 'Submission failed' });
      toast.error(error?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const previewText = (text: string | undefined, source: 'header' | 'body') =>
    (text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variable) => {
      const value = getExample(source, variable);
      return value || `{{${variable}}}`;
    });

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="rounded-lg border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Template Studio
                </Badge>
                <Badge variant="outline">Approval-ready core</Badge>
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Create WhatsApp template</h2>
                <p className="text-sm text-muted-foreground">
                  Build the template, attach Meta media handles, preview it, then submit for review.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-[180px] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Readiness</span>
                  <span className="font-semibold">{validation.readinessScore}%</span>
                </div>
                <Progress value={validation.readinessScore} className="h-2" />
              </div>
              <Button onClick={createTemplate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel title="Presets" icon={Sparkles}>
              <div className="space-y-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applyPreset(option.value)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30',
                        selected && 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50'
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Components" icon={Eye}>
              <div className="space-y-2">
                {(isAuth ? ['OTP body', 'Expiry footer', 'Copy code button'] : components.map(componentLabel)).map((label) => (
                  <div key={label} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="capitalize">{label}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Later" icon={Info}>
              <div className="space-y-2">
                {ADVANCED_OPTIONS.map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    <span>{item}</span>
                    <Badge variant="outline">Soon</Badge>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>

          <main className="space-y-5">
            <Panel title="Identity" icon={FileText}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Template name" hint="Lowercase, numbers, underscores">
                  <Input
                    value={templateName}
                    placeholder="booking_status_update"
                    onChange={(event) => setTemplateName(sanitizeTemplateName(event.target.value))}
                  />
                </Field>

                <Field label="Language">
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SUPPORTED_LANGUAGES.map((languageOption) => (
                        <SelectItem key={languageOption.code} value={languageOption.code}>
                          {languageOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="grid gap-2 sm:grid-cols-3">
                  {CATEGORY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = category === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setCategory(option.value)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm transition hover:border-emerald-300',
                          selected && 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50'
                        )}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!isAuth && (
                  <Field label="Parameters">
                    <Select value={parameterFormat} onValueChange={(value) => setParameterFormat(value as TemplateParameterFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="named">Named</SelectItem>
                        <SelectItem value="positional">Positional</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              {!isAuth && (
                <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium">Allow Meta category change</p>
                    <p className="text-xs text-muted-foreground">Recommended when Meta classifies the content differently.</p>
                  </div>
                  <Switch checked={allowCategoryChange} onCheckedChange={setAllowCategoryChange} />
                </div>
              )}
            </Panel>

            {isAuth ? (
              <Panel title="Authentication OTP" icon={ShieldCheck}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                    <div>
                      <p className="text-sm font-medium">Security recommendation</p>
                      <p className="text-xs text-muted-foreground">Adds Meta&apos;s recommended code safety text.</p>
                    </div>
                    <Switch checked={authSecurityRecommendation} onCheckedChange={setAuthSecurityRecommendation} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Code expiration" hint="1 to 90 minutes">
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={authCodeExpiration}
                        onChange={(event) => setAuthCodeExpiration(Number(event.target.value) || 10)}
                      />
                    </Field>
                    <Field label="Button text">
                      <Input value={authButtonText} onChange={(event) => setAuthButtonText(event.target.value)} />
                    </Field>
                  </div>
                </div>
              </Panel>
            ) : (
              <>
                <Panel title="Header" icon={MessageSquare} action={
                  headerComponent ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeComponent('HEADER')}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => upsertHeader('TEXT')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add header
                    </Button>
                  )
                }>
                  {headerComponent ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {HEADER_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const selected = headerComponent.format === option.value;
                          return (
                            <Button
                              type="button"
                              key={option.value}
                              size="sm"
                              variant={selected ? 'default' : 'outline'}
                              onClick={() => upsertHeader(option.value)}
                              className={selected ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>

                      {headerComponent.format === 'TEXT' && (
                        <Field
                          label="Header text"
                          hint={`${headerComponent.text?.length ?? 0}/${WHATSAPP_TEMPLATE_LIMITS.headerText}`}
                          hintClassName={characterTone(headerComponent.text?.length ?? 0, WHATSAPP_TEMPLATE_LIMITS.headerText)}
                        >
                          <Input
                            value={headerComponent.text ?? ''}
                            placeholder={parameterFormat === 'named' ? 'Booking {{booking_id}}' : 'Booking {{1}}'}
                            onChange={(event) => updateComponent('HEADER', { text: event.target.value } as Partial<TemplateComponentDraft>)}
                          />
                        </Field>
                      )}

                      {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format) && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                            <div className="space-y-2">
                              <Label>Template media handle</Label>
                              <Input
                                value={headerComponent.mediaHandle ?? ''}
                                placeholder="Upload below or paste a Meta handle"
                                onChange={(event) => updateComponent('HEADER', { mediaHandle: event.target.value } as Partial<TemplateComponentDraft>)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Public URLs are kept for preview; Meta submission uses this handle.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Upload</Label>
                              <Input type="file" accept={headerAccept(headerComponent.format)} onChange={handleMediaSelection} disabled={mediaUploading} />
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={uploadTemplateMedia}
                                disabled={!mediaFile || mediaUploading}
                              >
                                {mediaUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                                Upload
                              </Button>
                            </div>
                          </div>
                          {(mediaFile || headerComponent.fileName || headerComponent.mediaUrl) && (
                            <div className="mt-3 rounded-md border bg-background p-3 text-xs text-muted-foreground">
                              {mediaFile && <p>Selected: {mediaFile.name}</p>}
                              {headerComponent.fileName && <p>Ready: {headerComponent.fileName}</p>}
                              {headerComponent.mediaUrl && <p className="break-all">Preview URL: {headerComponent.mediaUrl}</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {headerComponent.format === 'LOCATION' && (
                        <div className="rounded-lg border bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                          Location coordinates are supplied when the approved template is sent.
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyPanel icon={MessageSquare} text="Headers are optional. Add one when it improves scanability or approval context." />
                  )}
                </Panel>

                <Panel title="Body" icon={MessageSquare}>
                  <Field
                    label="Message body"
                    hint={`${bodyComponent?.text?.length ?? 0}/${WHATSAPP_TEMPLATE_LIMITS.bodyText}`}
                    hintClassName={characterTone(bodyComponent?.text?.length ?? 0, WHATSAPP_TEMPLATE_LIMITS.bodyText)}
                  >
                    <Textarea
                      rows={7}
                      value={bodyComponent?.text ?? ''}
                      placeholder={parameterFormat === 'named' ? 'Hi {{customer_name}}, your booking is {{status}}.' : 'Hi {{1}}, your booking is {{2}}.'}
                      onChange={(event) => updateComponent('BODY', { text: event.target.value } as Partial<TemplateComponentDraft>)}
                    />
                  </Field>
                </Panel>

                <Panel title="Footer" icon={FileText} action={
                  footerComponent ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeComponent('FOOTER')}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={ensureFooter}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add footer
                    </Button>
                  )
                }>
                  {footerComponent ? (
                    <Field
                      label="Footer text"
                      hint={`${footerComponent.text?.length ?? 0}/${WHATSAPP_TEMPLATE_LIMITS.footerText}`}
                      hintClassName={characterTone(footerComponent.text?.length ?? 0, WHATSAPP_TEMPLATE_LIMITS.footerText)}
                    >
                      <Input
                        value={footerComponent.text ?? ''}
                        placeholder="Aagam Holidays"
                        onChange={(event) => updateComponent('FOOTER', { text: event.target.value } as Partial<TemplateComponentDraft>)}
                      />
                    </Field>
                  ) : (
                    <EmptyPanel icon={FileText} text="A short footer can clarify brand, policy, or unsubscribe context." />
                  )}
                </Panel>

                <Panel title="Buttons" icon={LinkIcon} action={
                  buttonsComponent ? (
                    <Button type="button" size="sm" variant="outline" onClick={addButton}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add button
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={ensureButtons}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add buttons
                    </Button>
                  )
                }>
                  {buttonsComponent ? (
                    <div className="space-y-3">
                      {(buttonsComponent.buttons ?? []).map((button, index) => (
                        <div key={index} className="rounded-lg border bg-muted/10 p-3">
                          <div className="grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                            <Select
                              value={button.type}
                              onValueChange={(value) => setButton(index, { type: value as TemplateButtonDraft['type'], text: value === 'COPY_CODE' ? '' : button.text })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TEMPLATE_BUTTON_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {buttonTypeLabel(type)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {button.type !== 'COPY_CODE' ? (
                              <Input
                                value={button.text ?? ''}
                                placeholder="Button text"
                                onChange={(event) => setButton(index, { text: event.target.value })}
                              />
                            ) : (
                              <Input
                                value={button.example ?? ''}
                                placeholder="Example code, e.g. SAVE250"
                                onChange={(event) => setButton(index, { example: event.target.value })}
                              />
                            )}
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeButton(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {button.type === 'URL' && (
                            <Input
                              className="mt-3"
                              value={button.url ?? ''}
                              placeholder={parameterFormat === 'named' ? 'https://example.com/{{package_slug}}' : 'https://example.com/{{1}}'}
                              onChange={(event) => setButton(index, { url: event.target.value })}
                            />
                          )}
                          {button.type === 'PHONE_NUMBER' && (
                            <Input
                              className="mt-3"
                              value={button.phone_number ?? ''}
                              placeholder="+919876543210"
                              onChange={(event) => setButton(index, { phone_number: event.target.value })}
                            />
                          )}
                          {button.type === 'FLOW' && (
                            <Input
                              className="mt-3"
                              value={button.flow_id ?? ''}
                              placeholder="Published Flow ID"
                              onChange={(event) => setButton(index, { flow_id: event.target.value })}
                            />
                          )}
                        </div>
                      ))}

                      {!buttonsComponent.buttons?.length && (
                        <EmptyPanel icon={LinkIcon} text="Add at least one button or remove this section." />
                      )}
                    </div>
                  ) : (
                    <EmptyPanel icon={LinkIcon} text="Buttons are optional. Add quick replies, URLs, phone numbers, Flows, or marketing copy codes." />
                  )}
                </Panel>

                <Panel title="Variable examples" icon={Copy}>
                  {variableRows.length ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {variableRows.map((row) => (
                        <Field key={`${row.source}:${row.variable}`} label={`{{${row.variable}}}`} hint={row.label}>
                          <Input
                            value={getExample(row.source, row.variable)}
                            placeholder={`Example for {{${row.variable}}}`}
                            onChange={(event) => updateExample(row.source, row.variable, event.target.value)}
                          />
                        </Field>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel icon={Copy} text="Variables appear here when you add placeholders such as {{customer_name}}." />
                  )}
                </Panel>
              </>
            )}
          </main>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <PreviewPanel
              isAuth={isAuth}
              header={headerComponent}
              body={bodyComponent}
              footer={footerComponent}
              buttons={buttonsComponent?.buttons ?? []}
              authSecurityRecommendation={authSecurityRecommendation}
              authCodeExpiration={authCodeExpiration}
              authButtonText={authButtonText}
              previewText={previewText}
            />

            <Panel title="Approval checklist" icon={CheckCircle2}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Readiness score</span>
                  <Badge variant={blockingIssues.length ? 'destructive' : 'default'}>{validation.readinessScore}%</Badge>
                </div>
                <Progress value={validation.readinessScore} className="h-2" />

                <div className="space-y-2">
                  {blockingIssues.length === 0 && (
                    <ChecklistRow tone="success" text="No blocking validation issues." />
                  )}
                  {blockingIssues.map((issue, index) => (
                    <ChecklistRow key={`error-${index}`} tone="error" text={issue.message} />
                  ))}
                  {warnings.map((issue, index) => (
                    <ChecklistRow key={`warning-${index}`} tone="warning" text={issue.message} />
                  ))}
                </div>

                <Separator />

                <div className={cn(
                  'rounded-lg border p-3 text-sm',
                  submission.status === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
                  submission.status === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
                  submission.status === 'idle' && 'bg-muted/20 text-muted-foreground'
                )}>
                  <p className="font-medium">Submission</p>
                  <p className="mt-1">{submission.message}</p>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof FileText;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  hintClassName,
  children,
}: {
  label: string;
  hint?: string;
  hintClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {hint ? <span className={cn('text-xs', hintClassName || 'text-muted-foreground')}>{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
      <Icon className="h-5 w-5" />
      <span>{text}</span>
    </div>
  );
}

function ChecklistRow({ tone, text }: { tone: 'success' | 'warning' | 'error'; text: string }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : AlertTriangle;
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
      tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
      tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
      tone === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
    )}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function PreviewPanel({
  isAuth,
  header,
  body,
  footer,
  buttons,
  authSecurityRecommendation,
  authCodeExpiration,
  authButtonText,
  previewText,
}: {
  isAuth: boolean;
  header?: Extract<TemplateComponentDraft, { type: 'HEADER' }>;
  body?: Extract<TemplateComponentDraft, { type: 'BODY' }>;
  footer?: Extract<TemplateComponentDraft, { type: 'FOOTER' }>;
  buttons: TemplateButtonDraft[];
  authSecurityRecommendation: boolean;
  authCodeExpiration: number;
  authButtonText: string;
  previewText: (text: string | undefined, source: 'header' | 'body') => string;
}) {
  const bodyText = isAuth
    ? '*123456* is your verification code.'
    : previewText(body?.text || 'Your message body appears here.', 'body');

  return (
    <section className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold">WA</div>
          <div>
            <p className="text-sm font-semibold">Aagam Holidays</p>
            <p className="text-xs text-white/70">template preview</p>
          </div>
        </div>
        <Eye className="h-4 w-4 text-white/70" />
      </div>

      <div className="bg-[#efeae2] p-4">
        <div className="ml-auto max-w-[88%] overflow-hidden rounded-lg bg-[#d9fdd3] shadow-sm">
          {!isAuth && header && (
            <div className="p-3 pb-1">
              {header.format === 'TEXT' && header.text ? (
                <p className="text-sm font-semibold">{previewText(header.text, 'header')}</p>
              ) : null}
              {header.format === 'IMAGE' && (
                header.mediaUrl ? (
                  <Image
                    src={header.mediaUrl}
                    alt="Template header"
                    width={320}
                    height={180}
                    className="h-40 w-full rounded-md object-cover"
                    unoptimized
                  />
                ) : (
                  <PreviewMediaPlaceholder icon={ImageIcon} label="Image header" />
                )
              )}
              {header.format === 'VIDEO' && <PreviewMediaPlaceholder icon={Video} label="Video header" dark />}
              {header.format === 'DOCUMENT' && <PreviewMediaPlaceholder icon={FileText} label={header.fileName || 'PDF document'} />}
              {header.format === 'LOCATION' && <PreviewMediaPlaceholder icon={MapPin} label="Location at send time" />}
            </div>
          )}

          <div className="space-y-1 px-3 py-2 text-[13px] leading-relaxed">
            {bodyText.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            {isAuth && authSecurityRecommendation && (
              <p className="text-xs text-slate-600">For your security, do not share this code.</p>
            )}
            {isAuth && (
              <p className="text-xs italic text-slate-600">This code expires in {authCodeExpiration} minutes.</p>
            )}
          </div>

          {!isAuth && footer?.text && (
            <div className="px-3 pb-2 text-xs text-slate-500">{footer.text}</div>
          )}

          <div className="px-3 pb-2 text-right text-[11px] text-slate-500">20:22</div>

          <div className="border-t border-emerald-200">
            {isAuth ? (
              <PreviewButton icon={Copy} label={authButtonText || 'Copy code'} />
            ) : (
              buttons.map((button, index) => (
                <PreviewButton key={index} icon={buttonIcon(button.type)} label={buttonPreviewLabel(button)} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewMediaPlaceholder({ icon: Icon, label, dark = false }: { icon: typeof FileText; label: string; dark?: boolean }) {
  return (
    <div className={cn(
      'flex h-36 w-full flex-col items-center justify-center gap-2 rounded-md border text-xs',
      dark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white/70 text-slate-500'
    )}>
      <Icon className="h-8 w-8" />
      <span>{label}</span>
    </div>
  );
}

function PreviewButton({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <button type="button" className="flex w-full items-center justify-center gap-2 border-t border-emerald-200 px-3 py-2 text-sm font-medium text-[#128c7e] first:border-t-0">
      <Icon className="h-4 w-4" />
      <span>{label || 'Button'}</span>
    </button>
  );
}

function buttonTypeLabel(type: TemplateButtonDraft['type']) {
  switch (type) {
    case 'QUICK_REPLY':
      return 'Quick reply';
    case 'PHONE_NUMBER':
      return 'Phone';
    case 'URL':
      return 'URL';
    case 'FLOW':
      return 'Flow';
    case 'COPY_CODE':
      return 'Copy code';
    default:
      return type;
  }
}

function buttonIcon(type: TemplateButtonDraft['type']) {
  switch (type) {
    case 'PHONE_NUMBER':
      return Phone;
    case 'URL':
      return LinkIcon;
    case 'FLOW':
      return Workflow;
    case 'COPY_CODE':
      return Copy;
    default:
      return MessageSquare;
  }
}

function buttonPreviewLabel(button: TemplateButtonDraft) {
  if (button.type === 'COPY_CODE') return button.example ? `Copy ${button.example}` : 'Copy code';
  return button.text || buttonTypeLabel(button.type);
}
