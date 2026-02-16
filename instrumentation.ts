/**
 * Next.js Instrumentation
 * This file runs once when the server starts up.
 * Used for environment validation and other initialization tasks.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Validate environment variables at startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getServerEnv } = await import('./src/lib/env');
    try {
      getServerEnv();
      console.log('✅ Environment variables validated successfully');
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      // Error is already logged in getServerEnv()
    }
  }
}
