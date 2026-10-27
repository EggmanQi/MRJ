import type { AnalyticsEvent } from "@/lib/types";

const BUFFER_KEY = "shanhe-analytics-v1";

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const payload = {
    ...event,
    at: new Date().toISOString(),
  };
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    const list: unknown[] = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push(payload);
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(list.slice(-500)));
  } catch {
    // Demo: analytics must never break the draw flow.
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", payload);
  }
}
