import { NextResponse } from 'next/server';

// Standard JSON error helper
export function jsonError(message: string, status = 400, code?: string, details?: any) {
  return NextResponse.json({ error: message, code, details }, { status });
}

// Apply a no-store cache policy (for auth protected / frequently changing data)
export function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

// Wrapper to unify try/catch error handling
export async function handleApi(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (e: any) {
    console.error('[API_ERROR] Error name:', e?.name);
    console.error('[API_ERROR] Error message:', e?.message);
    
    if (e?.code === 'FORBIDDEN') return jsonError('Forbidden', 403, 'FORBIDDEN');
    if (e?.code === 'NOT_FOUND') return jsonError('Not found', 404, 'NOT_FOUND');
    if (e?.name === 'ZodError') {
      console.error('[API_ERROR] Validation issues:', e.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', '));
      const issue = e.issues?.[0];
      return jsonError(issue?.message || 'Validation error', 422, 'VALIDATION', e.issues);
    }
    console.error('[API_ERROR] Unhandled error, returning 500');
    return jsonError('Internal error', 500, 'SERVER');
  }
}
