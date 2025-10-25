'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { UploadCloud, RefreshCcw, Copy, Check, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const DEFAULT_CANONICAL_ORIGIN = 'https://admin.aagamholidays.com';
const CANONICAL_ORIGIN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || DEFAULT_CANONICAL_ORIGIN;

type UploadedImage = {
  filename: string;
  url: string;
  absoluteUrl?: string;
  size: number;
  contentType: string;
  uploadedAt: string;
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

function buildCanonicalUrl(relativePath: string) {
  if (!relativePath) {
    return '';
  }
  if (!CANONICAL_ORIGIN) {
    return '';
  }
  const normalizedBase = CANONICAL_ORIGIN.endsWith('/')
    ? CANONICAL_ORIGIN.slice(0, -1)
    : CANONICAL_ORIGIN;
  return `${normalizedBase}${relativePath}`;
}

export default function MediaUploader() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchUploads = useCallback(async () => {
    setIsLoadingList(true);
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
        throw new Error(payload?.error || 'Failed to load uploaded images');
      }

      const files = Array.isArray(payload?.files) ? payload.files : [];
      const normalized: UploadedImage[] = files.map((file: UploadedImage) => {
        const canonical = file.absoluteUrl || buildCanonicalUrl(file.url);
        return {
          ...file,
          absoluteUrl: canonical,
        };
      });

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
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      toast({
        variant: 'destructive',
        title: 'Image too large',
        description: `Please choose a file smaller than ${MAX_UPLOAD_SIZE_MB} MB.`,
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'No image selected',
        description: 'Choose an image before attempting to upload.',
      });
      return;
    }

    setIsUploading(true);
    setCopiedUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile, selectedFile.name);

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
        throw new Error(payload?.error || 'Upload failed');
      }

      const uploaded: UploadedImage | undefined = payload?.file;
      if (uploaded) {
        toast({
          title: 'Image uploaded',
          description: 'Copy the direct URL and paste it into your WhatsApp template.',
        });
      }

      setSelectedFile(null);
      event.currentTarget.reset();
      await fetchUploads();
    } catch (error: any) {
      console.error('[media-upload] Upload failed', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = async (file: UploadedImage) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const fallbackOrigin = origin || window.location.origin;
      const absoluteUrl = file.absoluteUrl || buildCanonicalUrl(file.url) || `${fallbackOrigin}${file.url}`;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedUrl(absoluteUrl);
      toast({
        title: 'Link copied',
        description: 'The image URL is now on your clipboard.',
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

  const hasUploads = uploads.length > 0;

  return (
    <div className="space-y-8">
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Upload Image</CardTitle>
              <CardDescription>Store images locally and reuse their URLs inside WhatsApp templates and broadcasts.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">PNG · JPG · WEBP · GIF · AVIF</Badge>
            <Badge variant="outline">Max {MAX_UPLOAD_SIZE_MB} MB</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-muted bg-muted/20 px-6 text-center transition hover:border-primary" htmlFor="image-upload-input">
                {previewUrl ? (
                  <div className="flex w-full items-center justify-center gap-4">
                    <Image src={previewUrl} alt="Selected image preview" width={120} height={120} className="h-24 w-24 rounded-lg object-cover shadow" unoptimized />
                    <div className="text-left">
                      <p className="font-semibold text-sm">{selectedFile?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedFile ? formatBytes(selectedFile.size) : ''}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-sm font-medium">Drag and drop or browse</p>
                    <p className="text-xs">High quality images recommended</p>
                  </div>
                )}
              </label>
              <div className="flex flex-col justify-between gap-3">
                <Input id="image-upload-input" name="file" type="file" accept="image/*" onChange={handleFileSelection} disabled={isUploading} />
                <Button type="submit" className="w-full" disabled={isUploading || !selectedFile}>
                  {isUploading ? 'Uploading...' : 'Upload image'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => fetchUploads()} disabled={isUploading || isLoadingList}>
                  <RefreshCcw className="mr-2 h-4 w-4" />Refresh library
                </Button>
              </div>
            </div>
          </form>
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
            {uploads.length} images
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <p className="text-sm text-muted-foreground">Loading your media library...</p>
          ) : hasUploads ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {uploads.map((item) => (
                <div key={item.filename} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-lg">
                  <div className="relative h-48 w-full bg-muted">
                    <Image src={item.url} alt={item.filename} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold" title={item.filename}>{item.filename}</p>
                      <Badge variant="outline">{formatBytes(item.size)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Uploaded {formatTimestamp(item.uploadedAt)}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{item.contentType}</Badge>
                      <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => handleCopyLink(item)}>
                        {copiedUrl === (item.absoluteUrl || buildCanonicalUrl(item.url) || item.url) ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}Copy link
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span className="truncate" title={item.absoluteUrl || buildCanonicalUrl(item.url) || (origin ? `${origin}${item.url}` : item.url)}>
                        {item.absoluteUrl || buildCanonicalUrl(item.url) || item.url}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted bg-muted/20 p-10 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-base font-semibold">Your media library is empty</p>
                <p className="text-sm text-muted-foreground">Upload an image to generate a reusable public link.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
