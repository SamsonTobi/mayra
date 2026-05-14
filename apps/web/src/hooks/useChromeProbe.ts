"use client";

import { useCallback, useRef, useState } from "react";
import type { ChromeSession } from "@/lib/chrome-probe";
import { DEFAULT_CHROME_PROBE_PORTS } from "@/lib/chrome-probe";
import { getTauriBridge } from "@/lib/tauri";

const DEBOUNCE_MS = 300;

export function useChromeProbe(
  ports: readonly number[] = DEFAULT_CHROME_PROBE_PORTS,
): {
  sessions: ChromeSession[];
  error: string | null;
  loading: boolean;
  detect: () => void;
  attempted: boolean;
} {
  const [sessions, setSessions] = useState<ChromeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detect = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
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
        } catch (e) {
          setSessions([]);
          setError(e instanceof Error ? e.message : String(e));
          setAttempted(true);
        } finally {
          setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);
  }, [ports]);

  return { sessions, error, loading, detect, attempted };
}
