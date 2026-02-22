import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 16 * 1024 * 1024; // 16MB - WhatsApp documented limit for images
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25MB - conservative cap for documents

function resolveMediaType(mimeType: string | undefined, override?: string | null) {
  if (override && typeof override === 'string') {
    const normalized = override.toLowerCase();
    if (['image', 'video', 'audio', 'document', 'sticker'].includes(normalized)) {
      return normalized as 'image' | 'video' | 'audio' | 'document' | 'sticker';
    }
  }

  if (!mimeType) {
    return null;
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  const documentMimes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ]);

  if (documentMimes.has(mimeType)) {
    return 'document';
  }

  return 'document';
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'WhatsApp API credentials are not configured' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data request' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Upload requires a file field' },
        { status: 400 }
      );
    }

    const explicitType = formData.get('type');
    const caption = formData.get('caption');
    const providedFileName = formData.get('fileName');
    const mimeTypeOverride = formData.get('mimeType');

    const mimeType = (typeof mimeTypeOverride === 'string' && mimeTypeOverride) || file.type || 'application/octet-stream';
    const mediaType = resolveMediaType(mimeType, typeof explicitType === 'string' ? explicitType : null);

    if (!mediaType) {
      return NextResponse.json(
        { error: `Unsupported media type: ${mimeType || 'unknown'}` },
        { status: 400 }
      );
    }

    if (mediaType !== 'image' && mediaType !== 'document') {
      return NextResponse.json(
        { error: 'Only image and document uploads are supported from the chat composer right now' },
        { status: 400 }
      );
    }

    const byteSize = file.size;
    if (mediaType === 'image' && byteSize > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Images must be 16MB or smaller' },
        { status: 400 }
      );
    }
    if (mediaType === 'document' && byteSize > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: 'Documents must be 25MB or smaller' },
        { status: 400 }
      );
    }

    const safeName = typeof providedFileName === 'string' && providedFileName.trim().length > 0
      ? providedFileName.trim()
      : file.name || `attachment-${Date.now()}`;

    const uploadForm = new FormData();
    uploadForm.append('messaging_product', 'whatsapp');
    uploadForm.append('type', mediaType);
    if (caption && typeof caption === 'string' && caption.trim().length > 0) {
      uploadForm.append('caption', caption.trim());
    }
    if (mediaType === 'document') {
      uploadForm.append('filename', safeName);
    }
    uploadForm.append('file', file, safeName);

    const apiUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}/media`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
      },
      body: uploadForm,
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp media upload failed', {
        status: response.status,
        payload,
      });

      return NextResponse.json(
        {
          error: payload?.error?.message || 'Failed to upload media to WhatsApp',
          details: payload,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId: payload.id,
      type: mediaType,
      mimeType,
      fileName: safeName,
      size: byteSize,
    });
  } catch (error: any) {
    console.error('❌ Media upload route error', error);
    return NextResponse.json(
      { error: error?.message || 'Unexpected error uploading media' },
      { status: 500 }
    );
  }
}
