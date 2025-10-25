import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { handleApi, jsonError } from '@/lib/api-response';
import { isCurrentUserAssociate } from '@/lib/associate-utils';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

const UPLOAD_PUBLIC_PATH = '/uploads/whatsapp';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
const DEFAULT_CANONICAL_ORIGIN = 'https://admin.aagamholidays.com';
const CANONICAL_ORIGIN = process.env.MEDIA_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || DEFAULT_CANONICAL_ORIGIN;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveExtension(file: File) {
  const name = typeof file.name === 'string' ? file.name : '';
  const extFromName = path.extname(name).toLowerCase();
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

function buildPublicUrl(filename: string) {
  return `${UPLOAD_PUBLIC_PATH}/${filename}`.replace(/\\/g, '/');
}

function buildAbsoluteUrl(filename: string) {
  const relative = buildPublicUrl(filename);
  if (!CANONICAL_ORIGIN) {
    return relative;
  }
  const normalizedBase = CANONICAL_ORIGIN.endsWith('/')
    ? CANONICAL_ORIGIN.slice(0, -1)
    : CANONICAL_ORIGIN;
  return `${normalizedBase}${relative}`;
}

async function listUploadDirectory() {
  try {
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const extension = path.extname(entry.name).toLowerCase();
          if (!ALLOWED_EXTENSIONS.has(extension)) {
            return null;
          }

          const filePath = path.join(UPLOAD_DIR, entry.name);
          const stat = await fs.stat(filePath);

          return {
            filename: entry.name,
            url: buildPublicUrl(entry.name),
            absoluteUrl: buildAbsoluteUrl(entry.name),
            size: stat.size,
            contentType: MIME_BY_EXTENSION[extension] ?? 'image/*',
            uploadedAt: stat.mtime.toISOString(),
          };
        })
    );

    return files.filter((file): file is NonNullable<typeof file> => Boolean(file));
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
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

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const targetPath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(targetPath, bytes);
    console.info('[media-upload] Saved image', { filename, size: bytes.byteLength });

    const fileUrl = buildPublicUrl(filename);
    const absoluteUrl = buildAbsoluteUrl(filename);

    return NextResponse.json(
      {
        success: true,
        file: {
          filename,
          url: fileUrl,
          absoluteUrl,
          size: bytes.byteLength,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
        },
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

    const files = await listUploadDirectory();
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ success: true, files });
  });
}
