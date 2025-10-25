import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { handleApi, jsonError } from '@/lib/api-response';
import { isCurrentUserAssociate } from '@/lib/associate-utils';
import prismadb from '@/lib/prismadb';
import { v2 as cloudinary } from 'cloudinary';
import type { WhatsAppMediaAsset } from '@prisma/client';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit to avoid large payloads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};
const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_BY_EXTENSION));
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] as const;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_WHATSAPP_FOLDER || 'uploads/whatsapp';
const CLOUDINARY_TAGS = (process.env.CLOUDINARY_WHATSAPP_TAGS || 'whatsapp-media')
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);
const CLOUDINARY_MAX_RESULTS = Number(process.env.CLOUDINARY_WHATSAPP_MAX_RESULTS || 48);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let cloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (cloudinaryConfigured) return true;
  if (!process.env.CLOUDINARY_URL) {
    console.error('[media-upload] CLOUDINARY_URL env var is missing');
    return false;
  }
  cloudinary.config({ secure: true });
  cloudinaryConfigured = true;
  return true;
}

type CloudinaryMedia = {
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
  tags?: string[];
};

type MediaAssetRecord = WhatsAppMediaAsset;

type MediaAssetResponse = {
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

function parseUploadDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function mapMediaAssetRecord(asset: MediaAssetRecord): MediaAssetResponse {
  return {
    id: asset.id,
    publicId: asset.publicId,
    filename: asset.filename,
    secureUrl: asset.secureUrl,
    size: asset.size,
    contentType: asset.contentType,
    uploadedAt: asset.uploadedAt.toISOString(),
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    format: asset.format ?? undefined,
    resourceType: asset.resourceType || undefined,
    folder: asset.folder || undefined,
  };
}

function resolveExtension(file: File) {
  const name = typeof file.name === 'string' ? file.name : '';
  const extFromName = name ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
  if (extFromName && ALLOWED_EXTENSIONS.has(extFromName)) {
    return extFromName;
  }

  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) {
    switch (file.type) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'image/avif':
        return '.avif';
      default:
        return '';
    }
  }

  return '';
}

function mapCloudinaryResource(resource: any): CloudinaryMedia {
  const format = resource?.format || '';
  const resourceType = resource?.resource_type || 'image';
  const contentType = resourceType === 'image' && format
    ? `image/${format}`
    : `${resourceType}/${format || 'binary'}`;
  const baseName = resource?.public_id?.split('/')?.pop() || resource?.public_id;
  const folder = resource?.folder || resource?.asset_folder || null;
  const tags = Array.isArray(resource?.tags)
    ? resource.tags.filter((tag: unknown) => typeof tag === 'string')
    : undefined;

  return {
    id: resource?.asset_id || resource?.public_id,
    publicId: resource?.public_id,
    filename: resource?.original_filename || baseName || 'media',
    secureUrl: resource?.secure_url || resource?.url,
    size: resource?.bytes ?? 0,
    contentType,
    uploadedAt: resource?.created_at || new Date().toISOString(),
    width: resource?.width ?? undefined,
    height: resource?.height ?? undefined,
    format: format || undefined,
    resourceType: resourceType || 'image',
    folder,
    tags,
  };
}

async function uploadToCloudinary(file: File): Promise<CloudinaryMedia> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        allowed_formats: [...ALLOWED_FORMATS],
        tags: CLOUDINARY_TAGS,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve(mapCloudinaryResource(result));
      }
    );

    upload.end(buffer);
  });
}

async function listCloudinaryMedia(): Promise<CloudinaryMedia[]> {
  const expression = CLOUDINARY_FOLDER.includes('/')
    ? `folder="${CLOUDINARY_FOLDER}"`
    : `folder:${CLOUDINARY_FOLDER}`;

  const search = await cloudinary.search
    .expression(expression)
    .sort_by('uploaded_at', 'desc')
    .max_results(CLOUDINARY_MAX_RESULTS)
    .execute();

  return Array.isArray(search?.resources)
    ? search.resources.map(mapCloudinaryResource)
    : [];
}

async function saveMediaAsset(media: CloudinaryMedia, uploadedBy?: string): Promise<MediaAssetRecord> {
  const tagsPayload = media.tags && media.tags.length ? media.tags : undefined;
  const baseData = {
    filename: media.filename,
    secureUrl: media.secureUrl,
    size: typeof media.size === 'number' ? media.size : Number(media.size) || 0,
    contentType: media.contentType,
    format: media.format ?? null,
    width: typeof media.width === 'number' ? media.width : null,
    height: typeof media.height === 'number' ? media.height : null,
    resourceType: media.resourceType ?? 'image',
    folder: media.folder ?? null,
    uploadedAt: parseUploadDate(media.uploadedAt),
    ...(typeof tagsPayload !== 'undefined' ? { tags: tagsPayload } : {}),
  };

  const record = await prismadb.whatsAppMediaAsset.upsert({
    where: { publicId: media.publicId },
    create: {
      publicId: media.publicId,
      uploadedBy: uploadedBy ?? null,
      ...baseData,
    },
    update: {
      ...baseData,
      ...(uploadedBy ? { uploadedBy } : {}),
    },
  });

  return record as MediaAssetRecord;
}

async function tryDestroyCloudinaryAsset(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.warn('[media-upload] Failed to clean up Cloudinary asset after persistence error', error, { publicId });
  }
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (await isCurrentUserAssociate()) {
      return jsonError('Associates cannot upload media', 403, 'FORBIDDEN');
    }

    if (!ensureCloudinaryConfigured()) {
      return jsonError('Cloudinary is not configured. Set CLOUDINARY_URL before uploading media.', 500, 'CLOUDINARY_CONFIG');
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry) {
      return jsonError('No image file received', 400, 'VALIDATION');
    }

    const file = (typeof File !== 'undefined' && fileEntry instanceof File)
      ? fileEntry
      : (fileEntry as unknown as File);

    if (typeof file.arrayBuffer !== 'function') {
      return jsonError('Invalid file payload', 400, 'VALIDATION');
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError('Unsupported file type. Upload PNG, JPEG, WEBP, GIF, or AVIF images.', 415, 'UNSUPPORTED_MEDIA');
    }

    const fileSize = typeof file.size === 'number' ? file.size : 0;
    if (fileSize === 0) {
      return jsonError('Empty file uploads are not allowed', 400, 'VALIDATION');
    }

    if (fileSize > MAX_UPLOAD_SIZE) {
      return jsonError('File is too large. Maximum supported size is 5MB.', 413, 'PAYLOAD_TOO_LARGE');
    }

    const extension = resolveExtension(file);
    if (!extension) {
      return jsonError('Could not determine a valid file extension', 400, 'VALIDATION');
    }

    let uploaded: CloudinaryMedia;
    try {
      uploaded = await uploadToCloudinary(file);
    } catch (error: any) {
      console.error('[media-upload] Cloudinary upload failed', error);
      return jsonError(error?.message || 'Failed to upload image to Cloudinary', 502, 'CLOUDINARY_UPLOAD');
    }

    try {
      const assetRecord = await saveMediaAsset(uploaded, userId);
      return NextResponse.json(
        {
          success: true,
          file: mapMediaAssetRecord(assetRecord),
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('[media-upload] Failed to persist media asset', error);
      if (uploaded?.publicId) {
        await tryDestroyCloudinaryAsset(uploaded.publicId);
      }
      return jsonError(error?.message || 'Failed to persist uploaded media. Please try again.', 500, 'MEDIA_PERSISTENCE');
    }
  });
}

export async function GET() {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (await isCurrentUserAssociate()) {
      return jsonError('Associates cannot view uploaded media', 403, 'FORBIDDEN');
    }

    if (!ensureCloudinaryConfigured()) {
      return jsonError('Cloudinary is not configured. Set CLOUDINARY_URL before fetching media.', 500, 'CLOUDINARY_CONFIG');
    }

    try {
      let mediaAssets = await prismadb.whatsAppMediaAsset.findMany({
        orderBy: { uploadedAt: 'desc' },
        take: CLOUDINARY_MAX_RESULTS,
      });

      if (!mediaAssets.length) {
        const cloudFiles = await listCloudinaryMedia();
        if (cloudFiles.length) {
          const synced: MediaAssetRecord[] = [];

          for (const media of cloudFiles) {
            try {
              const record = await saveMediaAsset(media);
              synced.push(record);
            } catch (syncError) {
              console.error('[media-upload] Failed to synchronize Cloudinary media record', syncError, {
                publicId: media.publicId,
              });
            }
          }

          if (synced.length) {
            mediaAssets = synced;
          }
        }
      }

      const files = mediaAssets
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  .slice(0, CLOUDINARY_MAX_RESULTS)
        .map(mapMediaAssetRecord);

      return NextResponse.json({ success: true, files });
    } catch (error: any) {
      console.error('[media-upload] Failed to list WhatsApp media assets', error);
      return jsonError(error?.message || 'Failed to load the media library', 502, 'MEDIA_LIST');
    }
  });
}
