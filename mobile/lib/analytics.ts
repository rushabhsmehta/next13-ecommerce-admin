type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function captureWithSentry(eventName: string, props?: AnalyticsProps): void {
  const sentry = (globalThis as { Sentry?: any }).Sentry;
  if (!sentry?.addBreadcrumb) return;
  sentry.addBreadcrumb({
    category: "mobile.analytics",
    message: eventName,
    data: props,
    level: "info",
  });
}

export function trackEvent(eventName: string, props?: AnalyticsProps): void {
  captureWithSentry(eventName, props);
  if (__DEV__) {
    console.log("📊 [Analytics]", eventName, props ?? {});
  }
}

export function captureException(error: unknown, props?: AnalyticsProps): void {
  const sentry = (globalThis as { Sentry?: any }).Sentry;
  if (sentry?.captureException) {
    sentry.captureException(error, { extra: props });
    return;
  }
  if (__DEV__) {
    console.error("❌ [Mobile]", error, props ?? {});
  }
}

