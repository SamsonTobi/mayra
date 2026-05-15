"use client";

import { useCallback, useState } from "react";
import type { ChromeSession } from "@/lib/chrome-probe";
import { DEFAULT_CHROME_PROBE_PORTS } from "@/lib/chrome-probe";
import { getTauriBridge } from "@/lib/tauri";

type DetectOptions = { silent?: boolean };

export async function probeChromePorts(
  ports: readonly number[] = DEFAULT_CHROME_PROBE_PORTS,
): Promise<ChromeSession[]> {
  const bridge = getTauriBridge();
  if (!bridge.isTauri) {
    throw new Error("Browser detection runs inside the Mayra desktop app only.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<ChromeSession[]>("probe_chrome_ports", {
    ports: [...ports],
  });
}

export function useChromeProbe(
  ports: readonly number[] = DEFAULT_CHROME_PROBE_PORTS,
): {
  sessions: ChromeSession[];
  error: string | null;
  loading: boolean;
  detect: (options?: DetectOptions) => Promise<ChromeSession[]>;
  attempted: boolean;
  lastDetectedAt: Date | null;
} {
  const [sessions, setSessions] = useState<ChromeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [lastDetectedAt, setLastDetectedAt] = useState<Date | null>(null);

  const detect = useCallback(async (options: DetectOptions = {}) => {
    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await probeChromePorts(ports);
      setSessions(list);
      setAttempted(true);
      setLastDetectedAt(new Date());
      return list;
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : String(e));
      setAttempted(true);
      return [];
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [ports]);

  return { sessions, error, loading, detect, attempted, lastDetectedAt };
}
