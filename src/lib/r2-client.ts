import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Lightweight helper around Cloudflare R2's S3-compatible API for WhatsApp media

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  region: string;
};

type UploadTemplatePdfParams = {
  buffer: Buffer;
  fileName?: string;
  templateName?: string | null;
  contentType?: string;
  uploadedBy?: string;
  objectKey?: string;
  prefix?: string;
};

type UploadTemplatePdfResult = {
  key: string;
  url: string;
  bucket: string;
};

type UploadR2ObjectParams = {
  buffer: Buffer;
  fileName?: string;
  contentType?: string;
  prefix?: string;
  segments?: Array<string | null | undefined>;
  objectKey?: string;
  extension?: string;
  metadata?: Record<string, string | undefined>;
  cacheControl?: string;
  contentDisposition?: string;
  fallbackExtension?: string;
};

type UploadR2ObjectResult = {
  key: string;
  url: string;
  bucket: string;
};

const DEFAULT_PREFIX = 'whatsapp/templates';

let cachedConfig: R2Config | null = null;
let cachedClient: S3Client | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name} env var for Cloudflare R2 configuration`);
  }
  return value.trim();
}

function loadConfig(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const accountId = requireEnv('CLOUDFLARE_R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv('CLOUDFLARE_R2_BUCKET');
  const endpoint = requireEnv('CLOUDFLARE_R2_S3_ENDPOINT').replace(/\/?$/, '');
  const publicBaseUrl = requireEnv('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/?$/, '');
  const region = (process.env.CLOUDFLARE_R2_REGION || 'auto').trim();

  cachedConfig = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl,
    region,
  };

  return cachedConfig;
}

function getClient(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const config = loadConfig();

  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

function toSlug(value: string | null | undefined): string {
  if (!value) {
    return 'template';
  }

  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'template';
}

function extractExtension(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const match = value.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

function normalizeBaseName(value: string | null | undefined): string {
  if (!value) {
    return 'file';
  }

  const withoutExt = value
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, '-');

  const safe = withoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safe || 'file';
}

function normalizeExtension(value: string | undefined, fallback = '.bin'): string {
  if (value && value.trim()) {
    return value.startsWith('.') ? value.toLowerCase() : `.${value.toLowerCase()}`;
  }
  return fallback;
}

function sanitizeFileName(value: string | null | undefined, extension?: string): string {
  const fallback = extension || extractExtension(value) || '.bin';
  return `${normalizeBaseName(value)}${normalizeExtension(fallback)}`;
}

function buildObjectKey(params: { fileName?: string; templateName?: string | null; prefix?: string; segments?: Array<string | null | undefined>; extension?: string }): string {
  const prefix = (params.prefix || DEFAULT_PREFIX).replace(/\/+$/, '');
  const segmentInput = params.segments && params.segments.length
    ? params.segments
    : [params.templateName ? toSlug(params.templateName) : null];
  const segments = segmentInput
    .map((segment) => (segment
      ? segment.toLowerCase().replace(/\/+/g, '-').replace(/[^a-z0-9-]/gi, '-')
      : null))
    .filter((segment): segment is string => Boolean(segment));
  const baseName = normalizeBaseName(params.fileName);
  const stamp = Date.now();
  const randomSuffix = randomUUID().replace(/-/g, '');
  const extension = normalizeExtension(params.extension || extractExtension(params.fileName) || '.bin');
  const folder = segments.length ? `${prefix}/${segments.join('/')}` : prefix;

  return `${folder}/${baseName}-${stamp}-${randomSuffix}${extension}`;
}

function buildPublicUrl(key: string): string {
  const config = loadConfig();
  const base = config.publicBaseUrl.replace(/\/+$/, '');
  return `${base}/${key}`;
}

function cleanMetadata(metadata?: Record<string, string | undefined>): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }

  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.length) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length ? cleaned : undefined;
}

export async function uploadR2Object(params: UploadR2ObjectParams): Promise<UploadR2ObjectResult> {
  const config = loadConfig();
  const client = getClient();
  const contentType = params.contentType?.trim() || 'application/octet-stream';
  const inferredExtension = params.extension || extractExtension(params.fileName) || inferExtensionFromMime(contentType);

  const key = params.objectKey || buildObjectKey({
    fileName: params.fileName,
    templateName: null,
    prefix: params.prefix,
    segments: params.segments,
    extension: inferredExtension,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: contentType,
      CacheControl: params.cacheControl || 'public, max-age=31536000, immutable',
      ...(params.contentDisposition ? { ContentDisposition: params.contentDisposition } : {}),
      Metadata: cleanMetadata(params.metadata),
    })
  );

  return {
    key,
    url: buildPublicUrl(key),
    bucket: config.bucket,
  };
}

function inferExtensionFromMime(mime: string): string {
  const value = mime.toLowerCase();
  if (value.includes('pdf')) return '.pdf';
  if (value.includes('jpeg') || value.includes('jpg')) return '.jpg';
  if (value.includes('png')) return '.png';
  if (value.includes('webp')) return '.webp';
  if (value.includes('gif')) return '.gif';
  if (value.includes('svg')) return '.svg';
  if (value.includes('json')) return '.json';
  return '.bin';
}

export async function uploadTemplatePdf(params: UploadTemplatePdfParams): Promise<UploadTemplatePdfResult> {
  const safeFileName = sanitizeFileName(params.fileName, '.pdf');

  return uploadR2Object({
    buffer: params.buffer,
    fileName: safeFileName,
    contentType: params.contentType?.trim() || 'application/pdf',
    prefix: params.prefix || DEFAULT_PREFIX,
    segments: [params.templateName ? toSlug(params.templateName) : undefined],
    objectKey: params.objectKey,
    extension: '.pdf',
    metadata: {
      source: 'whatsapp-template-builder',
      ...(params.uploadedBy ? { 'uploaded-by': params.uploadedBy } : {}),
      ...(params.templateName ? { 'template-name': toSlug(params.templateName) } : {}),
    },
    contentDisposition: `inline; filename="${safeFileName}"`,
  });
}

export async function deleteR2Object(key: string): Promise<void> {
  const config = loadConfig();
  const client = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

export function getR2PublicUrl(key: string): string {
  return buildPublicUrl(key);
}
