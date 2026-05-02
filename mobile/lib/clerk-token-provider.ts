let _getter: (() => Promise<string | null>) | null = null;

export function setClerkTokenProvider(fn: () => Promise<string | null>) {
  _getter = fn;
}

export async function getAdminApiToken(): Promise<string | null> {
  return _getter ? _getter() : null;
}
