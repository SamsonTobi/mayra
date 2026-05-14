"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChromeSession } from "@/lib/chrome-probe";
import { DEFAULT_CHROME_PROBE_PORTS } from "@/lib/chrome-probe";
import { getTauriBridge } from "@/lib/tauri";

const DEBOUNCE_MS = 300;

type DetectOptions = { silent?: boolean };

export function useChromeProbe(
  ports: readonly number[] = DEFAULT_CHROME_PROBE_PORTS,
): {
  sessions: ChromeSession[];
  error: string | null;
  loading: boolean;
  detect: (options?: DetectOptions) => void;
  attempted: boolean;
  lastDetectedAt: Date | null;
} {
  const [sessions, setSessions] = useState<ChromeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [lastDetectedAt, setLastDetectedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detect = useCallback((options: DetectOptions = {}) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void (async () => {
        if (!options.silent) {
          setLoading(true);
        }
        setError(null);
        try {
          const bridge = getTauriBridge();
          if (!bridge.isTauri) {
            setSessions([]);
            setError("Browser detection runs inside the Mayra desktop app only.");
            setAttempted(true);
            return;
          }
          const { invoke } = await import("@tauri-apps/api/core");
          const list = await invoke<ChromeSession[]>("probe_chrome_ports", {
            ports: [...ports],
          });
          setSessions(list);
          setAttempted(true);
          setLastDetectedAt(new Date());
        } catch (e) {
          setSessions([]);
          setError(e instanceof Error ? e.message : String(e));
          setAttempted(true);
        } finally {
          if (!options.silent) {
            setLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);
  }, [ports]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { sessions, error, loading, detect, attempted, lastDetectedAt };
}
