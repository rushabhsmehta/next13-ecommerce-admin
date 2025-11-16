import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { handleApi, jsonError } from '@/lib/api-response';
import { isCurrentUserAssociate } from '@/lib/associate-utils';
import { uploadTemplatePdf } from '@/lib/r2-client';
import { uploadWhatsAppTemplateMediaBuffer } from '@/lib/whatsapp-media';

const configuredMaxPdfMb = Number(
  process.env.MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    100
);
const MAX_PDF_SIZE_MB = Number.isFinite(configuredMaxPdfMb) && configuredMaxPdfMb > 0 ? configuredMaxPdfMb : 100;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isPdfFile(file: File): boolean {
  const type = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  return type === 'application/pdf' || name.endsWith('.pdf');
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = auth();

    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (await isCurrentUserAssociate()) {
      return jsonError('Associates cannot upload WhatsApp template documents', 403, 'FORBIDDEN');
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || !(fileEntry instanceof File)) {
      return jsonError('No PDF file received', 400, 'VALIDATION');
    }

    const file = fileEntry as File;
    const size = typeof file.size === 'number' ? file.size : 0;

    if (size === 0) {
      return jsonError('Empty file uploads are not allowed', 400, 'VALIDATION');
    }

    if (size > MAX_PDF_SIZE_BYTES) {
      return jsonError(`File is too large. Maximum size is ${MAX_PDF_SIZE_MB} MB.`, 413, 'PAYLOAD_TOO_LARGE');
    }

    if (!isPdfFile(file)) {
      return jsonError('Only PDF documents are supported for header examples.', 415, 'UNSUPPORTED_MEDIA');
    }

    const templateNameRaw = formData.get('templateName');
    const templateName = typeof templateNameRaw === 'string' ? templateNameRaw.trim() : null;

    const prefixRaw = formData.get('prefix');
    const prefix = typeof prefixRaw === 'string' && prefixRaw.trim().length ? prefixRaw.trim() : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const upload = await uploadTemplatePdf({
        buffer,
        fileName: file.name,
        templateName,
        contentType: 'application/pdf',
        uploadedBy: userId,
        prefix,
      });

      let metaHandle: string | null = null;
      try {
        const metaUpload = await uploadWhatsAppTemplateMediaBuffer({
          buffer,
          fileName: file.name,
          mimeType: 'application/pdf',
          mediaType: 'document',
        });
        metaHandle = metaUpload.mediaId;
      } catch (metaError: any) {
        console.error('[whatsapp-template-upload] Failed to upload PDF to WhatsApp template media', metaError);
        return jsonError(
          metaError?.message || 'Failed to upload document to WhatsApp template media',
          502,
          'META_UPLOAD'
        );
      }

      if (!metaHandle) {
        return jsonError('WhatsApp did not return a media handle for the uploaded PDF', 502, 'META_HANDLE');
      }

      return NextResponse.json({
        success: true,
        document: {
          url: upload.url,
          key: upload.key,
          bucket: upload.bucket,
          size,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          metaHandle,
        },
      });
    } catch (error: any) {
      console.error('[whatsapp-template-upload] Failed to upload PDF', error);
      return jsonError(error?.message || 'Failed to upload document to Cloudflare R2', 502, 'R2_UPLOAD');
    }
  });
}
