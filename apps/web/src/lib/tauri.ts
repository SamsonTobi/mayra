"use client";

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

export function getTauriBridge(): TauriBridge {
  if (typeof window === "undefined") {
    return { isTauri: false, ready: false };
  }
  const isTauri = Boolean(
    (window as unknown as { __TAURI__?: unknown }).__TAURI__,
  );
  return { isTauri, ready: true };
}
