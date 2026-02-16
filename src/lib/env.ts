import { z } from 'zod';

/**
 * Server-side environment variable validation.
 * Import this module in your app layout or instrumentation file
 * to fail fast on missing configuration.
 */
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Clerk Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),

  // Cloudinary (optional but validated if present)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),

  // Meta WhatsApp (optional)
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  META_WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Cloudflare R2 (optional)
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _validatedEnv: ServerEnv | null = null;

/**
 * Validates and returns server environment variables.
 * Throws on first call if required variables are missing.
 * Caches result for subsequent calls.
 */
export function getServerEnv(): ServerEnv {
  if (_validatedEnv) return _validatedEnv;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error(
      `\n[ENV VALIDATION] Missing or invalid environment variables:\n${formatted}\n`
    );

    // In production, throw to prevent startup with bad config
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables. Check server logs for details.`
      );
    }
  }

  _validatedEnv = (parsed.success ? parsed.data : serverEnvSchema.parse({
    ...process.env,
    // Provide fallbacks for dev only
    DATABASE_URL: process.env.DATABASE_URL || '',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  })) as ServerEnv;

  return _validatedEnv;
}
