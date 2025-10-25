'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MediaUploader from '@/components/whatsapp/MediaUploader';
import { ImagePlus, ShieldCheck, Sparkles } from 'lucide-react';

export default function WhatsAppMediaLibraryPage() {
  return (
    <div className="space-y-8 p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10 opacity-40" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
                <ImagePlus className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/25 text-white backdrop-blur">Media Library</Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold">WhatsApp Image Library</h1>
              <p className="text-lg text-blue-100 max-w-2xl">
                Upload brand-approved visuals once and reuse the hosted URL across WhatsApp templates, catalog entries, and broadcast campaigns.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/10 p-5 text-sm text-blue-50 backdrop-blur">
            <p className="flex items-center gap-2 font-medium">
              <Sparkles className="h-5 w-5" />Optimized for quick reuse
            </p>
            <p className="mt-2 text-blue-100">
              Every upload generates a stable, publicly accessible URL you can paste directly into Meta flows and template media headers.
            </p>
          </div>
        </div>
      </div>

      <MediaUploader />

      <Card className="border border-dashed">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Best practices</CardTitle>
            <CardDescription>Keep your WhatsApp media compliant and production-ready.</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />Compliance ready
          </Badge>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
            <li className="rounded-lg bg-muted/30 p-4">
              <span className="font-medium text-foreground">Use descriptive file names</span>
              <p className="mt-1">Meta reviews media contextually. File names like hotel-room-deluxe.webp help approvers instantly understand the asset.</p>
            </li>
            <li className="rounded-lg bg-muted/30 p-4">
              <span className="font-medium text-foreground">Prefer WEBP or JPEG</span>
              <p className="mt-1">Images under 1 MB load faster on low bandwidth devices without sacrificing quality.</p>
            </li>
            <li className="rounded-lg bg-muted/30 p-4">
              <span className="font-medium text-foreground">Avoid sensitive content</span>
              <p className="mt-1">Stick to visuals already approved for marketing to prevent template rejections.</p>
            </li>
            <li className="rounded-lg bg-muted/30 p-4">
              <span className="font-medium text-foreground">Revalidate URLs periodically</span>
              <p className="mt-1">Downloads stay on this server. If you migrate hosting, remember to move the <code>/public/uploads/whatsapp</code> directory.</p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
