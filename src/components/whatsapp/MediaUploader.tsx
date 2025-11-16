'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  RefreshCcw,
  Copy,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Trash2,
  FileText,
  Filter,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const configuredMaxFileSizeMb = Number(process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ?? 100);
const MAX_UPLOAD_SIZE_MB = Number.isFinite(configuredMaxFileSizeMb) && configuredMaxFileSizeMb > 0 ? configuredMaxFileSizeMb : 100;
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = Number(process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILES ?? 5);
const ACCEPTED_FILE_TYPES = 'image/*,application/pdf,.pdf';

const FILE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'PDFs', value: 'document' },
] as const;

type LibraryFilter = (typeof FILE_FILTERS)[number]['value'];

type UploadedMedia = {
  id: string;
  publicId: string;
  filename: string;
  secureUrl: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
  folder?: string | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatTimestamp(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function MediaUploader() {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const firstPreviewableFile = useMemo(() => selectedFiles.find((file) => file.type?.startsWith('image/')) ?? null, [selectedFiles]);
  const previewUrl = useMemo(() => (firstPreviewableFile ? URL.createObjectURL(firstPreviewableFile) : null), [firstPreviewableFile]);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [typeFilter, setTypeFilter] = useState<LibraryFilter>('all');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchUploads = useCallback(async () => {
    setIsLoadingList(true);
    setCopiedUrl(null);
    setSelectedLibraryIds(new Set());
    try {
      const response = await fetch('/api/uploads/images');
      const payload = await response.json();

      if (response.status === 403) {
        throw new Error('You do not have permission to view uploaded media.');
      }

      if (response.status === 401) {
        throw new Error('Please sign in again to view the media library.');
      }

      if (!response.ok) {
        const error = new Error(payload?.error || 'Failed to load uploaded media');
        (error as any).code = payload?.code;
        throw error;
      }

      const files = Array.isArray(payload?.files) ? payload.files : [];
      const normalized: UploadedMedia[] = [];

      for (const file of files as any[]) {
        const secureUrl = file?.secureUrl || file?.secure_url || file?.url;
        if (typeof secureUrl !== 'string' || secureUrl.length === 0) {
          continue;
        }

        const folder = typeof file?.folder === 'string'
          ? file.folder
          : typeof file?.asset_folder === 'string'
            ? file.asset_folder
            : null;

        const resourceType = typeof file?.resourceType === 'string'
          ? file.resourceType
          : typeof file?.resource_type === 'string'
            ? file.resource_type
            : undefined;

        normalized.push({
          id: file?.id || file?.publicId || file?.public_id || file?.asset_id || secureUrl,
          publicId: file?.publicId || file?.public_id,
          filename: file?.filename || file?.original_filename || file?.publicId || 'media',
          secureUrl,
          size: typeof file?.size === 'number' ? file.size : typeof file?.bytes === 'number' ? file.bytes : 0,
          contentType: file?.contentType || file?.content_type || (file?.format ? `image/${file.format}` : 'image'),
          uploadedAt: file?.uploadedAt || file?.uploaded_at || file?.created_at || new Date().toISOString(),
          width: typeof file?.width === 'number' ? file.width : undefined,
          height: typeof file?.height === 'number' ? file.height : undefined,
          format: typeof file?.format === 'string' ? file.format : undefined,
          resourceType,
          folder,
        });

      }

      setUploads(normalized);
    } catch (error: any) {
      console.error('[media-upload] Failed to fetch uploads', error);
      setUploads([]);
      toast({
        variant: 'destructive',
        title: 'Unable to load media',
        description: error?.message || 'Please refresh the page and try again.',
      });
    } finally {
      setIsLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);

    if (!incomingFiles.length) {
      setSelectedFiles([]);
      setUploadMessage(null);
      setMessageVariant('neutral');
      return;
    }

    if (incomingFiles.length > MAX_FILES_PER_UPLOAD) {
      toast({
        variant: 'destructive',
        title: 'Too many files',
        description: `Select up to ${MAX_FILES_PER_UPLOAD} files per upload.`,
      });
      event.target.value = '';
      return;
    }

    const oversized = incomingFiles.find((file) => file.size > MAX_UPLOAD_SIZE);
    if (oversized) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `${oversized.name} exceeds ${MAX_UPLOAD_SIZE_MB} MB.`,
      });
      event.target.value = '';
      return;
    }

    setSelectedFiles(incomingFiles);
    setUploadMessage(null);
    setMessageVariant('neutral');
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;

    if (!selectedFiles.length) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Choose one or more images / PDFs before attempting to upload.',
      });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    setMessageVariant('neutral');
    setCopiedUrl(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('file', file, file.name);
      });

      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (response.status === 403) {
        throw new Error('You do not have permission to upload media.');
      }

      if (response.status === 401) {
        throw new Error('Your session expired. Please sign in again and retry.');
      }

      if (!response.ok) {
        const error = new Error(payload?.error || 'Upload failed');
        (error as any).code = payload?.code;
        throw error;
      }

      const uploadedList: UploadedMedia[] = Array.isArray(payload?.files) ? payload.files : payload?.file ? [payload.file] : [];
      if (uploadedList.length) {
        toast({
          title: uploadedList.length > 1 ? 'Media files uploaded' : 'Media uploaded',
          description: uploadedList.length > 1 ? `${uploadedList.length} files are ready to use.` : 'Copy the direct URL and paste it wherever required.',
        });
        setUploadMessage(uploadedList.length > 1 ? 'Upload complete. Your media library has been refreshed with new files.' : 'Upload complete. Your media library has been refreshed.');
        setMessageVariant('success');
      }

      setSelectedFiles([]);
      if (formElement) {
        formElement.reset();
      }
      await fetchUploads();
    } catch (error: any) {
      console.error('[media-upload] Upload failed', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'Please try again.',
      });
      if (error?.code === 'R2_UPLOAD') {
        setUploadMessage(error?.message || 'Cloudflare R2 rejected the upload. Review your credentials and try again.');
      } else if (error?.code === 'MEDIA_PERSISTENCE') {
        setUploadMessage(error?.message || 'We could not save the media record. Please try again.');
      } else if (error?.code === 'MAX_FILES_EXCEEDED') {
        setUploadMessage(error?.message || 'Too many files selected. Please try again.');
      } else {
        setUploadMessage(`Upload failed: ${error?.message || 'Please try again.'}`);
      }
      setMessageVariant('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = async (file: UploadedMedia) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await navigator.clipboard.writeText(file.secureUrl);
      setCopiedUrl(file.secureUrl);
      toast({
        title: 'Link copied',
        description: 'The media URL is now on your clipboard.',
      });
    } catch (error: any) {
      console.error('[media-upload] Copy failed', error);
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy the link. Please copy it manually.',
      });
    }
  };

  const filteredUploads = useMemo(() => {
    if (typeFilter === 'all') {
      return uploads;
    }
    if (typeFilter === 'image') {
      return uploads.filter((item) => item.contentType?.startsWith('image/'));
    }
    return uploads.filter((item) => item.contentType === 'application/pdf');
  }, [uploads, typeFilter]);

  const hasUploads = filteredUploads.length > 0;

  const selectedUploads = useMemo(() => filteredUploads.filter((item) => selectedLibraryIds.has(item.id)), [filteredUploads, selectedLibraryIds]);
  const selectedCount = selectedUploads.length;

  const toggleLibrarySelection = (id: string) => {
    setSelectedLibraryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedLibraryIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredUploads.every((item) => next.has(item.id));
      if (allSelected) {
        filteredUploads.forEach((item) => next.delete(item.id));
      } else {
        filteredUploads.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const copySelectedLinks = async () => {
    if (!selectedUploads.length || typeof navigator === 'undefined') {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedUploads.map((item) => item.secureUrl).join('\n'));
      toast({
        title: selectedUploads.length > 1 ? 'Links copied' : 'Link copied',
        description: selectedUploads.length > 1 ? `${selectedUploads.length} URLs added to clipboard.` : 'The media URL is now on your clipboard.',
      });
    } catch (error: any) {
      console.error('[media-upload] Bulk copy failed', error);
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy the links. Please try again.',
      });
    }
  };

  type DeleteMediaPayload = {
    id?: string;
    ids?: string[];
    publicId?: string;
    publicIds?: string[];
  };

  const deleteMediaRequest = async (payload: DeleteMediaPayload) => {
    const response = await fetch('/api/uploads/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responsePayload = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('You do not have permission to delete media.');
      }
      if (response.status === 401) {
        throw new Error('Your session expired. Please sign in again and retry.');
      }
      throw new Error(responsePayload?.error || 'Failed to delete the media.');
    }

    return responsePayload;
  };

  const handleDelete = async (file: UploadedMedia) => {
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(`Delete ${file.filename}? This action cannot be undone.`);
      if (!confirmDelete) {
        return;
      }
    }

    setDeletingId(file.id);
    setUploadMessage(null);
    setMessageVariant('neutral');

    try {
      await deleteMediaRequest({ id: file.id, publicId: file.publicId });

      toast({
        title: 'Media deleted',
        description: 'The media asset has been removed from your library.',
      });
      setUploadMessage('Media deleted successfully. The library has been refreshed.');
      setMessageVariant('success');
      setCopiedUrl(null);
      await fetchUploads();
    } catch (error: any) {
      console.error('[media-upload] Delete failed', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Please try again.',
      });
      setUploadMessage(`Delete failed: ${error?.message || 'Please try again.'}`);
      setMessageVariant('error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUploads.length) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm(`Delete ${selectedUploads.length} selected file${selectedUploads.length > 1 ? 's' : ''}? This cannot be undone.`);
      if (!confirmDelete) {
        return;
      }
    }

    setBulkActionLoading(true);
    setUploadMessage(null);
    setMessageVariant('neutral');

    try {
      const ids = selectedUploads.map((file) => file.id);
      const deletedPayload = await deleteMediaRequest({ ids });
      const deletedCount = Array.isArray(deletedPayload?.deletedIds) ? deletedPayload.deletedIds.length : ids.length;
      const missingCount = Array.isArray(deletedPayload?.missingIds) ? deletedPayload.missingIds.length : 0;
      toast({
        title: 'Media deleted',
        description: missingCount
          ? `${deletedCount} deleted, ${missingCount} not found.`
          : `${deletedCount} file${deletedCount > 1 ? 's' : ''} removed from your library.`,
      });
      setUploadMessage(
        missingCount
          ? `${deletedCount} deleted. ${missingCount} item${missingCount > 1 ? 's were' : ' was'} already missing.`
          : `${deletedCount} file${deletedCount > 1 ? 's' : ''} deleted successfully.`
      );
      setMessageVariant(missingCount ? 'neutral' : 'success');
      setSelectedLibraryIds(new Set());
      await fetchUploads();
    } catch (error: any) {
      console.error('[media-upload] Bulk delete failed', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error?.message || 'Please try again.',
      });
      setMessageVariant('error');
      setUploadMessage(error?.message || 'Bulk delete failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Upload Media</CardTitle>
              <CardDescription>Store images or PDFs in Cloudflare R2 and reuse their URLs inside WhatsApp templates and broadcasts.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">PNG · JPG · WEBP · GIF · AVIF · PDF</Badge>
            <Badge variant="outline">Max {MAX_UPLOAD_SIZE_MB} MB</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <label className="flex min-h-[8rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-muted bg-muted/20 px-6 text-center transition hover:border-primary" htmlFor="image-upload-input">
                {previewUrl && firstPreviewableFile ? (
                  <div className="flex w-full items-center justify-center gap-4">
                    <Image src={previewUrl} alt="Selected file preview" width={120} height={120} className="h-24 w-24 rounded-lg object-cover shadow" unoptimized />
                    <div className="text-left">
                      <p className="font-semibold text-sm">{firstPreviewableFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(firstPreviewableFile.size)}</p>
                    </div>
                  </div>
                ) : selectedFiles.length === 1 ? (
                  <div className="flex w-full items-center justify-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-10 w-10" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{selectedFiles[0].name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(selectedFiles[0].size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-sm font-medium">Drag and drop or browse</p>
                    <p className="text-xs">High quality images or PDFs recommended</p>
                  </div>
                )}
              </label>
              <div className="flex flex-col justify-between gap-3">
                <Input
                  id="image-upload-input"
                  name="file"
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  multiple
                  onChange={handleFileSelection}
                  disabled={isUploading}
                  title="Select PNG, JPG, GIF, AVIF, WEBP, or PDF files"
                />
                {selectedFiles.length > 1 && (
                  <div className="rounded-lg border border-muted bg-muted/10 p-2 text-left text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">{selectedFiles.length} files selected</p>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {selectedFiles.map((file) => (
                        <div key={file.name} className="flex items-center justify-between gap-2">
                          <span className="truncate">{file.name}</span>
                          <span>{formatBytes(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isUploading || !selectedFiles.length}>
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    selectedFiles.length > 1 ? 'Upload files' : 'Upload file'
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => fetchUploads()} disabled={isUploading || isLoadingList}>
                  <RefreshCcw className="mr-2 h-4 w-4" />Refresh library
                </Button>
              </div>
            </div>
          </form>
          {uploadMessage && (
            <div
              className={cn(
                'rounded-md border p-3 text-sm transition-colors',
                messageVariant === 'success' && 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
                messageVariant === 'error' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
                messageVariant === 'neutral' && 'border-muted bg-muted/20 text-muted-foreground'
              )}
            >
              {uploadMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Recent uploads</CardTitle>
            <CardDescription>Copy the generated URLs and share them wherever media is required.</CardDescription>
          </div>
          <Badge variant="secondary" className="hidden md:inline-flex">
            <ImageIcon className="mr-2 h-4 w-4" />
            {uploads.length} items
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Filter by type
              </span>
              {FILE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={typeFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => setTypeFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={selectAllFiltered} disabled={!filteredUploads.length}>
                <Layers className="mr-2 h-4 w-4" />{selectedCount && selectedCount === filteredUploads.length ? 'Clear selection' : 'Select visible'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={copySelectedLinks} disabled={!selectedCount}>
                <Copy className="mr-2 h-4 w-4" />Copy selected
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={handleBulkDelete} disabled={!selectedCount || bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete selected
              </Button>
            </div>
          </div>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your media library...
            </div>
          ) : hasUploads ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUploads.map((item) => {
                const isImage = item.contentType?.startsWith('image/');
                const isPdf = item.contentType === 'application/pdf';
                const isSelected = selectedLibraryIds.has(item.id);
                return (
                  <div key={item.id} className={cn('relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition', isSelected && 'ring-2 ring-primary')}>
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleLibrarySelection(item.id)} aria-label={`Select ${item.filename}`} />
                    </div>
                    <div className="relative h-48 w-full bg-muted">
                      {isImage ? (
                        <Image src={item.secureUrl} alt={item.filename} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10" />
                          <span className="text-xs font-semibold uppercase">{isPdf ? 'PDF' : (item.format || 'FILE')}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold" title={item.filename}>{item.filename}</p>
                        <Badge variant="outline">{formatBytes(item.size)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Uploaded {formatTimestamp(item.uploadedAt)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{isImage ? 'Image' : isPdf ? 'PDF' : item.contentType}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleCopyLink(item)}
                          disabled={deletingId === item.id}
                        >
                          {copiedUrl === item.secureUrl ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}Copy link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span className="truncate" title={item.secureUrl}>
                          {item.secureUrl}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted bg-muted/20 p-10 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold">Your media library is empty</p>
                <p className="text-sm text-muted-foreground">Upload an image or PDF to generate a reusable public link.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
