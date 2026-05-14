/** Mirrors `mayra_desktop_lib::chrome_probe` JSON (camelCase). */

export type ChromeTab = {
  title: string;
  url: string;
  wsUrl: string;
  targetId: string;
};

export type ChromeSession = {
  port: number;
  browser: string;
  userAgent: string;
  tabs: ChromeTab[];
};

/** DevTools default range (MAYRA_BUILD_CHECKLIST Phase 2). */
export const DEFAULT_CHROME_PROBE_PORTS: readonly number[] = Object.freeze(
  Array.from({ length: 9 }, (_, i) => 9222 + i),
);
