import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Lightweight helper around Cloudflare R2's S3-compatible API for WhatsApp PDFs

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

function normalizeBaseName(value: string | null | undefined): string {
  if (!value) {
    return 'document';
  }

  const withoutExt = value.replace(/\.pdf$/i, '').replace(/\s+/g, '-');
  const safe = withoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safe || 'document';
}

function sanitizeFileName(value: string | null | undefined): string {
  return `${normalizeBaseName(value)}.pdf`;
}

function buildObjectKey(params: { fileName?: string; templateName?: string | null; prefix?: string }): string {
  const prefix = (params.prefix || DEFAULT_PREFIX).replace(/\/+$/, '');
  const templateSegment = toSlug(params.templateName);
  const baseName = normalizeBaseName(params.fileName);
  const stamp = Date.now();
  const randomSuffix = randomUUID().replace(/-/g, '');

  return `${prefix}/${templateSegment}/${baseName}-${stamp}-${randomSuffix}.pdf`;
}

function buildPublicUrl(key: string): string {
  const config = loadConfig();
  const base = config.publicBaseUrl.replace(/\/+$/, '');
  return `${base}/${key}`;
}

export async function uploadTemplatePdf(params: UploadTemplatePdfParams): Promise<UploadTemplatePdfResult> {
  const config = loadConfig();
  const client = getClient();

  const key = params.objectKey || buildObjectKey({
    fileName: params.fileName,
    templateName: params.templateName,
    prefix: params.prefix,
  });

  const contentType = params.contentType?.trim() || 'application/pdf';
  const safeFileName = sanitizeFileName(params.fileName);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      ContentDisposition: `inline; filename="${safeFileName}"`,
      Metadata: {
        source: 'whatsapp-template-builder',
        ...(params.uploadedBy ? { 'uploaded-by': params.uploadedBy } : {}),
        ...(params.templateName ? { 'template-name': toSlug(params.templateName) } : {}),
      },
    })
  );

  return {
    key,
    url: buildPublicUrl(key),
    bucket: config.bucket,
  };
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
