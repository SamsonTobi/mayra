"use client";

import { isTauri } from "@tauri-apps/api/core";

/**
 * Sidecar handshake payload (MAYRA_TECHNICAL_SPEC §3.4, MAYRA_DESKTOP_UX_FLOWS §4.1).
 * Populated by Tauri `orchestrator-ready` or synthetic dev events.
 */
export type SidecarHandshake = { port: number; token: string };

export type TauriBridge = {
  isTauri: boolean;
  /** True after mount — safe to touch window / listeners. */
  ready: boolean;
};

/**
 * Tauri v2 injects `globalThis.isTauri` in the WebView; `window.__TAURI__` exists only when
 * `app.withGlobalTauri` is enabled — do not rely on `__TAURI__` alone.
 */
export function getTauriBridge(): TauriBridge {
  if (typeof window === "undefined") {
    return { isTauri: false, ready: false };
  }
  const legacyGlobal = Boolean(
    (window as unknown as { __TAURI__?: unknown }).__TAURI__,
  );
  return { isTauri: isTauri() || legacyGlobal, ready: true };
}
