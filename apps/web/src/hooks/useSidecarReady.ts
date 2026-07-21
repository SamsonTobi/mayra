"use client";

import { useEffect, useState } from "react";
import type { SidecarHandshake } from "@/lib/tauri";
import { getTauriBridge } from "@/lib/tauri";
import { isWebMode } from "@/lib/mode";

const READY = "orchestrator-ready";

/**
 * Listens for Tauri `orchestrator-ready` (via `@tauri-apps/api/event`) or synthetic `CustomEvent`
 * in browser tests / non-Tauri dev.
 *
 * In web mode, always returns null — there is no local sidecar.
 */
export function useSidecarReady(): SidecarHandshake | null {
  const [handshake, setHandshake] = useState<SidecarHandshake | null>(null);

  useEffect(() => {
    // In web mode, there is no sidecar — short-circuit
    if (isWebMode()) return;

    let cancelled = false;
    let detach: (() => void) | undefined;

    void (async () => {
      const bridge = getTauriBridge();
      if (!bridge.ready) return;

      if (bridge.isTauri) {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<SidecarHandshake>(READY, (ev) => {
          const d = ev.payload;
          if (d && typeof d.port === "number" && typeof d.token === "string") {
            setHandshake(d);
          }
        });
        if (!cancelled) detach = () => void unlisten();
      } else {
        const onReady = (ev: Event) => {
          const d = (ev as CustomEvent<SidecarHandshake>).detail;
          if (d && typeof d.port === "number" && typeof d.token === "string") {
            setHandshake(d);
          }
        };
        window.addEventListener(READY, onReady as EventListener);
        if (!cancelled) {
          detach = () => window.removeEventListener(READY, onReady as EventListener);
        }
      }
    })();

    return () => {
      cancelled = true;
      detach?.();
    };
  }, []);

  return handshake;
}
