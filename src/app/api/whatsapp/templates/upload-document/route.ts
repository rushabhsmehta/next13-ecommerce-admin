import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleApi, jsonError } from '@/lib/api-response';
import { requireOrgAdmin } from '@/lib/authz';
import { uploadTemplateMediaAsset, type TemplateMediaKind } from '@/lib/r2-client';
import { uploadWhatsAppTemplateMediaBuffer } from '@/lib/whatsapp-media';

const configuredMaxMediaMb = Number(
  process.env.WHATSAPP_TEMPLATE_MEDIA_MAX_FILE_SIZE_MB ||
    process.env.MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    25
);
const MAX_MEDIA_SIZE_MB =
  Number.isFinite(configuredMaxMediaMb) && configuredMaxMediaMb > 0 ? configuredMaxMediaMb : 25;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveTemplateMediaType(file: File): { mediaType: TemplateMediaKind; contentType: string } | null {
  const type = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { mediaType: 'document', contentType: 'application/pdf' };
  }

  if (type === 'image/jpeg' || type === 'image/png' || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
    return {
      mediaType: 'image',
      contentType: type === 'image/png' || name.endsWith('.png') ? 'image/png' : 'image/jpeg',
    };
  }

  if (type === 'video/mp4' || name.endsWith('.mp4')) {
    return { mediaType: 'video', contentType: 'video/mp4' };
  }

  return null;
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = await auth();

    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await requireOrgAdmin(userId);

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return jsonError('No template media file received', 400, 'VALIDATION');
    }

    const file = fileEntry as File;
    const size = typeof file.size === 'number' ? file.size : 0;

    if (size === 0) {
      return jsonError('Empty file uploads are not allowed', 400, 'VALIDATION');
    }

    if (size > MAX_MEDIA_SIZE_BYTES) {
      return jsonError(`File is too large. Maximum size is ${MAX_MEDIA_SIZE_MB} MB.`, 413, 'PAYLOAD_TOO_LARGE');
    }

    const resolvedMedia = resolveTemplateMediaType(file);

    if (!resolvedMedia) {
      return jsonError('Only JPG, PNG, MP4, and PDF files are supported for template header examples.', 415, 'UNSUPPORTED_MEDIA');
    }

    const templateNameRaw = formData.get('templateName');
    const templateName = typeof templateNameRaw === 'string' ? templateNameRaw.trim() : null;

    const prefixRaw = formData.get('prefix');
    const prefix = typeof prefixRaw === 'string' && prefixRaw.trim().length ? prefixRaw.trim() : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const upload = await uploadTemplateMediaAsset({
        buffer,
        fileName: file.name,
        templateName,
        contentType: resolvedMedia.contentType,
        mediaType: resolvedMedia.mediaType,
        uploadedBy: userId,
        prefix,
      });

      let metaHandle: string | null = null;
      try {
        const metaUpload = await uploadWhatsAppTemplateMediaBuffer({
          buffer,
          fileName: file.name,
          mimeType: resolvedMedia.contentType,
          mediaType: resolvedMedia.mediaType,
        });
        metaHandle = metaUpload.mediaId;
      } catch (metaError: any) {
        console.error('[whatsapp-template-upload] Failed to upload file to WhatsApp template media', metaError);
        return jsonError(
          metaError?.message || 'Failed to upload file to WhatsApp template media',
          502,
          'META_UPLOAD'
        );
      }

      if (!metaHandle) {
        return jsonError('WhatsApp did not return a media handle for the uploaded file', 502, 'META_HANDLE');
      }

      const mediaPayload = {
        url: upload.url,
        key: upload.key,
        bucket: upload.bucket,
        size,
        fileName: file.name,
        contentType: resolvedMedia.contentType,
        mediaType: resolvedMedia.mediaType,
        uploadedAt: new Date().toISOString(),
        metaHandle,
      };

      return NextResponse.json({
        success: true,
        media: mediaPayload,
        document: mediaPayload,
      });
    } catch (error: any) {
      console.error('[whatsapp-template-upload] Failed to upload template media', error);
      return jsonError(error?.message || 'Failed to upload template media to Cloudflare R2', 502, 'R2_UPLOAD');
    }
  });
}
