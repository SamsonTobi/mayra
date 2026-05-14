"use client";

import { useEffect, useState } from "react";
import type { SidecarHandshake } from "@/lib/tauri";

const READY = "orchestrator-ready";

/**
 * Listens for Tauri `orchestrator-ready` (or synthetic `CustomEvent` in tests).
 */
export function useSidecarReady(): SidecarHandshake | null {
  const [handshake, setHandshake] = useState<SidecarHandshake | null>(null);

  useEffect(() => {
    const onReady = (ev: Event) => {
      const d = (ev as CustomEvent<SidecarHandshake>).detail;
      if (d && typeof d.port === "number" && typeof d.token === "string") {
        setHandshake(d);
      }
    };
    window.addEventListener(READY, onReady as EventListener);
    return () => window.removeEventListener(READY, onReady as EventListener);
  }, []);

  return handshake;
}
