import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { handleApi, jsonError } from '@/lib/api-response';
import { isCurrentUserAssociate } from '@/lib/associate-utils';
import whatsappPrisma from '@/lib/whatsapp-prismadb';
import { uploadR2Object, deleteR2Object } from '@/lib/r2-client';

const configuredMaxFileSizeMb = Number(
  process.env.MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB ||
    100
);
const MAX_UPLOAD_SIZE_MB = Number.isFinite(configuredMaxFileSizeMb) && configuredMaxFileSizeMb > 0
  ? configuredMaxFileSizeMb
  : 100;
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MEDIA_LIBRARY_PREFIX = process.env.CLOUDFLARE_R2_MEDIA_LIBRARY_PREFIX || 'whatsapp/media-library';
const MEDIA_LIBRARY_LIMIT = Number(process.env.MEDIA_LIBRARY_MAX_RESULTS || 48);
const configuredMaxFiles = Number(process.env.MEDIA_LIBRARY_MAX_FILES || process.env.NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILES || 5);
const MAX_FILES_PER_UPLOAD = Number.isFinite(configuredMaxFiles) && configuredMaxFiles > 0 ? configuredMaxFiles : 5;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'application/pdf',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_BY_EXTENSION));

const MEDIA_SEGMENTS = {
  image: 'images',
  document: 'documents',
  binary: 'files',
} as const;

type ResourceType = keyof typeof MEDIA_SEGMENTS;

type MediaAssetRecord = {
  id: string;
  publicId: string;
  filename: string;
  secureUrl: string;
  size: number;
  contentType: string;
  format: string | null;
  width: number | null;
  height: number | null;
  resourceType: string;
  folder: string | null;
  tags: unknown | null;
  uploadedAt: Date;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MediaAssetDelegate = {
  upsert: (args: any) => Promise<MediaAssetRecord>;
  findMany: (args: any) => Promise<MediaAssetRecord[]>;
  findUnique: (args: any) => Promise<MediaAssetRecord | null>;
  delete: (args: any) => Promise<MediaAssetRecord>;
};

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

type MediaPersistencePayload = {
  publicId: string;
  filename: string;
  secureUrl: string;
  size: number;
  contentType: string;
  format: string | null;
  width: number | null;
  height: number | null;
  resourceType: string;
  folder: string | null;
  uploadedAt: Date;
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getMediaAssetClient(): MediaAssetDelegate {
  const delegate = whatsappPrisma.whatsAppMediaAsset as unknown as MediaAssetDelegate;
  if (!delegate) {
    throw new Error('Prisma client is missing the whatsAppMediaAsset delegate. Run `npx prisma generate --schema=prisma/whatsapp-schema.prisma` and redeploy.');
  }
  return delegate;
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

function resolveExtension(file: File): string {
  const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  if (name.includes('.')) {
    const ext = name.substring(name.lastIndexOf('.'));
    if (ALLOWED_EXTENSIONS.has(ext)) {
      return ext;
    }
  }

  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  for (const [extension, mimeType] of Object.entries(MIME_BY_EXTENSION)) {
    if (mime && mime === mimeType) {
      return extension;
    }
  }

  return '';
}

function resolveMimeType(file: File, extension: string): string {
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  if (mime && ALLOWED_MIME_TYPES.has(mime)) {
    return mime;
  }

  const mapped = MIME_BY_EXTENSION[extension];
  return mapped || mime || 'application/octet-stream';
}

function inferResourceType(mimeType: string): ResourceType {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'document';
  }
  return 'binary';
}

function formatFromExtension(extension: string): string | null {
  if (!extension) {
    return null;
  }
  return extension.startsWith('.') ? extension.slice(1) : extension;
}

function folderFromKey(key: string): string | null {
  const index = key.lastIndexOf('/');
  return index > 0 ? key.slice(0, index) : null;
}

async function saveMediaAsset(payload: MediaPersistencePayload, uploadedBy?: string): Promise<MediaAssetRecord> {
  const client = getMediaAssetClient();
  return client.upsert({
    where: { publicId: payload.publicId },
    create: {
      publicId: payload.publicId,
      filename: payload.filename,
      secureUrl: payload.secureUrl,
      size: payload.size,
      contentType: payload.contentType,
      format: payload.format,
      width: payload.width,
      height: payload.height,
      resourceType: payload.resourceType,
      folder: payload.folder,
      uploadedAt: payload.uploadedAt,
      uploadedBy: uploadedBy ?? null,
    },
    update: {
      filename: payload.filename,
      secureUrl: payload.secureUrl,
      size: payload.size,
      contentType: payload.contentType,
      format: payload.format,
      width: payload.width,
      height: payload.height,
      resourceType: payload.resourceType,
      folder: payload.folder,
      uploadedAt: payload.uploadedAt,
      ...(uploadedBy ? { uploadedBy } : {}),
    },
  });
}

type PreparedUpload = {
  file: File;
  extension: string;
  mimeType: string;
  resourceType: ResourceType;
  size: number;
};

function validateUploadFile(file: File): { ok: true; data: PreparedUpload } | { ok: false; response: NextResponse } {
  if (!(file instanceof File)) {
    return { ok: false, response: jsonError('Invalid file payload', 400, 'VALIDATION') };
  }

  if (typeof file.arrayBuffer !== 'function') {
    return { ok: false, response: jsonError('Invalid file payload', 400, 'VALIDATION') };
  }

  const size = typeof file.size === 'number' ? file.size : 0;
  if (size === 0) {
    return { ok: false, response: jsonError(`Empty uploads are not allowed (${file.name || 'file'})`, 400, 'VALIDATION') };
  }

  if (size > MAX_UPLOAD_SIZE) {
    return {
      ok: false,
      response: jsonError(
        `${file.name || 'File'} is too large. Maximum supported size is ${MAX_UPLOAD_SIZE_MB}MB.`,
        413,
        'PAYLOAD_TOO_LARGE'
      ),
    };
  }

  const extension = resolveExtension(file);
  if (!extension) {
    return {
      ok: false,
      response: jsonError('Unsupported file type. Upload PNG, JPEG, WEBP, GIF, AVIF, or PDF files.', 415, 'UNSUPPORTED_MEDIA'),
    };
  }

  const mimeType = resolveMimeType(file, extension);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      response: jsonError('Unsupported file type. Upload PNG, JPEG, WEBP, GIF, AVIF, or PDF files.', 415, 'UNSUPPORTED_MEDIA'),
    };
  }

  return {
    ok: true,
    data: {
      file,
      extension,
      mimeType,
      resourceType: inferResourceType(mimeType),
      size,
    },
  };
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

    const formData = await request.formData();
    const fileEntries = formData.getAll('file').filter((entry): entry is File => entry instanceof File);

    if (!fileEntries.length) {
      const fallbackFile = formData.get('file[]');
      if (fallbackFile instanceof File) {
        fileEntries.push(fallbackFile);
      }
    }

    if (!fileEntries.length) {
      return jsonError('No file received', 400, 'VALIDATION');
    }

    if (fileEntries.length > MAX_FILES_PER_UPLOAD) {
      return jsonError(`Select up to ${MAX_FILES_PER_UPLOAD} files per upload.`, 400, 'MAX_FILES_EXCEEDED');
    }

    const preparedUploads: Array<PreparedUpload & { buffer: Buffer }> = [];

    for (const file of fileEntries) {
      const validation = validateUploadFile(file);
      if (!validation.ok) {
        return validation.response;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      preparedUploads.push({ ...validation.data, buffer });
    }

    const uploadedFiles: MediaAssetResponse[] = [];

    for (const uploadItem of preparedUploads) {
      const segment = MEDIA_SEGMENTS[uploadItem.resourceType];
      let uploadResult;

      try {
        uploadResult = await uploadR2Object({
          buffer: uploadItem.buffer,
          fileName: uploadItem.file.name,
          contentType: uploadItem.mimeType,
          prefix: MEDIA_LIBRARY_PREFIX,
          segments: [segment],
          metadata: {
            source: 'whatsapp-media-library',
            'resource-type': uploadItem.resourceType,
            ...(uploadItem.extension ? { extension: uploadItem.extension.replace('.', '') } : {}),
          },
        });
      } catch (error: any) {
        console.error('[media-upload] Cloudflare R2 upload failed', error, { file: uploadItem.file.name });
        return jsonError(error?.message || `Failed to upload ${uploadItem.file.name} to Cloudflare R2`, 502, 'R2_UPLOAD');
      }

      try {
        const assetRecord = await saveMediaAsset({
          publicId: uploadResult.key,
          filename: uploadItem.file.name || 'media',
          secureUrl: uploadResult.url,
          size: uploadItem.size,
          contentType: uploadItem.mimeType,
          format: formatFromExtension(uploadItem.extension),
          width: null,
          height: null,
          resourceType: uploadItem.resourceType,
          folder: folderFromKey(uploadResult.key),
          uploadedAt: new Date(),
        }, userId);

        uploadedFiles.push(mapMediaAssetRecord(assetRecord));
      } catch (error: any) {
        console.error('[media-upload] Failed to persist media asset', error, { key: uploadResult?.key });
        return jsonError(error?.message || `Failed to persist ${uploadItem.file.name}. Please try again.`, 500, 'MEDIA_PERSISTENCE');
      }
    }

    return NextResponse.json(
      {
        success: true,
        files: uploadedFiles,
      },
      { status: 201 }
    );
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

    try {
      const client = getMediaAssetClient();
      const mediaAssets = await client.findMany({
        orderBy: { uploadedAt: 'desc' },
        take: MEDIA_LIBRARY_LIMIT,
      });

      const files = mediaAssets.map(mapMediaAssetRecord);
      return NextResponse.json({ success: true, files });
    } catch (error: any) {
      console.error('[media-upload] Failed to list media assets', error);
      return jsonError(error?.message || 'Failed to load the media library', 502, 'MEDIA_LIST');
    }
  });
}

export async function DELETE(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (await isCurrentUserAssociate()) {
      return jsonError('Associates cannot delete media', 403, 'FORBIDDEN');
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch (error) {
      console.error('[media-upload] Invalid delete payload', error);
      return jsonError('Invalid JSON payload', 400, 'VALIDATION');
    }

    const normalizeArray = (input: unknown): string[] => {
      if (!Array.isArray(input)) {
        return [];
      }
      return input
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value.length));
    };

    const idSet = new Set<string>();
    const publicIdSet = new Set<string>();

    const singleId = typeof payload?.id === 'string' ? payload.id.trim() : '';
    if (singleId) {
      idSet.add(singleId);
    }

    const singlePublicId = typeof payload?.publicId === 'string' ? payload.publicId.trim() : '';
    if (singlePublicId) {
      publicIdSet.add(singlePublicId);
    }

    for (const value of normalizeArray(payload?.ids)) {
      idSet.add(value);
    }

    for (const value of normalizeArray(payload?.publicIds)) {
      publicIdSet.add(value);
    }

    if (!idSet.size && !publicIdSet.size) {
      return jsonError('Provide an id or publicId to delete.', 400, 'VALIDATION');
    }

    const requestedIds = Array.from(idSet);
    const requestedPublicIds = Array.from(publicIdSet);

    const client = getMediaAssetClient();
    const assetsMap = new Map<string, MediaAssetRecord>();

    if (requestedIds.length) {
      const assetsById = await client.findMany({ where: { id: { in: requestedIds } } });
      for (const asset of assetsById) {
        assetsMap.set(asset.id, asset);
      }
    }

    const resolvedPublicIds = new Set<string>();
    for (const asset of Array.from(assetsMap.values())) {
      if (asset.publicId) {
        resolvedPublicIds.add(asset.publicId);
      }
    }

    const publicIdsToFetch = requestedPublicIds.filter((pid) => pid && !resolvedPublicIds.has(pid));
    if (publicIdsToFetch.length) {
      const assetsByPublicId = await client.findMany({ where: { publicId: { in: publicIdsToFetch } } });
      for (const asset of assetsByPublicId) {
        assetsMap.set(asset.id, asset);
      }
    }

    const assets = Array.from(assetsMap.values());

    if (!assets.length) {
      return jsonError('Media asset not found', 404, 'NOT_FOUND');
    }

    const deletedIds: string[] = [];

    try {
      for (const asset of assets) {
        if (asset.publicId) {
          try {
            await deleteR2Object(asset.publicId);
          } catch (deleteError: any) {
            if (!`${deleteError?.name || ''}`.includes('NoSuchKey')) {
              console.warn('[media-upload] Failed to delete object from R2', deleteError, { publicId: asset.publicId });
              throw deleteError;
            }
          }
        }

        await client.delete({ where: { id: asset.id } });
        deletedIds.push(asset.id);
      }

      const missingIds = requestedIds.filter((id) => !deletedIds.includes(id));
      const missingPublicIds = requestedPublicIds.filter((pid) => !assets.some((asset) => asset.publicId === pid));

      return NextResponse.json({
        success: true,
        deletedIds,
        deletedId: deletedIds.length === 1 ? deletedIds[0] : undefined,
        missingIds,
        missingPublicIds,
      });
    } catch (error: any) {
      console.error('[media-upload] Failed to delete media asset(s)', error, { ids: deletedIds });
      return jsonError(error?.message || 'Failed to delete one or more media assets.', 500, 'MEDIA_DELETE');
    }
  });
}
