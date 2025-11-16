'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  FileIcon,
  Link as LinkIcon,
  MessageSquare,
  Eye,
  UploadCloud,
  Loader2,
  Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type ButtonType = 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL' | 'FLOW';

interface TemplateComponent {
  type: ComponentType;
  format?: HeaderFormat;
  text?: string;
  example?: string; // For media headers (IMAGE, VIDEO, DOCUMENT) - example URL
  buttons?: Array<{
    type: ButtonType;
    text: string;
    url?: string;
    phone_number?: string;
    flow_id?: string;
  }>;
}

interface TemplateData {
  name: string;
  language: string;
  category: string;
  components: TemplateComponent[];
}

const MAX_DOCUMENT_SIZE_MB = 5;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const precision = exponent === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
}

export default function TemplateBuilder({ onComplete }: { onComplete?: () => void }) {
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState('UTILITY');
  const [components, setComponents] = useState<TemplateComponent[]>([
    { type: 'BODY', text: '' }
  ]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUploadedFileName, setDocumentUploadedFileName] = useState<string | null>(null);
  const [documentUploadedUrl, setDocumentUploadedUrl] = useState<string | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentInputKey, setDocumentInputKey] = useState(0);

  const headerComponent = components.find((component) => component.type === 'HEADER');
  const headerFormat = headerComponent?.format;
  const headerExample = headerComponent?.example;

  useEffect(() => {
    if (headerFormat !== 'DOCUMENT') {
      setDocumentFile(null);
      setDocumentUploadedFileName(null);
      setDocumentUploadedUrl(null);
      setDocumentInputKey((key) => key + 1);
    }
  }, [headerFormat]);

  useEffect(() => {
    if (headerFormat === 'DOCUMENT' && !headerExample) {
      setDocumentUploadedFileName(null);
      setDocumentUploadedUrl(null);
    }
  }, [headerFormat, headerExample]);

  const addComponent = (type: ComponentType) => {
    const newComponent: TemplateComponent = { type };
    
    if (type === 'HEADER') {
      newComponent.format = 'TEXT';
      newComponent.text = '';
    } else if (type === 'BODY' || type === 'FOOTER') {
      newComponent.text = '';
    } else if (type === 'BUTTONS') {
      newComponent.buttons = [{ type: 'QUICK_REPLY', text: '' }];
    }

    // Check if component type already exists
    const existingIndex = components.findIndex(c => c.type === type);
    if (existingIndex !== -1 && type !== 'BUTTONS') {
      toast.error(`${type} component already exists`);
      return;
    }

    setComponents([...components, newComponent]);
  };

  const updateComponent = (index: number, updates: Partial<TemplateComponent>) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], ...updates };
    setComponents(newComponents);
  };

  const removeComponent = (index: number) => {
    const componentToRemove = components[index];
    const newComponents = components.filter((_, i) => i !== index);
    setComponents(newComponents);

    if (componentToRemove?.type === 'HEADER') {
      setDocumentFile(null);
      setDocumentUploadedFileName(null);
      setDocumentUploadedUrl(null);
      setDocumentInputKey((key) => key + 1);
    }
  };

  const addButton = (componentIndex: number) => {
    const newComponents = [...components];
    const component = newComponents[componentIndex];
    
    if (component.buttons) {
      if (component.buttons.length >= 3) {
        toast.error('Maximum 3 buttons allowed');
        return;
      }
      component.buttons.push({ type: 'QUICK_REPLY', text: '' });
      setComponents(newComponents);
    }
  };

  const updateButton = (componentIndex: number, buttonIndex: number, updates: any) => {
    const newComponents = [...components];
    const component = newComponents[componentIndex];
    
    if (component.buttons) {
      component.buttons[buttonIndex] = { ...component.buttons[buttonIndex], ...updates };
      setComponents(newComponents);
    }
  };

  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const newComponents = [...components];
    const component = newComponents[componentIndex];
    
    if (component.buttons) {
      component.buttons = component.buttons.filter((_, i) => i !== buttonIndex);
      setComponents(newComponents);
    }
  };

  const handleDocumentFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setDocumentFile(null);
      setDocumentInputKey((key) => key + 1);
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast.error(`PDF is too large. Maximum size is ${MAX_DOCUMENT_SIZE_MB} MB.`);
      setDocumentFile(null);
      setDocumentInputKey((key) => key + 1);
      return;
    }

    const type = (file.type || '').toLowerCase();
    const name = file.name?.toLowerCase() || '';

    if (type !== 'application/pdf' && !name.endsWith('.pdf')) {
      toast.error('Only PDF documents are supported.');
      setDocumentFile(null);
      setDocumentInputKey((key) => key + 1);
      return;
    }

    setDocumentFile(file);
    setDocumentUploadedFileName(null);
  };

  const uploadDocument = async () => {
    if (documentUploading) {
      return;
    }

    const headerIndex = components.findIndex((component) => component.type === 'HEADER');

    if (headerIndex === -1) {
      toast.error('Add a header component before uploading a document.');
      return;
    }

    if (headerFormat !== 'DOCUMENT') {
      toast.error('Change the header format to Document to upload a PDF.');
      return;
    }

    if (!documentFile) {
      toast.error('Select a PDF file to upload.');
      return;
    }

    setDocumentUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', documentFile, documentFile.name);
      if (templateName) {
        formData.append('templateName', templateName);
      }

      const response = await fetch('/api/whatsapp/templates/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to upload PDF');
      }

      const documentUrl: string | undefined = data?.document?.url;
      const uploadedName: string | undefined = data?.document?.fileName;
      const metaHandle: string | undefined = data?.document?.metaHandle;

      if (!documentUrl) {
        throw new Error('Upload succeeded but no document URL was returned.');
      }

      if (!metaHandle) {
        throw new Error('Upload succeeded but no WhatsApp media handle was returned.');
      }

      updateComponent(headerIndex, { example: metaHandle });
      setDocumentUploadedFileName(uploadedName || documentFile.name);
      setDocumentUploadedUrl(documentUrl);
      setDocumentFile(null);
      setDocumentInputKey((key) => key + 1);

      toast.success('PDF uploaded successfully. WhatsApp media handle saved.');
    } catch (error: any) {
      console.error('Error uploading template PDF:', error);
      toast.error(error?.message || 'Failed to upload PDF');
    } finally {
      setDocumentUploading(false);
    }
  };

  const clearDocumentExample = () => {
    const headerIndex = components.findIndex((component) => component.type === 'HEADER');
    if (headerIndex === -1) {
      return;
    }

    updateComponent(headerIndex, { example: undefined });
    setDocumentUploadedFileName(null);
    setDocumentUploadedUrl(null);
    toast.success('Document link removed.');
  };

  const copyValue = async (value: string, successMessage: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Clipboard is not available in this environment.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (error) {
      console.error('Failed to copy value to clipboard:', error);
      toast.error('Unable to copy to clipboard.');
    }
  };

  const validateTemplate = (): string | null => {
    if (!templateName.trim()) return 'Template name is required';
    if (templateName.length > 512) return 'Template name must be less than 512 characters';
    if (!/^[a-z0-9_]+$/.test(templateName)) {
      return 'Template name must contain only lowercase letters, numbers, and underscores';
    }

    const bodyComponent = components.find(c => c.type === 'BODY');
    if (!bodyComponent || !bodyComponent.text?.trim()) {
      return 'Body component is required';
    }

    // Validate header media requirements
    const headerComponent = components.find(c => c.type === 'HEADER');
    if (headerComponent && headerComponent.format) {
      const format = headerComponent.format;
      const exampleValue = typeof headerComponent.example === 'string'
        ? headerComponent.example.trim()
        : '';

      if (['IMAGE', 'VIDEO'].includes(format)) {
        if (!exampleValue) {
          return `${format} header requires an example URL`;
        }
        try {
          new URL(exampleValue);
        } catch {
          return 'Header example must be a valid URL';
        }
      }

      if (format === 'DOCUMENT') {
        if (!exampleValue) {
          return 'Document header requires a WhatsApp media handle';
        }
        if (/^https?:\/\//i.test(exampleValue)) {
          return 'Document headers must use a WhatsApp media handle. Upload the PDF to generate one.';
        }
      }
    }

    // Validate buttons
    const buttonComponents = components.filter(c => c.type === 'BUTTONS');
    for (const component of buttonComponents) {
      if (!component.buttons || component.buttons.length === 0) {
        return 'Button component must have at least one button';
      }
      
      for (const button of component.buttons) {
        if (!button.text?.trim()) {
          return 'All buttons must have text';
        }
        if (button.type === 'URL' && !button.url) {
          return 'URL buttons must have a URL';
        }
        if (button.type === 'PHONE_NUMBER' && !button.phone_number) {
          return 'Phone buttons must have a phone number';
        }
        if (button.type === 'FLOW' && !button.flow_id) {
          return 'Flow buttons must have a flow ID';
        }
      }
    }

    return null;
  };

  const createTemplate = async () => {
    const error = validateTemplate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          language,
          category,
          components,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template created successfully! Awaiting Meta approval.');
        
        // Reset form
        setTemplateName('');
        setLanguage('en_US');
        setCategory('UTILITY');
        setComponents([{ type: 'BODY', text: '' }]);
        
        if (onComplete) onComplete();
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const getComponentIcon = (type: ComponentType, format?: HeaderFormat) => {
    if (type === 'HEADER') {
      if (format === 'IMAGE') return <ImageIcon className="h-4 w-4" />;
      if (format === 'VIDEO') return <Video className="h-4 w-4" />;
      if (format === 'DOCUMENT') return <FileIcon className="h-4 w-4" />;
      return <MessageSquare className="h-4 w-4" />;
    }
    if (type === 'BODY') return <MessageSquare className="h-4 w-4" />;
    if (type === 'FOOTER') return <MessageSquare className="h-4 w-4" />;
    if (type === 'BUTTONS') return <LinkIcon className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const renderPreview = () => {
    const headerComponent = components.find(c => c.type === 'HEADER');
    const bodyComponent = components.find(c => c.type === 'BODY');
    const footerComponent = components.find(c => c.type === 'FOOTER');
    const buttonComponents = components.filter(c => c.type === 'BUTTONS');

    return (
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4 rounded-t-lg">
          <h3 className="text-white font-semibold">WhatsApp Preview</h3>
        </div>
        <div className="border border-t-0 rounded-b-lg overflow-hidden bg-white">
          {/* Header */}
          {headerComponent && (
            <div className="border-b bg-muted/30 p-3">
              {headerComponent.format === 'TEXT' && headerComponent.text && (
                <p className="font-semibold text-sm">{headerComponent.text}</p>
              )}
              {headerComponent.format === 'IMAGE' && (
                <div className="bg-gray-200 rounded p-8 text-center text-muted-foreground text-sm">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  Image Header
                </div>
              )}
              {headerComponent.format === 'VIDEO' && (
                <div className="bg-gray-200 rounded p-8 text-center text-muted-foreground text-sm">
                  <Video className="h-8 w-8 mx-auto mb-2" />
                  Video Header
                </div>
              )}
              {headerComponent.format === 'DOCUMENT' && (
                <div className="bg-gray-200 rounded p-8 text-center text-muted-foreground text-sm">
                  <FileIcon className="h-8 w-8 mx-auto mb-2" />
                  Document Header
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {bodyComponent && (
            <div className="p-4">
              <p className="text-sm whitespace-pre-wrap">
                {bodyComponent.text || 'Your message will appear here...'}
              </p>
            </div>
          )}

          {/* Footer */}
          {footerComponent && footerComponent.text && (
            <div className="px-4 pb-3">
              <p className="text-xs text-muted-foreground">{footerComponent.text}</p>
            </div>
          )}

          {/* Buttons */}
          {buttonComponents.map((component, idx) => (
            <div key={idx} className="border-t">
              {component.buttons?.map((button, btnIdx) => (
                <button
                  key={btnIdx}
                  className="w-full py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 border-t first:border-t-0"
                >
                  {button.type === 'PHONE_NUMBER' && '📞 '}
                  {button.type === 'URL' && '🔗 '}
                  {button.type === 'FLOW' && '✨ '}
                  {button.text || 'Button'}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Builder</h2>
          <p className="text-muted-foreground">Create a new WhatsApp message template</p>
        </div>
        <Button
          variant={previewMode ? 'default' : 'outline'}
          onClick={() => setPreviewMode(!previewMode)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewMode ? 'Edit' : 'Preview'}
        </Button>
      </div>

      {previewMode ? (
        <div className="space-y-4">
          {renderPreview()}
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Back to Edit
            </Button>
            <Button onClick={createTemplate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Template name must be lowercase with only letters, numbers, and underscores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., order_confirmation"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="en_GB">English (UK)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Components */}
            <Card>
              <CardHeader>
                <CardTitle>Template Components</CardTitle>
                <CardDescription>
                  Add and configure components for your template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Component Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addComponent('HEADER')}
                    disabled={components.some(c => c.type === 'HEADER')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Header
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addComponent('FOOTER')}
                    disabled={components.some(c => c.type === 'FOOTER')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Footer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addComponent('BUTTONS')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Buttons
                  </Button>
                </div>

                {/* Component List */}
                <div className="space-y-4">
                  {components.map((component, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1">
                          {getComponentIcon(component.type, component.format)}
                          {component.type}
                        </Badge>
                        {component.type !== 'BODY' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeComponent(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Header Format Selector */}
                      {component.type === 'HEADER' && (
                        <Select
                          value={component.format}
                          onValueChange={(value) => {
                            const selectedFormat = value as HeaderFormat;
                            const updates: Partial<TemplateComponent> = {
                              format: selectedFormat,
                            };

                            if (selectedFormat === 'TEXT') {
                              updates.example = undefined;
                            } else {
                              updates.text = '';
                            }

                            if (selectedFormat !== 'DOCUMENT') {
                              updates.example = undefined;
                            }

                            updateComponent(idx, updates);
                            setDocumentFile(null);
                            setDocumentUploadedFileName(null);
                            setDocumentUploadedUrl(null);
                            setDocumentInputKey((key) => key + 1);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Text</SelectItem>
                            <SelectItem value="IMAGE">Image</SelectItem>
                            <SelectItem value="VIDEO">Video</SelectItem>
                            <SelectItem value="DOCUMENT">Document</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Text Input for TEXT components */}
                      {(component.type === 'HEADER' && component.format === 'TEXT') ||
                       component.type === 'BODY' ||
                       component.type === 'FOOTER' ? (
                        <Textarea
                          placeholder={`Enter ${component.type.toLowerCase()} text... Use {{1}}, {{2}} for variables`}
                          value={component.text || ''}
                          onChange={(e) => updateComponent(idx, { text: e.target.value })}
                          rows={component.type === 'BODY' ? 4 : 2}
                        />
                      ) : null}

                      {/* Example URL for media headers (IMAGE, VIDEO, DOCUMENT) */}
                      {component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || '') && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>
                              {component.format === 'DOCUMENT'
                                ? 'WhatsApp media handle *'
                                : `Example ${component.format} URL *`}
                            </Label>
                            <Input
                              type="text"
                              placeholder={component.format === 'DOCUMENT'
                                ? '4::aW...'
                                : `https://example.com/sample-${component.format?.toLowerCase()}.${
                                    component.format === 'IMAGE' ? 'jpg' :
                                    component.format === 'VIDEO' ? 'mp4' : 'pdf'
                                  }`
                              }
                              value={component.example || ''}
                              onChange={(e) => {
                                updateComponent(idx, { example: e.target.value });
                                if (component.format === 'DOCUMENT') {
                                  setDocumentUploadedFileName(null);
                                  setDocumentUploadedUrl(null);
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              {component.format === 'DOCUMENT'
                                ? 'Provide the WhatsApp media handle (auto-filled after uploading a PDF below).'
                                : `Provide a sample ${component.format?.toLowerCase()} URL for template approval.`}
                            </p>
                          </div>

                          {component.format === 'DOCUMENT' && (
                            <div className="space-y-3 rounded-md border border-dashed border-muted bg-muted/20 p-3">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <UploadCloud className="h-4 w-4" />
                                <span>Upload PDF to Cloudflare R2</span>
                              </div>
                              <Input
                                key={documentInputKey}
                                type="file"
                                accept="application/pdf"
                                onChange={handleDocumentFileSelection}
                                disabled={documentUploading}
                              />
                              {documentFile && (
                                <p className="text-xs text-muted-foreground">
                                  Selected: {documentFile.name} ({formatBytes(documentFile.size)})
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={uploadDocument}
                                  disabled={!documentFile || documentUploading}
                                >
                                  {documentUploading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="mr-2 h-4 w-4" />
                                      Upload PDF
                                    </>
                                  )}
                                </Button>
                                {component.example && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={clearDocumentExample}
                                    disabled={documentUploading}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear link
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Uploaded PDFs receive a permanent public URL and a WhatsApp media handle automatically.
                              </p>
                            </div>
                          )}

                          {component.format === 'DOCUMENT' && component.example && (
                            <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-muted bg-background/80 p-3">
                              <div className="min-w-0 space-y-1">
                                {documentUploadedFileName && (
                                  <p className="text-sm font-medium truncate">{documentUploadedFileName}</p>
                                )}
                                <p className="text-xs text-muted-foreground font-medium">Meta media handle</p>
                                <p className="text-xs text-muted-foreground break-all">{component.example}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => copyValue(component.example!, 'Media handle copied to clipboard.')}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy handle
                              </Button>
                            </div>
                          )}

                          {component.format === 'DOCUMENT' && documentUploadedUrl && (
                            <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-muted bg-background/50 p-3">
                              <div className="min-w-0 space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Public PDF link</p>
                                <p className="text-xs text-muted-foreground break-all">{documentUploadedUrl}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => copyValue(documentUploadedUrl, 'PDF link copied to clipboard.')}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy URL
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Buttons */}
                      {component.type === 'BUTTONS' && (
                        <div className="space-y-3">
                          {component.buttons?.map((button, btnIdx) => (
                            <div key={btnIdx} className="border rounded p-3 space-y-2 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <Select
                                  value={button.type}
                                  onValueChange={(value) =>
                                    updateButton(idx, btnIdx, { type: value as ButtonType })
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                                    <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                                    <SelectItem value="URL">URL</SelectItem>
                                    <SelectItem value="FLOW">Flow</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeButton(idx, btnIdx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <Input
                                placeholder="Button text"
                                value={button.text}
                                onChange={(e) =>
                                  updateButton(idx, btnIdx, { text: e.target.value })
                                }
                              />

                              {button.type === 'URL' && (
                                <Input
                                  placeholder="https://example.com or https://example.com/{{1}}"
                                  value={button.url || ''}
                                  onChange={(e) =>
                                    updateButton(idx, btnIdx, { url: e.target.value })
                                  }
                                />
                              )}

                              {button.type === 'PHONE_NUMBER' && (
                                <Input
                                  placeholder="+1234567890"
                                  value={button.phone_number || ''}
                                  onChange={(e) =>
                                    updateButton(idx, btnIdx, { phone_number: e.target.value })
                                  }
                                />
                              )}

                              {button.type === 'FLOW' && (
                                <Input
                                  placeholder="Flow ID"
                                  value={button.flow_id || ''}
                                  onChange={(e) =>
                                    updateButton(idx, btnIdx, { flow_id: e.target.value })
                                  }
                                />
                              )}
                            </div>
                          ))}

                          {component.buttons && component.buttons.length < 3 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addButton(idx)}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Button
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {renderPreview()}
            
            <div className="mt-4 space-y-2">
              <Button onClick={createTemplate} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Template'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Template will be submitted to Meta for approval. This may take 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
