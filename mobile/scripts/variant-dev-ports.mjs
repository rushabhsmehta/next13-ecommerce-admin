/** Keep in sync with mobile/lib/variant-dev.ts */
export const DEV_METRO_PORTS = {
  public: 8081,
  staff: 8082,
  finance: 8083,
};

export function metroPortForVariant(variant) {
  return DEV_METRO_PORTS[variant] ?? 8081;
}
