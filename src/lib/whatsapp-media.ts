import { Buffer } from 'buffer';
import { graphRequest, uploadTemplateMediaHandle } from './whatsapp';

export type WhatsAppMediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export interface UploadWhatsAppMediaParams {
  buffer: ArrayBuffer | ArrayBufferView | Buffer;
  fileName: string;
  mimeType?: string;
  mediaType: WhatsAppMediaType;
  caption?: string;
}

function normalizeBuffer(data: ArrayBuffer | ArrayBufferView | Buffer): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  throw new Error('Unsupported buffer type for WhatsApp media upload');
}

function createBlobFromBuffer(buffer: Buffer, mimeType: string): Blob {
  const blobSource = new Uint8Array(buffer);
  return new Blob([blobSource], { type: mimeType });
}

export async function uploadWhatsAppMediaBuffer(params: UploadWhatsAppMediaParams): Promise<{
  mediaId: string;
  sizeInBytes: number;
}> {
  const { buffer, fileName, mediaType, caption } = params;
  const mimeType = params.mimeType || 'application/octet-stream';

  if (!buffer) {
    throw new Error('Cannot upload empty buffer to WhatsApp');
  }

  if (!fileName) {
    throw new Error('File name is required when uploading media to WhatsApp');
  }

  const normalizedBuffer = normalizeBuffer(buffer);
  if (normalizedBuffer.length === 0) {
    throw new Error('Cannot upload empty media payload to WhatsApp');
  }

  if (!mediaType) {
    throw new Error('Media type is required for WhatsApp uploads');
  }

  const blob = createBlobFromBuffer(normalizedBuffer, mimeType);
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mediaType);

  if (mediaType === 'document') {
    formData.append('filename', fileName);
  }

  if (caption) {
    formData.append('caption', caption);
  }

  formData.append('file', blob, fileName);

  const response = await graphRequest<{ id: string }>('media', {
    method: 'POST',
    body: formData,
  });

  if (!response?.id) {
    throw new Error('Meta did not return a media id for the uploaded file');
  }

  return {
    mediaId: response.id,
    sizeInBytes: normalizedBuffer.length,
  };
}

export type UploadWhatsAppTemplateMediaParams = UploadWhatsAppMediaParams;

export async function uploadWhatsAppTemplateMediaBuffer(
  params: UploadWhatsAppTemplateMediaParams
): Promise<{
  mediaId: string;
  sizeInBytes: number;
}> {
  const { buffer, fileName, mediaType, caption } = params;
  const mimeType = params.mimeType || 'application/octet-stream';

  if (!buffer) {
    throw new Error('Cannot upload empty buffer to WhatsApp templates');
  }

  if (!fileName) {
    throw new Error('File name is required when uploading template media to WhatsApp');
  }

  const normalizedBuffer = normalizeBuffer(buffer);
  if (normalizedBuffer.length === 0) {
    throw new Error('Cannot upload empty template media payload to WhatsApp');
  }

  if (!mediaType) {
    throw new Error('Media type is required for WhatsApp template uploads');
  }

  const { handle } = await uploadTemplateMediaHandle({
    buffer: normalizedBuffer,
    fileName,
    mimeType,
  });

  if (!handle) {
    throw new Error('Meta did not return a template media handle for the uploaded file');
  }

  return {
    mediaId: handle,
    sizeInBytes: normalizedBuffer.length,
  };
}
