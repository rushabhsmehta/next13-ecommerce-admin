/** Normalize expo-router dynamic segment params (string | string[] | undefined). */
export function firstRouteParam(value?: string | string[]): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value[0];
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
